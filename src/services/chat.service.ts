// ─── AI Chat Servisi ───
// Sliding window + synchronous auto-summary for long conversation context
// Uses "serial position optimization" — summary at START, recent messages at END

import { prisma } from "@/lib/prisma";
import { chatCompletion, chatCompletionStream } from "@/lib/deepseek";
import { getSystemPrompt } from "@/lib/ai-client";
import {
  buildMemoryContext,
  extractAndStoreMemories,
} from "@/services/memory.service";
import {
  extractSqlQueries,
  hasSqlQuery,
  executeSafeQuery,
  DB_SCHEMA_DESCRIPTION,
} from "@/services/db-query.service";

// ─── Constants ───
const RECENT_WINDOW = 16; // Keep last 16 messages verbatim (8 turns)
const SUMMARY_TRIGGER = 16; // Start summarizing when total > 16 (same as window)
const MAX_TOKENS_RESPONSE = 4096;
const MAX_TOKENS_STREAMING = 8192;

// ─── Ensure summary exists (SYNCHRONOUS — blocks until ready) ───
async function ensureSummaryExists(
  sessionId: bigint,
  oldMessages: { role: string; content: string; createdAt?: Date }[],
): Promise<string> {
  // Check if we already have a summary
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    select: { contextSummary: true, summaryUpTo: true },
  });

  // If summary exists and covers enough old messages, return it
  if (
    session?.contextSummary &&
    (session.summaryUpTo ?? 0) >= oldMessages.length - 4
  ) {
    return session.contextSummary;
  }

  // Generate summary SYNCHRONOUSLY
  try {
    const summary = await generateSummary(oldMessages, session?.contextSummary);
    if (summary && summary.length > 20) {
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: {
          contextSummary: summary,
          summaryUpTo: oldMessages.length,
        },
      });
      return summary;
    }
  } catch (err) {
    console.error("[ChatService] Sync summary generation failed:", err);
  }

  // Fallback: return existing summary or compact representation
  if (session?.contextSummary) return session.contextSummary;
  return compactOldMessages(oldMessages);
}

// ─── Generate summary via AI (incremental — builds on existing summary) ───
async function generateSummary(
  messages: { role: string; content: string }[],
  existingSummary?: string | null,
): Promise<string> {
  // Build conversation text from messages
  const conversationText = messages
    .map((m) => {
      const role = m.role === "user" ? "Kullanıcı" : "AI";
      const short =
        m.content.length > 400 ? m.content.slice(0, 400) + "..." : m.content;
      return `${role}: ${short}`;
    })
    .join("\n");

  // Cap input to avoid excessive token usage
  const cappedText =
    conversationText.length > 5000
      ? conversationText.slice(0, 5000) + "\n...(kısaltıldı)"
      : conversationText;

  const summaryPrompt = existingSummary
    ? `Mevcut konuşma özeti:
${existingSummary}

Yeni mesajlar:
${cappedText}

Yukarıdaki mevcut özeti, yeni mesajlarla birleştirerek GÜNCEL bir özet oluştur.`
    : `Aşağıdaki sohbeti özetle:

${cappedText}`;

  const summaryMessages = [
    {
      role: "system" as const,
      content: `Sen bir konuşma özetleyicisisin. Verilen sohbet geçmişini yapılandırılmış şekilde özetle.

ÖZETİN İÇERMESİ GEREKENLER:
1. KONULAR: Konuşulan ana konular (madde madde)
2. ÖNEMLİ BİLGİLER: Verilen sayısal bilgiler, analiz sonuçları, tablo verileri
3. KULLANICI İSTEKLERİ: Kullanıcının sorduğu sorular ve aldığı yanıtların özeti
4. KARARLAR: Varsa alınan kararlar veya yapılan değerlendirmeler
5. SON DURUM: Konuşmanın son durumu, nerede kaldığı

Maksimum 600 kelime. Türkçe yaz. Sadece özeti yaz, başka bir şey ekleme.
Özet, başka bir AI'ın bu konuşmayı devam ettirebilmesi için yeterli detay içermeli.`,
    },
    {
      role: "user" as const,
      content: summaryPrompt,
    },
  ];

  const { content: summary } = await chatCompletion(summaryMessages, {
    temperature: 0.2,
    maxTokens: 1200,
  });

  return summary;
}

