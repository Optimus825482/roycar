import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

type Params = { params: Promise<{ id: string; ruleId: string }> };

// PUT — Kural güncelle
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { ruleId } = await params;
    const body = await req.json();

    const rule = await prisma.branchingRule.update({
      where: { id: BigInt(ruleId) },
      data: {
        ...(body.sourceQuestionId && {
          sourceQuestionId: BigInt(body.sourceQuestionId),
        }),
        ...(body.targetQuestionId && {
          targetQuestionId: BigInt(body.targetQuestionId),
        }),
        ...(body.conditionLogic && { conditionLogic: body.conditionLogic }),
        ...(body.conditions && { conditions: body.conditions }),
        ...(body.priority !== undefined && { priority: body.priority }),
      },
    });

    return Response.json(apiSuccess(rule));
  } catch (err) {
    console.error("Kural güncelleme hatası:", err);
    return apiError("Kural güncellenemedi.", 500);
  }
}

// DELETE — Kural sil
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { ruleId } = await params;
    await prisma.branchingRule.delete({ where: { id: BigInt(ruleId) } });
    return Response.json(apiSuccess(null, "Kural silindi."));
  } catch (err) {
    console.error("Kural silme hatası:", err);
    return apiError("Kural silinemedi.", 500);
  }
}
