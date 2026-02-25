import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { aiChatCompletion, type ChatMessage } from "@/lib/ai-client";

interface AiQuestion {
  groupLabel: string;
  questionText: string;
  questionType: string;
  isRequired: boolean;
  options?: string[];
}

interface AiFormPlan {
  title: string;
  mode: "static" | "dynamic";
  questions: AiQuestion[];
}

const FORM_GENERATOR_PROMPT = `Sen F&B Career System'in Form Oluşturucu AI'ısın.

GÖREV: Kullanıcının açıklamasına göre eksiksiz bir başvuru formu planı oluştur veya mevcut formu güncelle.

ÖNEMLİ: Eğer kullanıcı mevcut bir formu güncelleme istiyorsa, conversation history'deki mevcut form bilgilerini dikkate al ve sadece istenen değişiklikleri yansıt. Mevcut soruları koru, sadece istenen ekleme/silme/değişiklikleri uygula.

ÇIKTI FORMATI: Yanıtını MUTLAKA aşağıdaki JSON formatında ver. JSON dışında hiçbir metin ekleme.

\`\`\`json
{
  "title": "Form başlığı",
  "mode": "static veya dynamic",
  "questions": [
    {
      "groupLabel": "Grup adı",
      "questionText": "Soru metni",
      "questionType": "text|textarea|select|radio|checkbox|date|file",
      "isRequired": true,
      "options": ["seçenek1", "seçenek2"]
    }
  ]
}
\`\`\`

KURALLAR:
1. Ad Soyad, E-posta ve Telefon bilgileri başvuru formunda otomatik olarak alınmaktadır. Bu bilgileri ASLA soru olarak ekleme. Formda bu bilgileri sorma.
2. Otelcilik sektörüne uygun sorular ekle
3. options sadece select, radio, checkbox tiplerinde olsun
4. Soruları mantıklı gruplara ayır (Kişisel Bilgiler, İletişim, Eğitim, Deneyim, Yetkinlikler vb.)
5. Pozisyona özel sorular ekle
6. 15-30 arası soru hedefle
7. SADECE JSON döndür, başka açıklama ekleme`;

// POST /api/admin/forms/ai-generate — AI ile form planı oluştur veya kaydet
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      description,
      formPlan,
      history,
      formContext,
      formId: targetFormId,
    } = body;

    // Action: "generate" — AI'dan form planı iste
    if (action === "generate") {
      if (!description?.trim()) {
        return apiError("Form açıklaması gerekli.");
      }

      const messages: ChatMessage[] = [
        { role: "system", content: FORM_GENERATOR_PROMPT },
      ];

      // Mevcut form bağlamını ekle (güncelleme modu için)
      if (formContext) {
        messages.push({
          role: "system",
          content: `[MEVCUT FORM BAĞLAMI — Bu formu güncelliyorsun, mevcut soruları koru ve sadece istenen değişiklikleri uygula]\n${formContext}`,
        });
      }

      if (Array.isArray(history)) {
        for (const msg of history.slice(-6)) {
          messages.push({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          });
        }
      }

      messages.push({ role: "user", content: description.trim() });

      const result = await aiChatCompletion(messages, {
        temperature: 0.5,
        maxTokens: 4096,
      });

      // Parse JSON from AI response
      let plan: AiFormPlan | null = null;
      try {
        const jsonMatch = result.content.match(/```json\s*([\s\S]*?)```/);
        const raw = jsonMatch ? jsonMatch[1] : result.content;
        plan = JSON.parse(raw.trim());
      } catch {
        // AI didn't return valid JSON, return raw content
        return Response.json(
          apiSuccess({
            type: "text",
            content: result.content,
            provider: result.provider,
          }),
        );
      }

      return Response.json(
        apiSuccess({
          type: "form_plan",
          plan,
          provider: result.provider,
        }),
      );
    }

    // Action: "save" — Onaylanan planı veritabanına kaydet (yeni form)
    if (action === "save") {
      if (!formPlan?.title || !Array.isArray(formPlan.questions)) {
        return apiError("Geçersiz form planı.");
      }

      const form = await prisma.formConfig.create({
        data: {
          title: formPlan.title,
          mode: formPlan.mode || "static",
          isPublished: false,
        },
      });

      const questionsData = formPlan.questions.map(
        (q: AiQuestion, idx: number) => ({
          formConfigId: form.id,
          groupLabel: q.groupLabel || null,
          questionText: q.questionText,
          questionType: q.questionType || "text",
          isRequired: q.isRequired ?? true,
          sortOrder: idx,
          options: q.options && q.options.length > 0 ? q.options : undefined,
        }),
      );

      await prisma.question.createMany({ data: questionsData });

      const created = await prisma.formConfig.findUnique({
        where: { id: form.id },
        include: {
          questions: { orderBy: { sortOrder: "asc" } },
          _count: { select: { questions: true, applications: true } },
        },
      });

      return Response.json(apiSuccess(created, "Form başarıyla oluşturuldu."), {
        status: 201,
      });
    }

    // Action: "update" — Mevcut formu AI planıyla güncelle
    if (action === "update") {
      if (!targetFormId) {
        return apiError("formId gerekli.");
      }
      if (!formPlan?.title || !Array.isArray(formPlan.questions)) {
        return apiError("Geçersiz form planı.");
      }

      const existingForm = await prisma.formConfig.findUnique({
        where: { id: BigInt(targetFormId) },
        include: { questions: true },
      });
      if (!existingForm) {
        return apiError("Form bulunamadı.", 404);
      }

      // Transaction: başlık güncelle, eski soruları sil, yeni soruları ekle
      await prisma.$transaction(async (tx) => {
        // Başlık ve mod güncelle
        await tx.formConfig.update({
          where: { id: BigInt(targetFormId) },
          data: {
            title: formPlan.title,
            mode: formPlan.mode || existingForm.mode,
          },
        });

        // Mevcut soruları sil (başvurusu olmayan sorular)
        await tx.question.deleteMany({
          where: { formConfigId: BigInt(targetFormId) },
        });

        // Yeni soruları ekle
        const questionsData = formPlan.questions.map(
          (q: AiQuestion, idx: number) => ({
            formConfigId: BigInt(targetFormId),
            groupLabel: q.groupLabel || null,
            questionText: q.questionText,
            questionType: q.questionType || "text",
            isRequired: q.isRequired ?? true,
            sortOrder: idx,
            options: q.options && q.options.length > 0 ? q.options : undefined,
          }),
        );

        await tx.question.createMany({ data: questionsData });
      });

      const updated = await prisma.formConfig.findUnique({
        where: { id: BigInt(targetFormId) },
        include: {
          questions: { orderBy: { sortOrder: "asc" } },
          _count: { select: { questions: true, applications: true } },
        },
      });

      return Response.json(apiSuccess(updated, "Form başarıyla güncellendi."));
    }

    return apiError(
      "Geçersiz action. 'generate', 'save' veya 'update' kullanın.",
    );
  } catch (err) {
    console.error("AI form generate error:", err);
    const errMsg = err instanceof Error ? err.message : "Form oluşturulamadı.";
    return apiError(errMsg, 500);
  }
}
