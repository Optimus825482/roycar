import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, safeBigInt } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

// POST /api/admin/forms/:id/questions — Soru ekle
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const formId = safeBigInt(id);
    if (!formId) return apiError("Geçersiz form ID", 400);
    const body = await req.json();

    // Ad, e-posta, telefon soruları engelle — bunlar başvuru formunda otomatik alınıyor
    const blockedPatterns = [
      /\b(ad\s*soyad|adınız|isim|isminiz|full\s*name|name)\b/i,
      /\b(e-?posta|email|mail\s*adres)/i,
      /\b(telefon|phone|cep\s*tel|gsm)\b/i,
    ];
    const qText = (body.questionText || "").trim();
    if (blockedPatterns.some((p) => p.test(qText))) {
      return apiError(
        "Ad, e-posta ve telefon bilgileri başvuru formunda otomatik olarak alınmaktadır. Bu bilgileri soru olarak eklemenize gerek yoktur.",
        400,
      );
    }

    // Mevcut en yüksek sortOrder'ı bul
    const lastQuestion = await prisma.question.findFirst({
      where: { formConfigId: formId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const nextOrder = (lastQuestion?.sortOrder ?? -1) + 1;

    const question = await prisma.question.create({
      data: {
        formConfigId: formId,
        questionText: body.questionText,
        questionType: body.questionType || "text",
        isRequired: body.isRequired ?? true,
        sortOrder: body.sortOrder ?? nextOrder,
        groupLabel: body.groupLabel || null,
        options: body.options || null,
        validation: body.validation || null,
        metadata: body.metadata || null,
      },
      include: { images: true },
    });

    return Response.json(apiSuccess(question), { status: 201 });
  } catch (err) {
    console.error("Soru ekleme hatası:", err);
    return apiError("Soru eklenemedi.", 500);
  }
}
