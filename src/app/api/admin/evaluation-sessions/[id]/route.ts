import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

// GET — Oturum detayı + değerlendirmeleri
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const session = await prisma.evaluationSession.findUnique({
      where: { id: BigInt(id) },
      include: {
        evaluations: {
          orderBy: { createdAt: "desc" },
          include: {
            application: {
              select: {
                id: true,
                fullName: true,
                email: true,
                department: { select: { name: true } },
                positionTitle: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Oturum bulunamadı" },
        { status: 404 },
      );
    }

    const data = {
      id: session.id.toString(),
      label: session.label,
      description: session.description,
      criteria: session.criteria,
      status: session.status,
      createdAt: session.createdAt.toISOString(),
      evaluations: session.evaluations.map((e) => ({
        id: e.id.toString(),
        applicationId: e.applicationId.toString(),
        fullName: e.application.fullName,
        email: e.application.email,
        department:
          e.application.department?.name || e.application.positionTitle || "—",
        overallScore: e.overallScore,
        status: e.status,
        report: e.report,
        evaluatedAt: e.evaluatedAt?.toISOString() || null,
      })),
    };

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Evaluation session detail error:", err);
    return NextResponse.json(
      { success: false, error: "Oturum detayı yüklenemedi" },
      { status: 500 },
    );
  }
}

// PATCH — Oturum güncelle (status, label)
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const { label, description, status } = body;

    const updateData: Record<string, unknown> = {};
    if (label !== undefined) updateData.label = label;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;

    const session = await prisma.evaluationSession.update({
      where: { id: BigInt(id) },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: session.id.toString(),
        label: session.label,
        status: session.status,
      },
    });
  } catch (err) {
    console.error("Evaluation session update error:", err);
    return NextResponse.json(
      { success: false, error: "Oturum güncellenemedi" },
      { status: 500 },
    );
  }
}
