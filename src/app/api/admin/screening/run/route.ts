import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/utils";
import {
  evaluateScreening,
  runAutoScreening,
} from "@/services/screening.service";

// POST /api/admin/screening/run — Ön eleme çalıştır
export async function POST(req: NextRequest) {
  try {
    const { applicationId, criteriaId } = await req.json();

    if (!applicationId) return apiError("applicationId zorunludur.");

    // If criteriaId provided, run specific criteria; otherwise run all matching
    if (criteriaId) {
      const result = await evaluateScreening(
        BigInt(applicationId),
        BigInt(criteriaId),
      );
      return Response.json(apiSuccess(result));
    }

    const results = await runAutoScreening(BigInt(applicationId));
    return Response.json(apiSuccess(results));
  } catch (err) {
    console.error("Screening run error:", err);
    const message =
      err instanceof Error ? err.message : "Ön eleme çalıştırılamadı.";
    return apiError(message, 500);
  }
}
