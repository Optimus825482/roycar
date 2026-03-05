import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/utils";
import { requirePermission } from "@/lib/auth-helpers";

// GET /api/admin/import/field-definitions — Tüm dinamik alan tanımlarını listele
export async function GET() {
  try {
    const authResult = await requirePermission("data_import");
    if (!authResult.ok) return authResult.response;

    const definitions = await prisma.importFieldDefinition.findMany({
      where: { isActive: true },
      orderBy: [{ fieldCategory: "asc" }, { usageCount: "desc" }],
    });

    const serialized = JSON.parse(
      JSON.stringify(definitions, (_k, v) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    );

    return Response.json({ success: true, data: serialized });
  } catch (err) {
    console.error("Field definitions hatası:", err);
    return apiError("Alan tanımları alınamadı.", 500);
  }
}
