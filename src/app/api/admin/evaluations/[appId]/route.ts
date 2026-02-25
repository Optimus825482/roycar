import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

type Params = { params: Promise<{ appId: string }> };

// GET /api/admin/evaluations/:appId — Değerlendirme geçmişi
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { appId } = await params;

    const evaluations = await prisma.evaluation.findMany({
      where: { applicationId: BigInt(appId) },
      orderBy: { createdAt: "desc" },
    });

    if (evaluations.length === 0) {
      return apiError("Değerlendirme bulunamadı.", 404);
    }

    const serialized = JSON.parse(
      JSON.stringify(evaluations, (_k, v) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    );

    return Response.json(
      apiSuccess({
        latest: serialized[0],
        history: serialized,
        totalEvaluations: serialized.length,
      }),
    );
  } catch (err) {
    console.error("Değerlendirme detay hatası:", err);
    return apiError("Değerlendirme alınamadı.", 500);
  }
}
