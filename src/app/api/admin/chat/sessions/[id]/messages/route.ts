import { NextRequest } from "next/server";
import { apiError, safeBigInt } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { stripThinkingTags } from "@/lib/ai-client";
import {
  getChatMessages,
  sendChatMessage,
  prepareChatStream,
  saveChatAssistantMessage,
} from "@/services/chat.service";
import {
  hasSqlQuery,
  extractSqlQueries,
  executeSafeQuery,
} from "@/services/db-query.service";

// Helper: get admin name — try auth session first, fallback to header
async function getAdminName(req: NextRequest): Promise<string | undefined> {
  // 1. Try server-side auth session (most reliable)
  try {
    const session = await auth();
    const username = (session?.user as { username?: string })?.username;
    if (username) {
      const admin = await prisma.adminUser.findUnique({
        where: { username },
        select: { fullName: true },
      });
      if (admin?.fullName) {
        console.log("[Chat] adminName from session:", admin.fullName);
        return admin.fullName;
      }
    }
  } catch {
    // fallback to header
  }

  // 2. Fallback: x-admin-username header
  const headerUsername = req.headers.get("x-admin-username");
  if (!headerUsername) {
    console.log("[Chat] No adminName found — header empty, session empty");
    return undefined;
  }
  try {
    const admin = await prisma.adminUser.findUnique({
      where: { username: headerUsername },
      select: { fullName: true },
    });
    console.log("[Chat] adminName from header:", admin?.fullName);
    return admin?.fullName || undefined;
  } catch {
    return undefined;
  }
}

// GET /api/admin/chat/sessions/:id/messages — Mesaj geçmişi
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const chatId = safeBigInt(id);
    if (!chatId) return apiError("Geçersiz sohbet ID", 400);

    const messages = await getChatMessages(chatId);
    const serialized = JSON.parse(
      JSON.stringify(messages, (_k, v) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    );
    return Response.json({ success: true, data: serialized });
  } catch (err) {
    console.error("Chat messages error:", err);
    return apiError("Mesajlar alınamadı.", 500);
  }
}

