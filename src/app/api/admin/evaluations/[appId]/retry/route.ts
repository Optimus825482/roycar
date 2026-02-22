import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { triggerEvaluation } from "@/services/evaluation.service";

type Params = { params: Promise<{ appId: string }> };

// POST /api/admin/evaluations/:appId/retry — Değerlendirmeyi yeniden dene
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { appId } = await params;
    const applicationId = BigInt(appId);

    // Başvuru var mı kontrol et
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return apiError("Başvuru bulunamadı.", 404);
    }

    // Mevcut değerlendirmeyi sıfırla veya oluştur
    const existing = await prisma.evaluation.findUnique({
      where: { applicationId },
    });

    if (existing) {
      await prisma.evaluation.update({
        where: { id: existing.id },
        data: {
          status: "pending",
          retryCount: 0,
          rawResponse: null,
          evaluatedAt: null,
        },
      });
    }

    // Asenkron değerlendirme başlat
    triggerEvaluation(applicationId);

    return Response.json(
      apiSuccess({ message: "Değerlendirme yeniden başlatıldı." }),
    );
  } catch (err) {
    console.error("Değerlendirme retry hatası:", err);
    return apiError("Değerlendirme yeniden başlatılamadı.", 500);
  }
}
