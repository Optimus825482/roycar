import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/utils";
import {
  listProviders,
  invalidateProviderCache,
  getSystemPrompt,
  invalidatePromptCache,
  getDefaultPrompts,
  getActiveProvider,
} from "@/lib/ai-client";

// GET /api/admin/settings — Mevcut ayarları + prompt'ları getir
export async function GET() {
  try {
    const settings = await prisma.systemSetting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }

    const providers = listProviders();
    const activeProvider = await getActiveProvider();

    // Get current prompts (from DB or defaults)
    const chatPrompt = await getSystemPrompt("chat_system_prompt");
    const evalPrompt = await getSystemPrompt("evaluation_system_prompt");
    const defaults = getDefaultPrompts();

    return Response.json({
      success: true,
      data: {
        settings: map,
        providers,
        activeProvider: {
          label: activeProvider.label,
          model: activeProvider.model,
        },
        prompts: {
          chat_system_prompt: chatPrompt,
          evaluation_system_prompt: evalPrompt,
        },
        defaultPrompts: defaults,
      },
    });
  } catch (err) {
    console.error("Settings GET error:", err);
    return apiError("Ayarlar alınamadı.", 500);
  }
}

// PATCH /api/admin/settings — Ayarları güncelle
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      ai_provider,
      chat_system_prompt,
      evaluation_system_prompt,
      tts_speech_rate,
    } = body;

    const updates: { key: string; value: string }[] = [];

    // Validate & queue provider update
    if (ai_provider) {
      const providers = listProviders();
      const valid = providers.find((p) => p.key === ai_provider);
      if (!valid) {
        return apiError("Geçersiz AI sağlayıcı.");
      }
      updates.push({ key: "ai_provider", value: ai_provider });
    }

    // Queue prompt updates
    if (typeof chat_system_prompt === "string") {
      updates.push({ key: "chat_system_prompt", value: chat_system_prompt });
    }
    if (typeof evaluation_system_prompt === "string") {
      updates.push({
        key: "evaluation_system_prompt",
        value: evaluation_system_prompt,
      });
    }

    // Queue TTS settings
    if (typeof tts_speech_rate === "string") {
      const rate = parseFloat(tts_speech_rate);
      if (!isNaN(rate) && rate >= 0.5 && rate <= 2.0) {
        updates.push({ key: "tts_speech_rate", value: rate.toString() });
      }
    }

    if (updates.length === 0) {
      return apiError("Güncellenecek ayar bulunamadı.");
    }

    // Upsert all settings in a single transaction
    await prisma.$transaction(
      updates.map(({ key, value }) =>
        prisma.systemSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        }),
      ),
    );

    // Invalidate caches
    invalidateProviderCache();
    invalidatePromptCache();

    return Response.json({
      success: true,
      data: { updated: updates.map((u) => u.key) },
    });
  } catch (err) {
    console.error("Settings PATCH error:", err);
    return apiError("Ayarlar güncellenemedi.", 500);
  }
}
