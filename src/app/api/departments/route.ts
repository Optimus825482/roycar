import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

// GET /api/departments — Departman listesi
export async function GET() {
  try {
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return Response.json(apiSuccess(departments));
  } catch (err) {
    console.error("Departman listesi hatası:", err);
    return apiError("Departman listesi alınamadı.", 500);
  }
}
