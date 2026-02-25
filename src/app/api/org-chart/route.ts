import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

// GET /api/org-chart — Public: Pozisyonlar (hiyerarşik) + sayfa ayarları
export async function GET() {
  try {
    const [positions, settings] = await Promise.all([
      prisma.orgPosition.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.systemSetting.findMany({
        where: { key: { startsWith: "org_chart_" } },
      }),
    ]);

    // Settings'i key-value map'e çevir
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key.replace("org_chart_", "")] = s.value;
    }

    // Hiyerarşik tree oluştur
    type PositionNode = (typeof positions)[0] & { children: PositionNode[] };
    const map = new Map<bigint, PositionNode>();
    const roots: PositionNode[] = [];

    for (const p of positions) {
      map.set(p.id, { ...p, children: [] });
    }
    for (const p of positions) {
      const node = map.get(p.id)!;
      if (p.parentId && map.has(p.parentId)) {
        map.get(p.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return Response.json(
      apiSuccess({
        settings: settingsMap,
        tree: roots,
        flat: positions,
      }),
    );
  } catch (err) {
    console.error("Org chart hatası:", err);
    return apiError("Organizasyon verileri alınamadı.", 500);
  }
}