// POST /api/admin/chat/sessions/:id/messages — Mesaj gönder (SSE streaming)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { message, stream: useStream } = await req.json();
    if (!message?.trim()) return apiError("Mesaj boş olamaz.");

    const sessionId = safeBigInt(id);
    if (!sessionId) return apiError("Geçersiz sohbet ID", 400);
    const adminName = await getAdminName(req);

    // Non-streaming fallback
    if (!useStream) {
      const response = await sendChatMessage(
        sessionId,
        message.trim(),
        adminName,
      );
      const serialized = JSON.parse(
        JSON.stringify(response, (_k, v) =>
          typeof v === "bigint" ? v.toString() : v,
        ),
      );
      return Response.json({ success: true, data: serialized });
    }

    // SSE Streaming
    let result;
    try {
      result = await prepareChatStream(sessionId, message.trim(), adminName);
    } catch (prepErr) {
      const errMsg =
        prepErr instanceof Error
          ? prepErr.message
          : "AI servisi yanıt veremedi.";
      console.error("[Chat SSE] prepareChatStream error:", errMsg);
      const encoder = new TextEncoder();
      const errorStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`),
          );
          controller.close();
        },
      });
      return new Response(errorStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // If tool-use produced pre-computed content (data query), send as single SSE event
    if ("preComputedContent" in result && result.preComputedContent) {
      const saved = await saveChatAssistantMessage(
        sessionId,
        result.preComputedContent,
      );
      const serialized = JSON.parse(
        JSON.stringify(saved, (_k, v) =>
          typeof v === "bigint" ? v.toString() : v,
        ),
      );
      const encoder = new TextEncoder();
      const sseStream = new ReadableStream({
        start(controller) {
          // Send full content as tokens for typing effect
          const chunks = result.preComputedContent!.match(/.{1,20}/g) || [
            result.preComputedContent!,
          ];
          for (const chunk of chunks) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ token: chunk })}\n\n`),
            );
          }
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, message: serialized })}\n\n`,
            ),
          );
          controller.close();
        },
      });
      return new Response(sseStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const { deepseekStream } = result as {
      deepseekStream: ReadableStream<Uint8Array>;
      sessionId: bigint;
    };

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let fullContent = "";

    // Simple state tracking for stripping <think>...</think> from streaming
    // MiniMax M2.1 sends thinking tokens as <think>...</think> inside content
    let insideThink = false;
    let pendingChars = ""; // Buffer for partial tag detection at boundaries

    // Also track [SQL_QUERY]...[/SQL_QUERY] tags for stripping
    let insideSqlTag = false;
    let sqlPendingChars = "";

    function processStreamToken(token: string): string {
      // Phase 1: Strip <think>...</think> tags
      const thinkInput = pendingChars + token;
      pendingChars = "";
      let thinkOutput = "";
      let pos = 0;

      while (pos < thinkInput.length) {
        if (insideThink) {
          const closeIdx = thinkInput.indexOf("</think>", pos);
          if (closeIdx !== -1) {
            insideThink = false;
            pos = closeIdx + 8;
          } else {
            if (thinkInput.length - pos < 8) {
              pendingChars = thinkInput.slice(pos);
            }
            break;
          }
        } else {
          const openIdx = thinkInput.indexOf("<think>", pos);
          if (openIdx !== -1) {
            thinkOutput += thinkInput.slice(pos, openIdx);
            insideThink = true;
            pos = openIdx + 7;
          } else {
            const safeEnd = thinkInput.length - 6;
            if (safeEnd > pos) {
              thinkOutput += thinkInput.slice(pos, safeEnd);
              pendingChars = thinkInput.slice(safeEnd);
            } else {
              pendingChars = thinkInput.slice(pos);
            }
            break;
          }
        }
      }

      // Phase 2: Strip [SQL_QUERY]...[/SQL_QUERY] tags
      if (!thinkOutput) return "";
      const sqlInput = sqlPendingChars + thinkOutput;
      sqlPendingChars = "";
      let output = "";
      let sPos = 0;

      while (sPos < sqlInput.length) {
        if (insideSqlTag) {
          const closeIdx = sqlInput.indexOf("[/SQL_QUERY]", sPos);
          if (closeIdx !== -1) {
            insideSqlTag = false;
            sPos = closeIdx + 12;
          } else {
            if (sqlInput.length - sPos < 12) {
              sqlPendingChars = sqlInput.slice(sPos);
            }
            break;
          }
        } else {
          const openIdx = sqlInput.indexOf("[SQL_QUERY]", sPos);
          if (openIdx !== -1) {
            output += sqlInput.slice(sPos, openIdx);
            insideSqlTag = true;
            sPos = openIdx + 11;
          } else {
            const safeSqlEnd = sqlInput.length - 10;
            if (safeSqlEnd > sPos) {
              output += sqlInput.slice(sPos, safeSqlEnd);
              sqlPendingChars = sqlInput.slice(safeSqlEnd);
            } else {
              sqlPendingChars = sqlInput.slice(sPos);
            }
            break;
          }
        }
      }

      return output;
    }

    // Flush any remaining pending chars at end of stream
    // CRITICAL: sqlPendingChars (Phase 2 buffer) represents EARLIER content
    // in the stream than pendingChars (Phase 1 buffer), so order matters.
    function flushPending(): string {
      // Phase 1 flush: emit remaining chars if not inside <think>
      const phase1Flush = !insideThink && pendingChars ? pendingChars : "";
      pendingChars = "";

      // Phase 2 flush: sqlPendingChars comes BEFORE phase1Flush in stream order
      // because sqlPendingChars was already Phase-1-processed content
      const result = !insideSqlTag ? sqlPendingChars + phase1Flush : "";
      sqlPendingChars = "";

      return result;
    }

    const sseStream = new ReadableStream({
      async start(controller) {
        const reader = deepseekStream.getReader();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;
              const data = trimmed.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;
                if (!delta) continue;

                // NVIDIA GLM5 sends reasoning_content (thinking tokens) — skip them
                // MiniMax M2.1 sends <think>...</think> inside content — strip them
                // Only forward actual content tokens to the client
                const content = delta.content;
                if (content) {
                  const filtered = processStreamToken(content);
                  if (filtered) {
                    fullContent += filtered;
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({ token: filtered })}\n\n`,
                      ),
                    );
                  }
                }
              } catch {
                // Skip malformed JSON chunks
              }
            }
          }

          // Flush any remaining buffered chars from think-tag detection
          const remaining = flushPending();
          if (remaining) {
            fullContent += remaining;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ token: remaining })}\n\n`,
              ),
            );
          }

          // Check if the raw stream content contained SQL queries that need execution
          // This handles the case where streaming mode bypasses the tool-use loop
          let rawFullContent = fullContent;
          // Also check pendingChars that were stripped (they may contain SQL tags)
          const rawContentForSqlCheck = stripThinkingTags(
            fullContent +
              (insideSqlTag ? sqlPendingChars : "") +
              (insideThink ? pendingChars : ""),
          );

          if (hasSqlQuery(rawContentForSqlCheck) || hasSqlQuery(fullContent)) {
            // SQL tags found in stream — execute queries and get a clean response
            console.log(
              "[Chat SSE] SQL tags detected in stream, executing queries...",
            );
            const queries =
              extractSqlQueries(rawContentForSqlCheck) ||
              extractSqlQueries(fullContent);
            if (queries.length > 0) {
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

              // Now make a follow-up non-streaming call with the SQL results
              const { chatCompletion: followUpCompletion } =
                await import("@/lib/deepseek");
              const { getSystemPrompt: getPrompt } =
                await import("@/lib/ai-client");
              const chatPrompt = await getPrompt("chat_system_prompt");

              const followUpMessages = [
                { role: "system" as const, content: chatPrompt },
                {
                  role: "user" as const,
                  content: `Kullanıcı veritabanından veri istedi. Aşağıdaki sorgu sonuçlarını kullanarak doğal dilde, Markdown tablo formatında yanıt ver. SQL sorgularını veya tag'leri gösterme.\n\n[SQL_RESULTS]\n${results.join("\n\n")}\n[/SQL_RESULTS]`,
                },
              ];

              try {
                const { content: cleanResponse } = await followUpCompletion(
                  followUpMessages,
                  {
                    temperature: 0.3,
                    maxTokens: 4096,
                  },
                );

                // Replace the streamed content with the clean response
                rawFullContent = cleanResponse
                  .replace(/\[SQL_QUERY\][\s\S]*?\[\/SQL_QUERY\]/g, "")
                  .replace(/\[SQL_RESULTS\][\s\S]*?\[\/SQL_RESULTS\]/g, "")
                  .trim();

                // Send a "replace" signal — clear previous tokens and send clean content
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ replace: true, content: rawFullContent })}\n\n`,
                  ),
                );
              } catch (sqlErr) {
                console.error("[Chat SSE] SQL follow-up failed:", sqlErr);
                // Fall through to normal save with stripped content
              }
            }
          }

          // Save complete message to DB — final safety strip for any leaked tags
          let cleanContent = stripThinkingTags(rawFullContent);
          // Strip any remaining SQL tags that might have leaked
          cleanContent = cleanContent
            .replace(/\[SQL_QUERY\][\s\S]*?\[\/SQL_QUERY\]/g, "")
            .replace(/\[SQL_RESULTS\][\s\S]*?\[\/SQL_RESULTS\]/g, "")
            .trim();
          if (cleanContent) {
            const saved = await saveChatAssistantMessage(
              sessionId,
              cleanContent,
            );
            const serialized = JSON.parse(
              JSON.stringify(saved, (_k, v) =>
                typeof v === "bigint" ? v.toString() : v,
              ),
            );
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ done: true, message: serialized })}\n\n`,
              ),
            );
          } else {
            // Empty response — send error to client so they know something went wrong
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: "AI modeli boş yanıt döndü. Lütfen tekrar deneyin veya farklı bir model seçin." })}\n\n`,
              ),
            );
          }
        } catch (err) {
          console.error("Stream processing error:", err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Yanıt işlenirken hata oluştu." })}\n\n`,
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(sseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Chat send error:", err);
    return apiError("Mesaj gönderilemedi.", 500);
  }
}
