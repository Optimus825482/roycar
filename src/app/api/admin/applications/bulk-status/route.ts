import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, safeBigInt } from "@/lib/utils";
import { requireAuth } from "@/lib/auth-helpers";

const VALID_STATUSES = ["new", "reviewed", "shortlisted", "rejected", "hired"];

// PATCH /api/admin/applications/bulk-status — Toplu durum güncelle
export async function PATCH(req: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.ok) return authResult.response;

    const body = await req.json();
    const { applicationIds, status } = body as {
      applicationIds?: string[];
      status?: string;
    };

    if (
      !Array.isArray(applicationIds) ||
      applicationIds.length === 0 ||
      !status ||
      !VALID_STATUSES.includes(status)
    ) {
      return apiError(
        `Geçersiz istek. applicationIds (dizi) ve status (${VALID_STATUSES.join(", ")}) gerekli.`,
        400,
      );
    }

    const ids = applicationIds
      .map((id) => safeBigInt(id))
      .filter((id): id is bigint => id != null);

    if (ids.length === 0) return apiError("Geçerli başvuru ID bulunamadı.", 400);

    const result = await prisma.application.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });

    return Response.json({
      success: true,
      data: { updated: result.count },
    });
  } catch (err) {
    console.error("Toplu durum güncelleme hatası:", err);
    return apiError("Toplu durum güncellenemedi.", 500);
  }
}
