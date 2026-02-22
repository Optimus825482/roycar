import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/admin/forms/:id/questions/reorder — Sıralama güncelle
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await params; // validate route
    const body = await req.json();
    const { orderedIds } = body as { orderedIds: string[] };

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return apiError("orderedIds dizisi gereklidir.");
    }

    // Batch update — her soru için yeni sortOrder
    await prisma.$transaction(
      orderedIds.map((qId, index) =>
        prisma.question.update({
          where: { id: BigInt(qId) },
          data: { sortOrder: index },
        }),
      ),
    );

    return Response.json(apiSuccess(null, "Sıralama güncellendi."));
  } catch (err) {
    console.error("Sıralama hatası:", err);
    return apiError("Sıralama güncellenemedi.", 500);
  }
}
