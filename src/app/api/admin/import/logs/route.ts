import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/utils";
import { requirePermission } from "@/lib/auth-helpers";

// GET /api/admin/import/logs — Aktarım geçmişi
export async function GET() {
  try {
    const authResult = await requirePermission("data_import");
    if (!authResult.ok) return authResult.response;

    const logs = await prisma.importLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const serialized = JSON.parse(
      JSON.stringify(logs, (_k, v) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    );

    return Response.json({ success: true, data: serialized });
  } catch (err) {
    console.error("Import logs error:", err);
    return apiError("Aktarım geçmişi alınamadı.", 500);
  }
}
