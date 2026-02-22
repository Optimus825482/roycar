import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { unlink } from "fs/promises";
import path from "path";

type Params = { params: Promise<{ id: string; qId: string; imgId: string }> };

// DELETE — Görsel sil
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { imgId } = await params;
    const image = await prisma.questionImage.findUnique({
      where: { id: BigInt(imgId) },
    });

    if (!image) return apiError("Görsel bulunamadı.", 404);

    // Dosyayı sil
    try {
      await unlink(path.join(process.cwd(), image.filePath));
    } catch {
      // Dosya zaten silinmişse devam et
    }

    await prisma.questionImage.delete({ where: { id: BigInt(imgId) } });
    return Response.json(apiSuccess(null, "Görsel silindi."));
  } catch (err) {
    console.error("Görsel silme hatası:", err);
    return apiError("Görsel silinemedi.", 500);
  }
}
