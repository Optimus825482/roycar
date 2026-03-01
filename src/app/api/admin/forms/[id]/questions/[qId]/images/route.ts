import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, safeBigInt } from "@/lib/utils";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

type Params = { params: Promise<{ id: string; qId: string }> };

// POST /api/admin/forms/:id/questions/:qId/images — Görsel yükle
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { qId } = await params;
    const questionId = safeBigInt(qId);
    if (!questionId) return apiError("Geçersiz soru ID", 400);
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return apiError("Dosya gereklidir.");

    // Tip kontrolü
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return apiError("Sadece JPEG, PNG ve WebP dosyaları kabul edilir.");
    }

    // Boyut kontrolü (2MB)
    if (file.size > 2 * 1024 * 1024) {
      return apiError("Dosya boyutu en fazla 2MB olabilir.");
    }

    // Dosyayı kaydet
    const uploadDir = path.join(process.cwd(), "uploads", "question-images");
    await mkdir(uploadDir, { recursive: true });

    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return apiError(
        "Geçersiz dosya uzantısı. Sadece jpg, jpeg, png, webp, gif kabul edilir.",
      );
    }
    const fileName = `q${qId}-${Date.now()}.${ext}`;
    const filePath = path.join(uploadDir, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Mevcut en yüksek sortOrder
    const lastImg = await prisma.questionImage.findFirst({
      where: { questionId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const image = await prisma.questionImage.create({
      data: {
        questionId,
        filePath: `uploads/question-images/${fileName}`,
        fileName: file.name,
        mimeType: file.type,
        sortOrder: (lastImg?.sortOrder ?? -1) + 1,
      },
    });

    return Response.json(apiSuccess(image), { status: 201 });
  } catch (err) {
    console.error("Görsel yükleme hatası:", err);
    return apiError("Görsel yüklenemedi.", 500);
  }
}
