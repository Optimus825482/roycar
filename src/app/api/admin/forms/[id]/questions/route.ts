import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

// POST /api/admin/forms/:id/questions — Soru ekle
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const formId = BigInt(id);
    const body = await req.json();

    // Mevcut en yüksek sortOrder'ı bul
    const lastQuestion = await prisma.question.findFirst({
      where: { formConfigId: formId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const nextOrder = (lastQuestion?.sortOrder ?? -1) + 1;

    const question = await prisma.question.create({
      data: {
        formConfigId: formId,
        questionText: body.questionText,
        questionType: body.questionType || "text",
        isRequired: body.isRequired ?? true,
        sortOrder: body.sortOrder ?? nextOrder,
        groupLabel: body.groupLabel || null,
        options: body.options || null,
        validation: body.validation || null,
        metadata: body.metadata || null,
      },
      include: { images: true },
    });

    return Response.json(apiSuccess(question), { status: 201 });
  } catch (err) {
    console.error("Soru ekleme hatası:", err);
    return apiError("Soru eklenemedi.", 500);
  }
}
