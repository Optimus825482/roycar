import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

// GET — Grup detayı + üyeleri
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const group = await prisma.candidateGroup.findUnique({
      where: { id: BigInt(id) },
      include: {
        members: {
          orderBy: { addedAt: "desc" },
          include: {
            application: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                status: true,
                positionTitle: true,
                department: { select: { name: true } },
              },
            },
            evaluation: {
              select: {
                id: true,
                overallScore: true,
                status: true,
                report: true,
                customCriteria: true,
                evaluationLabel: true,
                evaluatedAt: true,
              },
            },
            evaluationSession: {
              select: { id: true, label: true, criteria: true },
            },
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Grup bulunamadı" },
        { status: 404 },
      );
    }

    const data = {
      id: group.id.toString(),
      name: group.name,
      description: group.description,
      createdAt: group.createdAt.toISOString(),
      members: group.members.map((m) => ({
        id: m.id.toString(),
        applicationId: m.applicationId.toString(),
        fullName: m.application.fullName,
        email: m.application.email,
        phone: m.application.phone,
        status: m.application.status,
        department:
          m.application.department?.name || m.application.positionTitle || "—",
        notes: m.notes,
        addedAt: m.addedAt.toISOString(),
        evaluation: m.evaluation
          ? {
              id: m.evaluation.id.toString(),
              overallScore: m.evaluation.overallScore,
              status: m.evaluation.status,
              report: m.evaluation.report,
              customCriteria: m.evaluation.customCriteria,
              evaluationLabel: m.evaluation.evaluationLabel,
              evaluatedAt: m.evaluation.evaluatedAt?.toISOString() || null,
            }
          : null,
        evaluationSession: m.evaluationSession
          ? {
              id: m.evaluationSession.id.toString(),
              label: m.evaluationSession.label,
              criteria: m.evaluationSession.criteria,
            }
          : null,
      })),
    };

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Candidate group detail error:", err);
    return NextResponse.json(
      { success: false, error: "Grup detayı yüklenemedi" },
      { status: 500 },
    );
  }
}

// PATCH — Grup güncelle
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const { name, description } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined)
      updateData.description = description?.trim() || null;

    const group = await prisma.candidateGroup.update({
      where: { id: BigInt(id) },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: group.id.toString(),
        name: group.name,
        description: group.description,
      },
    });
  } catch (err) {
    console.error("Candidate group update error:", err);
    return NextResponse.json(
      { success: false, error: "Grup güncellenemedi" },
      { status: 500 },
    );
  }
}

// DELETE — Grup sil
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await prisma.candidateGroup.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Candidate group delete error:", err);
    return NextResponse.json(
      { success: false, error: "Grup silinemedi" },
      { status: 500 },
    );
  }
}
