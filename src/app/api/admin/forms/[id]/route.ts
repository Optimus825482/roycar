import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, safeBigInt } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/forms/:id — Form detayı (sorular + kurallar)
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const formId = safeBigInt(id);
    if (!formId) return apiError("Geçersiz form ID", 400);

    const form = await prisma.formConfig.findUnique({
      where: { id: formId },
      include: {
        questions: {
          orderBy: { sortOrder: "asc" },
          include: { images: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });

    if (!form) return apiError("Form bulunamadı.", 404);

    const questionIds = form.questions.map((q) => q.id);
    const rules = await prisma.branchingRule.findMany({
      where: { sourceQuestionId: { in: questionIds } },
      orderBy: { priority: "asc" },
    });

    return Response.json(apiSuccess({ ...form, branchingRules: rules }));
  } catch (err) {
    console.error("Form detay hatası:", err);
    return apiError("Form detayı alınamadı.", 500);
  }
}

// PUT /api/admin/forms/:id — Form güncelle
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, mode } = body;

    const fid = safeBigInt(id);
    if (!fid) return apiError("Geçersiz form ID", 400);

    const form = await prisma.formConfig.update({
      where: { id: fid },
      data: {
        ...(title && { title: title.trim() }),
        ...(mode && { mode }),
      },
    });

    return Response.json(apiSuccess(form));
  } catch (err) {
    console.error("Form güncelleme hatası:", err);
    return apiError("Form güncellenemedi.", 500);
  }
}

// DELETE /api/admin/forms/:id — Form sil
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const did = safeBigInt(id);
    if (!did) return apiError("Geçersiz form ID", 400);

    await prisma.formConfig.delete({ where: { id: did } });
    return Response.json(apiSuccess(null, "Form silindi."));
  } catch (err) {
    console.error("Form silme hatası:", err);
    return apiError("Form silinemedi.", 500);
  }
}
