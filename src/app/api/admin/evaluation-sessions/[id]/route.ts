import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, safeBigInt } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string }> };

// ─── GET — Oturum detayı + değerlendirmeler + istatistikler ───

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const sessionId = safeBigInt(id);
    if (!sessionId) return apiError("Geçersiz oturum ID", 400);

    const session = await prisma.evaluationSession.findUnique({
      where: { id: sessionId },
      include: {
        createdBy: { select: { id: true, fullName: true, username: true } },
        _count: { select: { evaluations: true } },
        evaluations: {
          orderBy: { createdAt: "desc" },
          include: {
            application: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                applicationNo: true,
                positionTitle: true,
                department: { select: { name: true } },
                submittedAt: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!session) return apiError("Oturum bulunamadı", 404);

    // İstatistikler
    const completed = session.evaluations.filter(
      (e) => e.status === "completed",
    );
    const pending = session.evaluations.filter((e) => e.status === "pending");
    const failed = session.evaluations.filter((e) => e.status === "failed");

    const avgScore =
      completed.length > 0
        ? Math.round(
            completed.reduce((s, e) => s + e.overallScore, 0) /
              completed.length,
          )
        : 0;

    // Öneri dağılımı (recommendation breakdown)
    const recommendations = {
      shortlist: 0,
      interview: 0,
      consider: 0,
      reject: 0,
    };
    for (const e of completed) {
      const report = e.report as Record<string, unknown> | null;
      const rec = (report?.recommendation as string)?.toLowerCase() ?? "";
      if (rec in recommendations) {
        recommendations[rec as keyof typeof recommendations]++;
      }
    }

    const data = {
      id: session.id.toString(),
      label: session.label,
      description: session.description,
      criteria: session.criteria,
      status: session.status,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      createdBy: session.createdBy
        ? {
            id: session.createdBy.id.toString(),
            fullName: session.createdBy.fullName,
            username: session.createdBy.username,
          }
        : null,
      stats: {
        total: session._count.evaluations,
        completed: completed.length,
        pending: pending.length,
        failed: failed.length,
        avgScore,
      },
      recommendations,
      evaluations: session.evaluations.map((e) => ({
        id: e.id.toString(),
        applicationId: e.applicationId.toString(),
        fullName: e.application.fullName,
        email: e.application.email,
        phone: e.application.phone,
        applicationNo: e.application.applicationNo,
        positionTitle: e.application.positionTitle,
        department: e.application.department?.name ?? "—",
        submittedAt: e.application.submittedAt.toISOString(),
        applicationStatus: e.application.status,
        overallScore: e.overallScore,
        status: e.status,
        report: e.report,
        customCriteria: e.customCriteria,
        evaluationLabel: e.evaluationLabel,
        evaluatedAt: e.evaluatedAt?.toISOString() ?? null,
        createdAt: e.createdAt.toISOString(),
        retryCount: e.retryCount,
        createdById: e.createdById?.toString() ?? null,
      })),
    };

    return Response.json(apiSuccess(data));
  } catch (err) {
    console.error("Evaluation session detail error:", err);
    return apiError("Oturum detayı yüklenemedi", 500);
  }
}

// ─── PUT — Oturum güncelle ───

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const { label, description, criteria, status } = body;

    const updateData: Record<string, unknown> = {};
    if (label !== undefined) updateData.label = label;
    if (description !== undefined) updateData.description = description;
    if (criteria !== undefined) updateData.criteria = criteria;
    if (status !== undefined) updateData.status = status;

    const sid = safeBigInt(id);
    if (!sid) return apiError("Geçersiz oturum ID", 400);

    const session = await prisma.evaluationSession.update({
      where: { id: sid },
      data: updateData,
    });

    return Response.json(
      apiSuccess({
        id: session.id.toString(),
        label: session.label,
        description: session.description,
        criteria: session.criteria,
        status: session.status,
        updatedAt: session.updatedAt.toISOString(),
      }),
    );
  } catch (err) {
    console.error("Evaluation session update error:", err);
    return apiError("Oturum güncellenemedi", 500);
  }
}

// ─── DELETE — Oturum ve tüm değerlendirmelerini sil ───

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const sessionId = safeBigInt(id);
    if (!sessionId) return apiError("Geçersiz oturum ID", 400);

    // Önce oturumun var olduğunu kontrol et
    const session = await prisma.evaluationSession.findUnique({
      where: { id: sessionId },
      select: { id: true, _count: { select: { evaluations: true } } },
    });

    if (!session) return apiError("Oturum bulunamadı", 404);

    const evalCount = session._count.evaluations;

    // Transaction ile: önce evaluation'ları sil, sonra oturumu sil
    await prisma.$transaction(async (tx) => {
      // Grup üyeliklerindeki session referanslarını temizle
      await tx.candidateGroupMember.updateMany({
        where: { evaluationSessionId: sessionId },
        data: { evaluationSessionId: null },
      });

      // Oturuma ait tüm değerlendirmeleri sil
      if (evalCount > 0) {
        await tx.evaluation.deleteMany({
          where: { sessionId },
        });
      }

      // Oturumu sil
      await tx.evaluationSession.delete({ where: { id: sessionId } });
    });

    return Response.json(
      apiSuccess({
        deleted: true,
        deletedEvaluations: evalCount,
      }),
    );
  } catch (err) {
    console.error("Evaluation session delete error:", err);
    return apiError("Oturum silinemedi", 500);
  }
}
