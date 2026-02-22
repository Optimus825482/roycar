import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

type Params = { params: Promise<{ formConfigId: string }> };

// GET /api/apply/form/:formConfigId — Aktif form yapılandırmasını getir
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { formConfigId } = await params;

    const form = await prisma.formConfig.findFirst({
      where: {
        id: BigInt(formConfigId),
        isPublished: true,
        isActive: true,
      },
      include: {
        questions: {
          orderBy: { sortOrder: "asc" },
          include: { images: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });

    if (!form) return apiError("Aktif form bulunamadı.", 404);

    // Dallanma kurallarını çek
    const questionIds = form.questions.map((q) => q.id);
    const branchingRules = await prisma.branchingRule.findMany({
      where: { sourceQuestionId: { in: questionIds } },
      orderBy: { priority: "asc" },
    });

    return Response.json(apiSuccess({ ...form, branchingRules }));
  } catch (err) {
    console.error("Form yükleme hatası:", err);
    return apiError("Form yüklenemedi.", 500);
  }
}
