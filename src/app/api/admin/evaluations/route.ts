import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

// GET /api/admin/evaluations — Başvuruları değerlendirme durumuyla listele
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get("departmentId");
    const filter = searchParams.get("filter") || "all";

    // Base where for department filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deptWhere: any = departmentId
      ? { departmentId: BigInt(departmentId) }
      : {};

    // Stats — count via raw SQL for accuracy with 1:N evaluations
    const [totalCount, evaluatedCount, pendingEvalCount, failedCount] =
      await Promise.all([
        prisma.application.count({ where: deptWhere }),
        // Has at least one completed evaluation
        prisma.application.count({
          where: {
            ...deptWhere,
            evaluations: { some: { status: "completed" } },
          },
        }),
        // No evaluations at all, or only pending ones (no completed)
        prisma.application.count({
          where: {
            ...deptWhere,
            evaluations: { none: { status: "completed" } },
          },
        }),
        prisma.application.count({
          where: {
            ...deptWhere,
            evaluations: { some: { status: "failed" } },
            NOT: { evaluations: { some: { status: "completed" } } },
          },
        }),
      ]);

    // List where — applies filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listWhere: any = { ...deptWhere };
    switch (filter) {
      case "pending":
        listWhere.evaluations = { none: { status: "completed" } };
        break;
      case "completed":
        listWhere.evaluations = { some: { status: "completed" } };
        break;
      case "failed":
        listWhere.evaluations = { some: { status: "failed" } };
        listWhere.NOT = { evaluations: { some: { status: "completed" } } };
        break;
    }

    const applications = await prisma.application.findMany({
      where: listWhere,
      select: {
        id: true,
        applicationNo: true,
        fullName: true,
        email: true,
        phone: true,
        status: true,
        submittedAt: true,
        positionTitle: true,
        department: { select: { id: true, name: true } },
        evaluations: {
          select: {
            id: true,
            overallScore: true,
            status: true,
            report: true,
            customCriteria: true,
            evaluationLabel: true,
            evaluatedAt: true,
            retryCount: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    // Transform: add latest evaluation as `evaluation` for backward compat
    // and full history as `evaluations`
    const transformed = applications.map((app) => {
      const latest = app.evaluations[0] || null;
      return {
        ...app,
        evaluation: latest,
        evaluationHistory: app.evaluations,
        evaluationCount: app.evaluations.length,
      };
    });

    const serialized = JSON.parse(
      JSON.stringify(transformed, (_k, v) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    );

    return Response.json(
      apiSuccess({
        applications: serialized,
        stats: {
          total: totalCount,
          evaluated: evaluatedCount,
          pending: pendingEvalCount,
          failed: failedCount,
        },
      }),
    );
  } catch (err) {
    console.error("Evaluations list error:", err);
    return apiError("Değerlendirmeler alınamadı.", 500);
  }
}