// ─── Compact old messages (last-resort fallback) ───
function compactOldMessages(
  messages: { role: string; content: string }[],
): string {
  const lines: string[] = [];
  for (const m of messages) {
    const role = m.role === "user" ? "Kullanıcı" : "AI";
    const short =
      m.content.length > 300 ? m.content.slice(0, 300) + "..." : m.content;
    lines.push(`${role}: ${short}`);
  }
  let result = lines.join("\n");
  if (result.length > 3000) {
    result = result.slice(0, 3000) + "\n...(daha eski mesajlar kısaltıldı)";
  }
  return result;
}

// ─── Build conversation messages with context management ───
// Uses "serial position optimization":
//   [system prompt] → [summary as user/assistant exchange] → [recent messages]
// This ensures the model treats the summary as actual conversation history,
// not just instructions buried in a long system prompt.
async function buildConversationMessages(
  sessionId: bigint,
  systemPrompt: string,
): Promise<{ role: "system" | "user" | "assistant"; content: string }[]> {
  // Fetch ALL messages for this session
  const allMessages = await prisma.chatMessage.findMany({
    where: { chatSessionId: sessionId },
    orderBy: { createdAt: "asc" },
  });

  const totalCount = allMessages.length;

  // Short conversation — send everything verbatim
  if (totalCount <= RECENT_WINDOW) {
    return [
      { role: "system" as const, content: systemPrompt },
      ...allMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];
  }

  // Long conversation — sliding window + summary
  const recentMessages = allMessages.slice(-RECENT_WINDOW);
  const oldMessages = allMessages.slice(0, -RECENT_WINDOW);

  // SYNCHRONOUS summary generation — blocks until ready
  const summary = await ensureSummaryExists(
    sessionId,
    oldMessages.map((m) => ({ role: m.role, content: m.content })),
  );

  const messages: { role: "system" | "user" | "assistant"; content: string }[] =
    [];

  // 1. System prompt (clean — no summary appended)
  messages.push({ role: "system", content: systemPrompt });

  // 2. Summary injected as user/assistant exchange
  //    This is a proven technique — the model treats it as real conversation history
  if (summary) {
    messages.push({
      role: "user",
      content: `[BAĞLAM HATIRLATMASI] Bu konuşmanın önceki kısmının özeti:\n\n${summary}\n\nBu bağlamı hatırlayarak konuşmaya devam et.`,
    });
    messages.push({
      role: "assistant",
      content:
        "Anladım, önceki konuşmamızın bağlamını hatırlıyorum. Konuştuğumuz konuları ve paylaştığın bilgileri dikkate alarak devam ediyorum.",
    });
  }

  // 3. Recent messages verbatim (at the END — serial position effect)
  for (const m of recentMessages) {
    messages.push({
      role: m.role as "user" | "assistant",
      content: m.content,
    });
  }

  // 4. Background: update summary if significantly behind
  //    (non-blocking — for NEXT request's benefit)
  if (totalCount >= SUMMARY_TRIGGER + 8) {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { summaryUpTo: true },
    });
    if ((session?.summaryUpTo ?? 0) < oldMessages.length - 6) {
      updateSummaryBackground(sessionId, oldMessages).catch(() => {});
    }
  }

  return messages;
}

// ─── Background summary update (non-blocking, for future requests) ───
async function updateSummaryBackground(
  sessionId: bigint,
  oldMessages: { role: string; content: string }[],
): Promise<void> {
  try {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { contextSummary: true },
    });
    const summary = await generateSummary(oldMessages, session?.contextSummary);
    if (summary && summary.length > 20) {
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: {
          contextSummary: summary,
          summaryUpTo: oldMessages.length,
        },
      });
    }
  } catch (err) {
    console.error("[ChatService] Background summary update failed:", err);
  }
}

