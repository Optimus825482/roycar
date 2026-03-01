import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, safeBigInt } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/screening/:id — Kriter detayı
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const cid = safeBigInt(id);
    if (!cid) return apiError("Geçersiz kriter ID", 400);

    const criteria = await prisma.screeningCriteria.findUnique({
      where: { id: cid },
      include: {
        department: { select: { name: true } },
        formConfig: { select: { title: true } },
        results: {
          include: {
            application: { select: { fullName: true, applicationNo: true } },
          },
          orderBy: { screenedAt: "desc" },
          take: 50,
        },
      },
    });
    if (!criteria) return apiError("Kriter bulunamadı.", 404);
    return Response.json(apiSuccess(criteria));
  } catch (err) {
    console.error("Screening criteria get error:", err);
    return apiError("Kriter alınamadı.", 500);
  }
}

// PUT /api/admin/screening/:id — Kriter güncelle
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
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
      isActive,
    } = body;

    const uid = safeBigInt(id);
    if (!uid) return apiError("Geçersiz kriter ID", 400);

    const criteria = await prisma.screeningCriteria.update({
      where: { id: uid },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
        ...(departmentId !== undefined && {
          departmentId: departmentId ? BigInt(departmentId) : null,
        }),
        ...(formConfigId !== undefined && {
          formConfigId: formConfigId ? BigInt(formConfigId) : null,
        }),
        ...(criteriaRules !== undefined && { criteriaRules }),
        ...(passThreshold !== undefined && { passThreshold }),
        ...(useAiAssist !== undefined && { useAiAssist: !!useAiAssist }),
        ...(aiPrompt !== undefined && { aiPrompt: aiPrompt?.trim() || null }),
        ...(isActive !== undefined && { isActive: !!isActive }),
        updatedAt: new Date(),
      },
    });

    return Response.json(apiSuccess(criteria));
  } catch (err) {
    console.error("Screening criteria update error:", err);
    return apiError("Kriter güncellenemedi.", 500);
  }
}

// DELETE /api/admin/screening/:id — Kriter sil
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const did = safeBigInt(id);
    if (!did) return apiError("Geçersiz kriter ID", 400);

    await prisma.screeningCriteria.delete({ where: { id: did } });
    return Response.json(apiSuccess({ deleted: true }));
  } catch (err) {
    console.error("Screening criteria delete error:", err);
    return apiError("Kriter silinemedi.", 500);
  }
}
