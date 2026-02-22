import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, generateApplicationNo } from "@/lib/utils";
import { triggerEvaluation } from "@/services/evaluation.service";
import { sendApplicationConfirmation } from "@/services/email.service";

// POST /api/apply — Yeni başvuru gönder
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      formConfigId,
      departmentId,
      fullName,
      email,
      phone,
      photoPath,
      answers, // Record<questionId, { answerText?, answerJson?, answerFile? }>
    } = body;

    // Validasyon
    if (!formConfigId || !departmentId || !fullName || !email || !phone) {
      return apiError(
        "Zorunlu alanlar eksik: formConfigId, departmentId, fullName, email, phone",
      );
    }

    // Email format kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return apiError("Geçersiz e-posta adresi.");
    }

    // Mükerrer başvuru kontrolü:
    // Aynı form + aynı email + aynı cevaplar → DUPLICATE (reddet)
    // Aynı form + aynı email + farklı cevaplar → KABUL
    // Farklı form + aynı email → KABUL
    const existingApps = await prisma.application.findMany({
      where: {
        email: email.toLowerCase().trim(),
        formConfigId: BigInt(formConfigId),
      },
      include: {
        responses: {
          orderBy: { questionId: "asc" },
          select: { questionId: true, answerText: true, answerJson: true },
        },
      },
    });

    if (existingApps.length > 0 && answers && typeof answers === "object") {
      // Yeni başvurunun cevap hash'ini oluştur
      const newAnswerEntries = Object.entries(answers) as [
        string,
        { answerText?: string; answerJson?: unknown; answerFile?: string },
      ][];
      const newAnswerHash = newAnswerEntries
        .sort(([a], [b]) => a.localeCompare(b))
        .map(
          ([qId, ans]) =>
            `${qId}:${ans.answerText || JSON.stringify(ans.answerJson) || ""}`,
        )
        .join("|");

      for (const existingApp of existingApps) {
        const existingHash = existingApp.responses
          .sort((a, b) => Number(a.questionId) - Number(b.questionId))
          .map(
            (r) =>
              `${r.questionId}:${r.answerText || JSON.stringify(r.answerJson) || ""}`,
          )
          .join("|");

        if (newAnswerHash === existingHash) {
          return apiError(
            "Bu forma aynı cevaplarla zaten başvuru yapılmış. Farklı bilgilerle tekrar deneyebilirsiniz.",
          );
        }
      }
    }

    // Form aktif mi kontrol et
    const form = await prisma.formConfig.findFirst({
      where: { id: BigInt(formConfigId), isPublished: true, isActive: true },
    });
    if (!form) {
      return apiError("Aktif form bulunamadı.", 404);
    }

    // Başvuru numarası üret
    const applicationNo = generateApplicationNo();

    // responseSummary oluştur (AI değerlendirmesi için)
    const responseSummary: Record<string, unknown> = {
      fullName,
      email: email.toLowerCase().trim(),
      phone,
    };

    // Başvuruyu ve yanıtları transaction ile kaydet
    const application = await prisma.$transaction(async (tx) => {
      const app = await tx.application.create({
        data: {
          applicationNo,
          formConfigId: BigInt(formConfigId),
          departmentId: BigInt(departmentId),
          fullName: fullName.trim(),
          email: email.toLowerCase().trim(),
          phone: phone.trim(),
          photoPath: photoPath || null,
          status: "new",
          responseSummary: {},
        },
      });

      // Yanıtları kaydet
      if (answers && typeof answers === "object") {
        const responseEntries = Object.entries(answers) as [
          string,
          { answerText?: string; answerJson?: unknown; answerFile?: string },
        ][];
        for (const [questionId, answer] of responseEntries) {
          await tx.applicationResponse.create({
            data: {
              applicationId: app.id,
              questionId: BigInt(questionId),
              answerText: answer.answerText || null,
              answerJson: answer.answerJson ?? undefined,
              answerFile: answer.answerFile || null,
            },
          });

          // responseSummary'ye ekle
          responseSummary[`q_${questionId}`] =
            answer.answerText || answer.answerJson || answer.answerFile || null;
        }
      }

      // responseSummary güncelle
      await tx.application.update({
        where: { id: app.id },
        data: {
          responseSummary: responseSummary as unknown as Record<string, string>,
        },
      });

      return app;
    });

    // Asenkron AI değerlendirmesi başlat (fire-and-forget)
    triggerEvaluation(application.id);

    // Departman adını al ve onay e-postası gönder (fire-and-forget)
    const dept = await prisma.department.findUnique({
      where: { id: BigInt(departmentId) },
    });
    sendApplicationConfirmation({
      email: email.toLowerCase().trim(),
      fullName: fullName.trim(),
      applicationNo,
      departmentName: dept?.name || "Belirtilmemiş",
    }).catch((err) => console.error("E-posta gönderme hatası:", err));

    return Response.json(
      apiSuccess({
        applicationNo: application.applicationNo,
        id: application.id.toString(),
      }),
      { status: 201 },
    );
  } catch (err) {
    console.error("Başvuru kaydetme hatası:", err);
    return apiError("Başvuru kaydedilemedi.", 500);
  }
}
