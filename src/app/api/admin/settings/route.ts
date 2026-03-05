import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, handleRouteError } from "@/lib/utils";
import { requireAuth, requirePermission } from "@/lib/auth-helpers";
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
    const authResult = await requireAuth();
    if (!authResult.ok) return authResult.response;

    const settings = await prisma.systemSetting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }

    const emailTemplateDefaults: Record<string, string> = {
      email_application_subject: "Başvurunuz Alındı — {{applicationNo}}",
      email_status_shortlisted_subject: "Başvurunuz Ön Elemeyi Geçti — F&B Career System",
      email_status_shortlisted_message: "Başvurunuz detaylı incelemeye alınmış ve ön eleme sürecini başarıyla geçmiştir. İnsan Kaynakları ekibimiz en kısa sürede sizinle iletişime geçecektir.",
      email_status_rejected_subject: "F&B Career System — Başvurunuza İlişkin Bilgilendirme",
      email_status_rejected_message: "Başvurunuzu titizlikle değerlendirdik. Şu an için farklı bir profil tercih edilmiştir. İlginiz için teşekkür ederiz.",
      email_status_hired_subject: "Tebrikler — F&B Career System İşe Alım Bildirimi",
      email_status_hired_message: "Başvurunuz değerlendirilmiş ve sizi ailemize katmaktan mutluluk duyacağımıza karar verilmiştir. İşe başlama sürecinizle ilgili en kısa sürede iletişime geçilecektir.",
      email_status_evaluated_subject: "Başvurunuz Değerlendirildi — F&B Career System",
      email_status_evaluated_message: "Başvurunuz İK ekibimiz tarafından değerlendirilmiştir. Sonuç hakkında en kısa sürede sizinle iletişime geçilecektir.",
    };
    for (const [key, value] of Object.entries(emailTemplateDefaults)) {
      if (map[key] === undefined) map[key] = value;
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
    return handleRouteError(err, "Ayarlar alınamadı.", 500);
  }
}

// PATCH /api/admin/settings — Ayarları güncelle
export async function PATCH(req: NextRequest) {
  try {
    const authResult = await requirePermission("settings");
    if (!authResult.ok) return authResult.response;

    const body = await req.json();
    const {
      ai_provider,
      chat_system_prompt,
      evaluation_system_prompt,
      tts_speech_rate,
      ...rest
    } = body;

    const updates: { key: string; value: string }[] = [];

    const emailKeys = [
      "email_application_subject",
      "email_status_shortlisted_subject", "email_status_shortlisted_message",
      "email_status_rejected_subject", "email_status_rejected_message",
      "email_status_hired_subject", "email_status_hired_message",
      "email_status_evaluated_subject", "email_status_evaluated_message",
    ];
    for (const key of emailKeys) {
      if (typeof rest[key] === "string") {
        updates.push({ key, value: rest[key] });
      }
    }

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
    return handleRouteError(err, "Ayarlar güncellenemedi.", 500);
  }
}
