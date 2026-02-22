// ─── DeepSeek API Client (backward-compat wrapper) ───
// Now delegates to multi-provider ai-client.ts

import {
  aiChatCompletion,
  aiChatCompletionStream,
  type ChatMessage,
} from "@/lib/ai-client";

export type { ChatMessage };

export async function chatCompletion(
  messages: ChatMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
  },
): Promise<{
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}> {
  const result = await aiChatCompletion(messages, options);

  // Usage stats not available from all providers, return placeholder
  return {
    content: result.content,
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
}

export async function chatCompletionStream(
  messages: ChatMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
  },
): Promise<ReadableStream<Uint8Array>> {
  const { stream } = await aiChatCompletionStream(messages, options);
  return stream;
}
