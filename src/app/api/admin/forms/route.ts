import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

// GET /api/admin/forms — Form listesi
export async function GET() {
  try {
    const forms = await prisma.formConfig.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { questions: true, applications: true } },
      },
    });
    return Response.json(apiSuccess(forms));
  } catch (err) {
    console.error("Form listesi hatası:", err);
    return apiError("Form listesi alınamadı.", 500);
  }
}

// POST /api/admin/forms — Yeni form oluştur
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, mode } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return apiError("Form başlığı gereklidir.");
    }

    const form = await prisma.formConfig.create({
      data: {
        title: title.trim(),
        mode: mode === "dynamic" ? "dynamic" : "static",
      },
    });

    return Response.json(apiSuccess(form), { status: 201 });
  } catch (err) {
    console.error("Form oluşturma hatası:", err);
    return apiError("Form oluşturulamadı.", 500);
  }
}
