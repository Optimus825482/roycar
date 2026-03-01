import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

// GET /api/admin/org-chart/defaults?category=X&level=Y  veya  ?templateId=Z
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const templateId = searchParams.get("templateId");
    const category = searchParams.get("category");
    const level = searchParams.get("level");

    // Tek template getir
    if (templateId) {
      const template = await prisma.positionTemplate.findUnique({
        where: { id: BigInt(templateId) },
      });
      return Response.json(apiSuccess(template));
    }

    // Kategori+seviye bazlı default getir
    if (category && level) {
      const defaults = await prisma.positionDefault.findUnique({
        where: {
          category_level: {
            category,
            level: parseInt(level),
          },
        },
      });
      return Response.json(apiSuccess(defaults));
    }

    // Tüm template'leri döndür (select menüsü için — hiyerarşik sıralama)
    const templates = await prisma.positionTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { level: "asc" }, { sortOrder: "asc" }],
    });
    return Response.json(apiSuccess(templates));
  } catch (err) {
    console.error("Position defaults/templates hatası:", err);
    return apiError("Veriler alınamadı.", 500);
  }
}
