import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, safeBigInt } from "@/lib/utils";

type Params = { params: Promise<{ id: string; qId: string }> };

// PUT /api/admin/forms/:id/questions/:qId — Soru güncelle
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { qId } = await params;
    const questionId = safeBigInt(qId);
    if (!questionId) return apiError("Geçersiz soru ID", 400);
    const body = await req.json();

    const question = await prisma.question.update({
      where: { id: questionId },
      data: {
        ...(body.questionText !== undefined && {
          questionText: body.questionText,
        }),
        ...(body.questionType !== undefined && {
          questionType: body.questionType,
        }),
        ...(body.isRequired !== undefined && { isRequired: body.isRequired }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.groupLabel !== undefined && {
          groupLabel: body.groupLabel || null,
        }),
        ...(body.options !== undefined && { options: body.options }),
        ...(body.validation !== undefined && { validation: body.validation }),
        ...(body.metadata !== undefined && { metadata: body.metadata }),
      },
      include: { images: true },
    });

    return Response.json(apiSuccess(question));
  } catch (err) {
    console.error("Soru güncelleme hatası:", err);
    return apiError("Soru güncellenemedi.", 500);
  }
}

// DELETE /api/admin/forms/:id/questions/:qId — Soru sil
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { qId } = await params;
    const questionId = safeBigInt(qId);
    if (!questionId) return apiError("Geçersiz soru ID", 400);
    await prisma.question.delete({ where: { id: questionId } });
    return Response.json(apiSuccess(null, "Soru silindi."));
  } catch (err) {
    console.error("Soru silme hatası:", err);
    return apiError("Soru silinemedi.", 500);
  }
}
