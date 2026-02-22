import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

// GET /api/apply/active-form — Yayınlanmış aktif formu getir (formConfigId bilmeden)
export async function GET() {
  try {
    const form = await prisma.formConfig.findFirst({
      where: { isPublished: true, isActive: true },
      include: {
        questions: {
          orderBy: { sortOrder: "asc" },
          include: { images: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });

    if (!form) return apiError("Aktif yayınlanmış form bulunamadı.", 404);

    const questionIds = form.questions.map((q) => q.id);
    const branchingRules = await prisma.branchingRule.findMany({
      where: { sourceQuestionId: { in: questionIds } },
      orderBy: { priority: "asc" },
    });

    return Response.json(apiSuccess({ ...form, branchingRules }));
  } catch (err) {
    console.error("Aktif form yükleme hatası:", err);
    return apiError("Form yüklenemedi.", 500);
  }
}
