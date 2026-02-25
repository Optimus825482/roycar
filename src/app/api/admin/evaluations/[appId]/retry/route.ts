import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { triggerEvaluation } from "@/services/evaluation.service";

type Params = { params: Promise<{ appId: string }> };

// POST /api/admin/evaluations/:appId/retry — Yeni değerlendirme başlat
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { appId } = await params;
    const applicationId = BigInt(appId);

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return apiError("Başvuru bulunamadı.", 404);
    }

    // Body'den opsiyonel sessionId al
    let sessionId: bigint | undefined;
    try {
      const body = await req.json();
      if (body.sessionId) sessionId = BigInt(body.sessionId);
    } catch {
      // Body boş olabilir, sorun değil
    }

    // Yeni değerlendirme kaydı oluşturulacak (triggerEvaluation içinde)
    triggerEvaluation(applicationId, undefined, sessionId);

    return Response.json(
      apiSuccess({ message: "Yeni değerlendirme başlatıldı." }),
    );
  } catch (err) {
    console.error("Değerlendirme retry hatası:", err);
    return apiError("Değerlendirme yeniden başlatılamadı.", 500);
  }
}
