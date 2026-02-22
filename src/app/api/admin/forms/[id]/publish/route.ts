import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/admin/forms/:id/publish — Yayınla/geri çek
export async function PATCH(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const form = await prisma.formConfig.findUnique({
      where: { id: BigInt(id) },
    });

    if (!form) return apiError("Form bulunamadı.", 404);

    // Yayınlanıyorsa, diğer formları geri çek
    if (!form.isPublished) {
      await prisma.formConfig.updateMany({
        where: { isPublished: true, id: { not: BigInt(id) } },
        data: { isPublished: false },
      });
    }

    const updated = await prisma.formConfig.update({
      where: { id: BigInt(id) },
      data: { isPublished: !form.isPublished },
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
