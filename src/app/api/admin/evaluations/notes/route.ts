import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeBigInt } from "@/lib/utils";

// PATCH: Update manual note and/or final decision for one or more evaluations
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { evaluationIds, manualNote, finalDecision } = body as {
      evaluationIds: string[];
      manualNote?: string | null;
      finalDecision?: string | null;
    };

    if (
      !evaluationIds ||
      !Array.isArray(evaluationIds) ||
      evaluationIds.length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "evaluationIds required" },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (manualNote !== undefined) updateData.manualNote = manualNote || null;
    if (finalDecision !== undefined)
      updateData.finalDecision = finalDecision || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "Nothing to update" },
        { status: 400 },
      );
    }

    const ids = evaluationIds.map((id) => safeBigInt(id));
    if (ids.some((id) => id === null)) {
      return NextResponse.json(
        { success: false, error: "Geçersiz değerlendirme ID formatı" },
        { status: 400 },
      );
    }

    const result = await prisma.evaluation.updateMany({
      where: { id: { in: ids as bigint[] } },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: { updated: result.count },
    });
  } catch (error) {
    console.error("PATCH /api/admin/evaluations/notes error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
