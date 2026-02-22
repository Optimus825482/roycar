import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { apiError, apiSuccess } from "@/lib/utils";

// POST /api/apply/upload — Fotoğraf/dosya yükle
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return apiError("Dosya gerekli.");

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return apiError("Sadece JPEG, PNG veya WebP yüklenebilir.");
    }
    if (file.size > 5 * 1024 * 1024) {
      return apiError("Dosya boyutu 5MB'ı aşamaz.");
    }

    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const uploadDir = path.join(process.cwd(), "uploads", "photos");
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    return Response.json(
      apiSuccess({ filePath: `uploads/photos/${fileName}`, fileName }),
      { status: 201 },
    );
  } catch (err) {
    console.error("Dosya yükleme hatası:", err);
    return apiError("Dosya yüklenemedi.", 500);
  }
}
