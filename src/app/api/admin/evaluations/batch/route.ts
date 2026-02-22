import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { triggerEvaluation } from "@/services/evaluation.service";

// POST /api/admin/evaluations/batch — Toplu AI değerlendirme başlat
export async function POST(req: NextRequest) {
  try {
    const { applicationIds, departmentId, onlyNew } = await req.json();

    let ids: bigint[] = [];

    if (
      applicationIds &&
      Array.isArray(applicationIds) &&
      applicationIds.length > 0
    ) {
      // Specific application IDs provided
      ids = applicationIds.map((id: string | number) => BigInt(id));
    } else {
      // Build filter query
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {};

      if (departmentId) {
        where.departmentId = BigInt(departmentId);
      }

      if (onlyNew) {
        // Only applications without any evaluation
        where.evaluation = null;
      } else {
        // Applications without evaluation OR with failed evaluation
        where.OR = [{ evaluation: null }, { evaluation: { status: "failed" } }];
      }

      const applications = await prisma.application.findMany({
        where,
        select: { id: true },
        orderBy: { submittedAt: "desc" },
        take: 200, // Batch limit
      });

      ids = applications.map((a) => a.id);
    }

    if (ids.length === 0) {
      return Response.json(
        apiSuccess({
          queued: 0,
          message: "Değerlendirilecek başvuru bulunamadı.",
        }),
      );
    }

    // Trigger evaluations (fire-and-forget, non-blocking)
    let queued = 0;
    for (const appId of ids) {
      triggerEvaluation(appId);
      queued++;
    }

    return Response.json(
      apiSuccess({
        queued,
        message: `${queued} başvuru değerlendirmeye alındı.`,
      }),
    );
  } catch (err) {
    console.error("Batch evaluation error:", err);
    return apiError("Toplu değerlendirme başlatılamadı.", 500);
  }
}
