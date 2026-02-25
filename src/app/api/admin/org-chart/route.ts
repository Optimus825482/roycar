import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

// GET /api/admin/org-chart — Tüm pozisyonlar (admin)
export async function GET() {
  try {
    const positions = await prisma.orgPosition.findMany({
      orderBy: { sortOrder: "asc" },
    });
    return Response.json(apiSuccess(positions));
  } catch (err) {
    console.error("Org chart listesi hatası:", err);
    return apiError("Pozisyonlar alınamadı.", 500);
  }
}

// POST /api/admin/org-chart — Yeni pozisyon
export async function POST(req: NextRequest) {
  try {
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
    } = body;

    if (!title || typeof title !== "string") {
      return apiError("Pozisyon başlığı gereklidir.");
    }

    const position = await prisma.orgPosition.create({
      data: {
        title: title.trim(),
        titleEn: titleEn?.trim() || null,
        description: description?.trim() || null,
        category: category || "kitchen",
        level: level || 3,
        parentId: parentId ? BigInt(parentId) : null,
        authorityScore: authorityScore || 0,
        guestInteraction: guestInteraction || 0,
        teamSize: teamSize || 1,
        skills: skills || null,
        sortOrder: sortOrder || 0,
      },
    });

    return Response.json(apiSuccess(position), { status: 201 });
  } catch (err) {
    console.error("Pozisyon oluşturma hatası:", err);
    return apiError("Pozisyon oluşturulamadı.", 500);
  }
}
