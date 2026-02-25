import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

// PUT /api/admin/org-chart/settings — Sayfa ayarlarını güncelle
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const updates: { key: string; value: string }[] = body.settings;

    if (!Array.isArray(updates)) {
      return apiError("settings dizisi gereklidir.");
    }

    for (const { key, value } of updates) {
      await prisma.systemSetting.upsert({
        where: { key: `org_chart_${key}` },
        update: { value },
        create: { key: `org_chart_${key}`, value },
      });
    }

    return Response.json(apiSuccess(null, "Ayarlar güncellendi."));
  } catch (err) {
    console.error("Org chart ayar güncelleme hatası:", err);
    return apiError("Ayarlar güncellenemedi.", 500);
  }
}
