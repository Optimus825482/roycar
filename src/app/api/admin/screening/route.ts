import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

// GET /api/admin/screening — Kriter listesi
export async function GET() {
  try {
    const criteria = await prisma.screeningCriteria.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        department: { select: { name: true } },
        formConfig: { select: { title: true } },
        _count: { select: { results: true } },
      },
    });
    return Response.json(apiSuccess(criteria));
  } catch (err) {
    console.error("Screening criteria list error:", err);
    return apiError("Kriterler alınamadı.", 500);
  }
}

// POST /api/admin/screening — Yeni kriter oluştur
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      description,
      departmentId,
      formConfigId,
      criteriaRules,
      passThreshold,
      useAiAssist,
      aiPrompt,
    } = body;

    if (!name?.trim()) return apiError("Kriter adı zorunludur.");

    const criteria = await prisma.screeningCriteria.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        departmentId: departmentId ? BigInt(departmentId) : null,
        formConfigId: formConfigId ? BigInt(formConfigId) : null,
        criteriaRules: criteriaRules || [],
        passThreshold: passThreshold ?? 60,
        useAiAssist: !!useAiAssist,
        aiPrompt: aiPrompt?.trim() || null,
      },
    });

    return Response.json(apiSuccess(criteria), { status: 201 });
  } catch (err) {
    console.error("Screening criteria create error:", err);
    return apiError("Kriter oluşturulamadı.", 500);
  }
}
