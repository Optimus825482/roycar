// ─── Layered Long-Term Vector Memory Service ───
// 3 layers: episodic (conversations), semantic (facts), strategic (insights)
// Model-independent, non-blocking, transparent to user

import { prisma } from "@/lib/prisma";
import { generateEmbedding } from "@/lib/embedding";
import { aiChatCompletion, type ChatMessage } from "@/lib/ai-client";

// ─── Types ───

export type MemoryLayer = "episodic" | "semantic" | "strategic";

export interface MemoryEntry {
  id: string;
  layer: MemoryLayer;
  content: string;
  summary: string;
  entityType?: string;
  entityId?: string;
  sourceType: string;
  importance: number;
  createdAt: Date;
  score?: number;
}

interface StoreOptions {
  layer: MemoryLayer;
  content: string;
  summary: string;
  entityType?: string;
  entityId?: string;
  sourceType?: string;
  importance?: number;
  metadata?: Record<string, unknown>;
}

interface RecallOptions {
  query: string;
  layers?: MemoryLayer[];
  entityType?: string;
  entityId?: string;
  limit?: number;
  minImportance?: number;
}

// ─── Store Memory (async, non-blocking) ───

export async function storeMemory(options: StoreOptions): Promise<void> {
  try {
    const embedding = generateEmbedding(
      options.summary + " " + options.content,
    );
    const vectorStr = `[${embedding.join(",")}]`;

    await prisma.$queryRawUnsafe(
      `INSERT INTO ai_memories (layer, content, summary, embedding, entity_type, entity_id, source_type, importance, metadata)
       VALUES ($1, $2, $3, $4::vector, $5, $6, $7, $8, $9::jsonb)`,
      options.layer,
      options.content,
      options.summary,
      vectorStr,
      options.entityType || null,
      options.entityId || null,
      options.sourceType || "chat",
      options.importance ?? 0.5,
      JSON.stringify(options.metadata || {}),
    );
  } catch (err) {
    console.error("Memory store error (non-critical):", err);
  }
}

// ─── Recall Memories (fast hybrid search) ───

