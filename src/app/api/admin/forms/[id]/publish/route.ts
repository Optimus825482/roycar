import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, safeBigInt } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/admin/forms/:id/publish — Yayınla/geri çek
export async function PATCH(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const formId = safeBigInt(id);
    if (!formId) return apiError("Geçersiz form ID", 400);

    const form = await prisma.formConfig.findUnique({
      where: { id: formId },
    });

    if (!form) return apiError("Form bulunamadı.", 404);

    // Atomic transaction to prevent race condition
    const updated = await prisma.$transaction(async (tx) => {
      // Yayınlanıyorsa, diğer formları geri çek
      if (!form.isPublished) {
        await tx.formConfig.updateMany({
          where: { isPublished: true, id: { not: formId } },
          data: { isPublished: false },
        });
      }
      return tx.formConfig.update({
        where: { id: formId },
        data: { isPublished: !form.isPublished },
      });
    });

    return Response.json(
      apiSuccess(
        updated,
        updated.isPublished ? "Form yayınlandı." : "Form geri çekildi.",
      ),
    );
  } catch (err) {
    console.error("Form yayınlama hatası:", err);
    return apiError("Form yayınlanamadı.", 500);
  }
}