// ─── Public API ───

export async function createChatSession(adminUserId: bigint, title?: string) {
  return prisma.chatSession.create({
    data: {
      adminUserId,
      title: title || `Sohbet - ${new Date().toLocaleDateString("tr-TR")}`,
    },
  });
}

export async function getChatMessages(sessionId: bigint) {
  return prisma.chatMessage.findMany({
    where: { chatSessionId: sessionId },
    orderBy: { createdAt: "asc" },
  });
}

export async function sendChatMessage(
  sessionId: bigint,
  userMessage: string,
  adminName?: string,
) {
  // Save user message
  await prisma.chatMessage.create({
    data: { chatSessionId: sessionId, role: "user", content: userMessage },
  });

  // Build enriched system prompt
  const [chatPrompt, memoryContext] = await Promise.all([
    getSystemPrompt("chat_system_prompt"),
    buildMemoryContext(userMessage),
  ]);

  const userIdentity = adminName
    ? `\n\nSeninle konuşan kişi: ${adminName}. Ona adıyla hitap et.`
    : "";
  const enrichedPrompt =
    chatPrompt +
    userIdentity +
    "\n" +
    DB_SCHEMA_DESCRIPTION +
    (memoryContext ? "\n" + memoryContext : "");

  // Build messages with context management
  const messages = await buildConversationMessages(sessionId, enrichedPrompt);

  // Tool-use loop: AI may request SQL queries (max 3 rounds)
  let finalContent = "";
  for (let round = 0; round < 3; round++) {
    const { content } = await chatCompletion(messages, {
      temperature: 0.7,
      maxTokens: MAX_TOKENS_RESPONSE,
    });

    if (!hasSqlQuery(content)) {
      finalContent = content;
      break;
    }

    // Execute SQL queries
    const queries = extractSqlQueries(content);
    const results: string[] = [];
    for (const sql of queries) {
      const result = await executeSafeQuery(sql);
      if (result.success) {
        results.push(
          `Sorgu: ${sql}\nSonuç (${result.rowCount} satır):\n${JSON.stringify(result.data, null, 2)}`,
        );
      } else {
        results.push(`Sorgu: ${sql}\nHata: ${result.error}`);
      }
    }

    messages.push({ role: "assistant" as const, content });
    messages.push({
      role: "user" as const,
      content: `[SQL_RESULTS]\n${results.join("\n\n")}\n[/SQL_RESULTS]\n\nYukarıdaki sorgu sonuçlarını kullanarak kullanıcının sorusuna doğal dilde yanıt ver. SQL sorgularını veya tag'leri kullanıcıya gösterme.`,
    });
  }

  if (!finalContent) {
    const { content } = await chatCompletion(messages, {
      temperature: 0.7,
      maxTokens: MAX_TOKENS_RESPONSE,
    });
    finalContent = content
      .replace(/\[SQL_QUERY\][\s\S]*?\[\/SQL_QUERY\]/g, "")
      .trim();
  }

  finalContent = finalContent
    .replace(/\[SQL_QUERY\][\s\S]*?\[\/SQL_QUERY\]/g, "")
    .trim();

  // Save assistant response
  const assistantMsg = await prisma.chatMessage.create({
    data: {
      chatSessionId: sessionId,
      role: "assistant",
      content: finalContent,
    },
  });

  // Background: extract and store memories
  extractAndStoreMemories(
    messages.filter((m) => m.role !== "system"),
    { sessionId: sessionId.toString() },
  ).catch(() => {});

  return assistantMsg;
}

export async function getChatSessions(
  adminUserId: bigint,
  includeArchived = false,
) {
  return prisma.chatSession.findMany({
    where: {
      adminUserId,
      ...(includeArchived ? {} : { isArchived: false }),
    },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { messages: true } } },
  });
}

