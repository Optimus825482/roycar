import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/utils";

const VALID_STATUSES = ["new", "reviewed", "shortlisted", "rejected", "hired"];

// PATCH /api/admin/applications/:id/status — Durum güncelle
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { status } = await req.json();

    if (!status || !VALID_STATUSES.includes(status)) {
      return apiError(
        `Geçersiz durum. Geçerli değerler: ${VALID_STATUSES.join(", ")}`,
      );
    }

    const application = await prisma.application.update({
      where: { id: BigInt(id) },
      data: { status },
      select: { id: true, applicationNo: true, status: true },
    });

    const serialized = JSON.parse(
      JSON.stringify(application, (_k, v) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    );

    return Response.json({ success: true, data: serialized });
  } catch (err) {
    console.error("Durum güncelleme hatası:", err);
    return apiError("Durum güncellenemedi.", 500);
  }
}
