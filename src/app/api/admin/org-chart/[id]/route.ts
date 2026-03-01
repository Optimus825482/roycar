import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, safeBigInt } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

// PUT /api/admin/org-chart/:id — Pozisyon güncelle
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      title,
      titleEn,
      description,
      category,
      level,
      parentId,
      authorityScore,
      guestInteraction,
      teamSize,
      skills,
      sortOrder,
      isActive,
    } = body;

    const pid = safeBigInt(id);
    if (!pid) return apiError("Geçersiz pozisyon ID", 400);

    const position = await prisma.orgPosition.update({
      where: { id: pid },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(titleEn !== undefined && { titleEn: titleEn?.trim() || null }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
        ...(category !== undefined && { category }),
        ...(level !== undefined && { level }),
        ...(parentId !== undefined && {
          parentId: parentId ? BigInt(parentId) : null,
        }),
        ...(authorityScore !== undefined && { authorityScore }),
        ...(guestInteraction !== undefined && { guestInteraction }),
        ...(teamSize !== undefined && { teamSize }),
        ...(skills !== undefined && { skills }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return Response.json(apiSuccess(position));
  } catch (err) {
    console.error("Pozisyon güncelleme hatası:", err);
    return apiError("Pozisyon güncellenemedi.", 500);
  }
}

// DELETE /api/admin/org-chart/:id — Pozisyon sil
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const did = safeBigInt(id);
    if (!did) return apiError("Geçersiz pozisyon ID", 400);

    await prisma.orgPosition.delete({ where: { id: did } });
    return Response.json(apiSuccess(null, "Pozisyon silindi."));
  } catch (err) {
    console.error("Pozisyon silme hatası:", err);
    return apiError("Pozisyon silinemedi.", 500);
  }
}
