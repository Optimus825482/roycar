import { NextRequest } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

// GET /api/uploads/photos/filename.jpg — Yüklenen dosyaları serve et
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const segments = (await params).path;
    if (!segments || segments.length === 0) {
      return new Response("Not found", { status: 404 });
    }

    // Güvenlik: path traversal engelle
    const safePath = segments.map((s) => s.replace(/[^a-zA-Z0-9._-]/g, ""));
    const filePath = path.join(process.cwd(), "uploads", ...safePath);

    // uploads klasörü dışına çıkılmasını engelle
    const uploadsRoot = path.join(process.cwd(), "uploads");
    if (!filePath.startsWith(uploadsRoot)) {
      return new Response("Forbidden", { status: 403 });
    }

    await stat(filePath); // dosya var mı kontrol

    const ext = path.extname(filePath).slice(1).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    const buffer = await readFile(filePath);
    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