// ─── Streaming Chat ───

export async function prepareChatStream(
  sessionId: bigint,
  userMessage: string,
  adminName?: string,
) {
  // Save user message
  await prisma.chatMessage.create({
    data: { chatSessionId: sessionId, role: "user", content: userMessage },
  });

  // Build enriched system prompt
  const [chatPrompt, memoryContext] = await Promise.all([
    getSystemPrompt("chat_system_prompt"),
    buildMemoryContext(userMessage),
  ]);

  const userIdentity = adminName
    ? `\n\nSeninle konuşan kişi: ${adminName}. Ona adıyla hitap et.`
    : "";
  const enrichedPrompt =
    chatPrompt +
    userIdentity +
    "\n" +
    DB_SCHEMA_DESCRIPTION +
    (memoryContext ? "\n" + memoryContext : "");

  // Build messages with context management
  const messages = await buildConversationMessages(sessionId, enrichedPrompt);

  // Pre-check: does this look like a data query?
  const dataKeywords =
    /kaç|sayı|toplam|liste|listele|göster|istatistik|puan|skor|departman|başvur|aday|değerlendir|ortalama|en yüksek|en düşük|son\s+\d+|ilk\s+\d+|count|total|average|tablo|rapor|dağılım|özet|analiz|karşılaştır|sıra|ranking|durum|status|sonuç|veri|data|sorgu|query/i;
  if (dataKeywords.test(userMessage)) {
    const toolResult = await runToolUseLoop(messages);
    return { preComputedContent: toolResult, sessionId };
  }

  // Get the raw stream
  const deepseekStream = await chatCompletionStream(messages, {
    temperature: 0.7,
    maxTokens: MAX_TOKENS_STREAMING,
  });

  return { deepseekStream, sessionId };
}

// ─── Tool-use loop for data queries ───

async function runToolUseLoop(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
): Promise<string> {
  const loopMessages = [...messages];

  for (let round = 0; round < 3; round++) {
    const { content } = await chatCompletion(loopMessages, {
      temperature: 0.7,
      maxTokens: MAX_TOKENS_RESPONSE,
    });

    if (!hasSqlQuery(content)) {
      return content;
    }

    const queries = extractSqlQueries(content);
    const results: string[] = [];
    for (const sql of queries) {
      const result = await executeSafeQuery(sql);
      if (result.success) {
        results.push(
          `Sorgu: ${sql}\nSonuç (${result.rowCount} satır):\n${JSON.stringify(result.data, null, 2)}`,
        );
      } else {
        results.push(`Sorgu: ${sql}\nHata: ${result.error}`);
      }
    }

    loopMessages.push({ role: "assistant", content });
    loopMessages.push({
      role: "user",
      content: `[SQL_RESULTS]\n${results.join("\n\n")}\n[/SQL_RESULTS]\n\nYukarıdaki sorgu sonuçlarını kullanarak kullanıcının sorusuna doğal dilde yanıt ver. SQL sorgularını veya tag'leri kullanıcıya gösterme.`,
    });
  }

  const { content } = await chatCompletion(loopMessages, {
    temperature: 0.7,
    maxTokens: MAX_TOKENS_RESPONSE,
  });
  return content.replace(/\[SQL_QUERY\][\s\S]*?\[\/SQL_QUERY\]/g, "").trim();
}

export async function saveChatAssistantMessage(
  sessionId: bigint,
  content: string,
) {
  const msg = await prisma.chatMessage.create({
    data: { chatSessionId: sessionId, role: "assistant", content },
  });

  // Background: extract memories from recent conversation
  prisma.chatMessage
    .findMany({
      where: { chatSessionId: sessionId },
      orderBy: { createdAt: "asc" },
      take: 20,
    })
    .then((history) => {
      const messages = history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
      return extractAndStoreMemories(messages, {
        sessionId: sessionId.toString(),
      });
    })
    .catch(() => {});

  return msg;
}
