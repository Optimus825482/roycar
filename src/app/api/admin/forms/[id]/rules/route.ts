import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

// POST /api/admin/forms/:id/rules — Kural ekle
export async function POST(req: NextRequest, { params }: Params) {
  try {
    await params;
    const body = await req.json();

    if (!body.sourceQuestionId || !body.targetQuestionId || !body.conditions) {
      return apiError(
        "sourceQuestionId, targetQuestionId ve conditions gereklidir.",
      );
    }

    const rule = await prisma.branchingRule.create({
      data: {
        sourceQuestionId: BigInt(body.sourceQuestionId),
        targetQuestionId: BigInt(body.targetQuestionId),
        conditionLogic: body.conditionLogic || "AND",
        conditions: body.conditions,
        priority: body.priority ?? 0,
      },
    });

    return Response.json(apiSuccess(rule), { status: 201 });
  } catch (err) {
    console.error("Kural ekleme hatası:", err);
    return apiError("Kural eklenemedi.", 500);
  }
}
