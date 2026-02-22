import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

type Params = { params: Promise<{ appId: string }> };

// GET /api/admin/evaluations/:appId — Değerlendirme detayı
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { appId } = await params;

    const evaluation = await prisma.evaluation.findUnique({
      where: { applicationId: BigInt(appId) },
    });

    if (!evaluation) {
      return apiError("Değerlendirme bulunamadı.", 404);
    }

    const serialized = JSON.parse(
      JSON.stringify(evaluation, (_k, v) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    );

    return Response.json(apiSuccess(serialized));
  } catch (err) {
    console.error("Değerlendirme detay hatası:", err);
    return apiError("Değerlendirme alınamadı.", 500);
  }
}