export async function recallMemories(
  options: RecallOptions,
): Promise<MemoryEntry[]> {
  try {
    const embedding = generateEmbedding(options.query);
    const vectorStr = `[${embedding.join(",")}]`;
    const limit = options.limit || 5;
    const minImportance = options.minImportance ?? 0.0;

    // Build WHERE clauses
    const conditions: string[] = ["importance >= $3"];
    const params: unknown[] = [vectorStr, limit, minImportance];
    let paramIdx = 4;

    if (options.layers && options.layers.length > 0) {
      conditions.push(`layer = ANY($${paramIdx}::text[])`);
      params.push(options.layers);
      paramIdx++;
    }

    if (options.entityType) {
      conditions.push(`entity_type = $${paramIdx}`);
      params.push(options.entityType);
      paramIdx++;
    }

    if (options.entityId) {
      conditions.push(`entity_id = $${paramIdx}`);
      params.push(options.entityId);
      paramIdx++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Hybrid scoring: vector similarity (0.6) + recency (0.2) + importance (0.2)
    const sql = `
      SELECT 
        id::text, layer, content, summary, entity_type, entity_id, 
        source_type, importance, created_at,
        (
          0.6 * (1 - (embedding <=> $1::vector)) +
          0.2 * (1.0 / (1.0 + EXTRACT(EPOCH FROM (now() - created_at)) / 86400.0)) +
          0.2 * importance
        ) AS score
      FROM ai_memories
      ${whereClause}
      AND embedding IS NOT NULL
      ORDER BY score DESC
      LIMIT $2
    `;

    const rows = (await prisma.$queryRawUnsafe(sql, ...params)) as Array<{
      id: string;
      layer: string;
      content: string;
      summary: string;
      entity_type: string | null;
      entity_id: string | null;
      source_type: string;
      importance: number;
      created_at: Date;
      score: number;
    }>;

    // Update access counts (fire-and-forget)
    if (rows.length > 0) {
      const ids = rows.map((r) => BigInt(r.id));
      prisma
        .$queryRawUnsafe(
          `UPDATE ai_memories SET access_count = access_count + 1, last_accessed_at = now() WHERE id = ANY($1::bigint[])`,
          ids,
        )
        .catch(() => {});
    }

    return rows.map((r) => ({
      id: r.id,
      layer: r.layer as MemoryLayer,
      content: r.content,
      summary: r.summary,
      entityType: r.entity_type || undefined,
      entityId: r.entity_id || undefined,
      sourceType: r.source_type,
      importance: r.importance,
      createdAt: r.created_at,
      score: r.score,
    }));
  } catch (err) {
    console.error("Memory recall error (non-critical):", err);
    return [];
  }
}

// ─── Get candidate-specific memories ───

export async function getCandidateMemories(
  candidateIdentifier: string,
  limit: number = 5,
): Promise<MemoryEntry[]> {
  return recallMemories({
    query: candidateIdentifier,
    entityType: "candidate",
    limit,
  });
}

// ─── Extract memories from conversation (background, after response) ───

export async function extractAndStoreMemories(
  messages: ChatMessage[],
  sessionContext?: { sessionId: string; adminUserId?: string },
): Promise<void> {
  try {
    // Only process if there are enough messages
    if (messages.length < 2) return;

    // Get last few messages for extraction
    const recentMessages = messages.slice(-6);
    const conversationText = recentMessages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    const extractionPrompt = `Aşağıdaki İK sohbetinden önemli bilgileri çıkar. JSON formatında yanıt ver.
Çıkarılacak bilgi türleri:
- Adaylar hakkında bilgiler (isim, pozisyon, değerlendirme)
- İK kararları ve tercihleri
- Önemli iş süreçleri ve kurallar
- Tekrarlanan kalıplar ve tercihler

SADECE gerçekten önemli ve hatırlanması gereken bilgileri çıkar. Sıradan sohbet içeriğini ATLA.
Eğer önemli bir bilgi yoksa boş dizi döndür.

JSON formatı:
{
  "memories": [
    {
      "summary": "kısa özet (max 100 karakter)",
      "content": "detaylı bilgi",
      "layer": "semantic|strategic",
      "importance": 0.0-1.0,
      "entityType": "candidate|process|preference|null",
      "entityId": "aday email veya isim veya null"
    }
  ]
}

Sohbet:
${conversationText}`;

    const { content: rawResponse } = await aiChatCompletion(
      [
        {
          role: "system",
          content: "Sen bir bilgi çıkarma asistanısın. Sadece JSON döndür.",
        },
        { role: "user", content: extractionPrompt },
      ],
      { temperature: 0.1, maxTokens: 1024, jsonMode: true },
    );

    let parsed: {
      memories: Array<{
        summary: string;
        content: string;
        layer: string;
        importance: number;
        entityType?: string;
        entityId?: string;
      }>;
    };

    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      return; // Invalid JSON, skip silently
    }

    if (!parsed.memories || !Array.isArray(parsed.memories)) return;

    // Store each extracted memory
    for (const mem of parsed.memories) {
      if (!mem.summary || !mem.content) continue;
      if (mem.importance < 0.3) continue; // Skip low-importance items

      await storeMemory({
        layer: (mem.layer === "strategic"
          ? "strategic"
          : "semantic") as MemoryLayer,
        content: mem.content,
        summary: mem.summary,
        entityType: mem.entityType || undefined,
        entityId: mem.entityId || undefined,
        sourceType: "chat_extraction",
        importance: Math.min(1.0, Math.max(0.0, mem.importance)),
        metadata: {
          sessionId: sessionContext?.sessionId,
          extractedAt: new Date().toISOString(),
        },
      });
    }

    // Also store episodic memory of the conversation itself
    const lastUserMsg = recentMessages.filter((m) => m.role === "user").pop();
    const lastAssistantMsg = recentMessages
      .filter((m) => m.role === "assistant")
      .pop();

    if (lastUserMsg && lastAssistantMsg) {
      await storeMemory({
        layer: "episodic",
        content: `Soru: ${lastUserMsg.content}\nYanıt: ${lastAssistantMsg.content.slice(0, 500)}`,
        summary: lastUserMsg.content.slice(0, 200),
        sourceType: "chat_turn",
        importance: 0.3,
        metadata: { sessionId: sessionContext?.sessionId },
      });
    }
  } catch (err) {
    // Non-critical — never block main flow
    console.error("Memory extraction error (non-critical):", err);
  }
}

// ─── Store candidate evaluation memory ───

export async function storeEvaluationMemory(
  candidateName: string,
  candidateEmail: string,
  department: string,
  score: number,
  summary: string,
  recommendation: string,
): Promise<void> {
  await storeMemory({
    layer: "semantic",
    content: `Aday: ${candidateName} (${candidateEmail}), Departman: ${department}, Puan: ${score}/100, Öneri: ${recommendation}. ${summary}`,
    summary: `${candidateName} - ${department} başvurusu: ${score} puan, ${recommendation}`,
    entityType: "candidate",
    entityId: candidateEmail,
    sourceType: "evaluation",
    importance: score >= 70 ? 0.8 : 0.5,
    metadata: { score, department, recommendation },
  });
}

// ─── Build memory context for LLM (injected into system prompt) ───

export async function buildMemoryContext(
  userMessage: string,
  options?: { entityId?: string },
): Promise<string> {
  // Parallel recall: general + entity-specific
  const [generalMemories, entityMemories] = await Promise.all([
    recallMemories({
      query: userMessage,
      layers: ["semantic", "strategic"],
      limit: 5,
      minImportance: 0.3,
    }),
    options?.entityId
      ? recallMemories({
          query: userMessage,
          entityType: "candidate",
          entityId: options.entityId,
          limit: 3,
        })
      : Promise.resolve([]),
  ]);

  // Deduplicate by id
  const seen = new Set<string>();
  const allMemories: MemoryEntry[] = [];
  for (const m of [...entityMemories, ...generalMemories]) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      allMemories.push(m);
    }
  }

  if (allMemories.length === 0) return "";

  const lines = allMemories.map(
    (m) =>
      `- [${m.layer}] ${m.summary} (${m.sourceType}, önem: ${m.importance.toFixed(1)})`,
  );

  return `\n\n--- Hafıza Bağlamı (Geçmiş Bilgiler) ---\n${lines.join("\n")}\n--- Hafıza Sonu ---`;
}
