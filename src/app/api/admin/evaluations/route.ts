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

    // Stats — always from full dataset (no filter)
    const [totalCount, evaluatedCount, pendingEvalCount, failedCount] =
      await Promise.all([
        prisma.application.count({ where: deptWhere }),
        prisma.application.count({
          where: { ...deptWhere, evaluation: { status: "completed" } },
        }),
        prisma.application.count({
          where: {
            ...deptWhere,
            OR: [{ evaluation: null }, { evaluation: { status: "pending" } }],
          },
        }),
        prisma.application.count({
          where: { ...deptWhere, evaluation: { status: "failed" } },
        }),
      ]);

    // List where — applies filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listWhere: any = { ...deptWhere };
    switch (filter) {
      case "pending":
        listWhere.OR = [
          { evaluation: null },
          { evaluation: { status: "pending" } },
        ];
        break;
      case "completed":
        listWhere.evaluation = { status: "completed" };
        break;
      case "failed":
        listWhere.evaluation = { status: "failed" };
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
        department: { select: { id: true, name: true } },
        evaluation: {
          select: {
            id: true,
            overallScore: true,
            status: true,
            report: true,
            evaluatedAt: true,
            retryCount: true,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    const serialized = JSON.parse(
      JSON.stringify(applications, (_k, v) =>
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
