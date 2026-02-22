import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/utils";
import { createChatSession, getChatSessions } from "@/services/chat.service";

// GET /api/admin/chat/sessions — Oturum listesi
export async function GET(req: NextRequest) {
  try {
    const adminUsername = req.headers.get("x-admin-username") || "admin";
    const admin = await prisma.adminUser.findUnique({
      where: { username: adminUsername },
    });
    if (!admin) return apiError("Admin bulunamadı.", 401);

    const includeArchived = req.nextUrl.searchParams.get("archived") === "true";
    const sessions = await getChatSessions(admin.id, includeArchived);
    const serialized = JSON.parse(
      JSON.stringify(sessions, (_k, v) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    );
    return Response.json({ success: true, data: serialized });
  } catch (err) {
    console.error("Chat sessions error:", err);
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    return apiError(`Oturumlar alınamadı: ${message}`, 500);
  }
}

// POST /api/admin/chat/sessions — Yeni oturum
export async function POST(req: NextRequest) {
  try {
    const adminUsername = req.headers.get("x-admin-username") || "admin";
    const admin = await prisma.adminUser.findUnique({
      where: { username: adminUsername },
    });
    if (!admin) return apiError("Admin bulunamadı.", 401);

    const body = await req.json().catch(() => ({}));
    const session = await createChatSession(admin.id, body.title);
    const serialized = JSON.parse(
      JSON.stringify(session, (_k, v) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    );
    return Response.json({ success: true, data: serialized }, { status: 201 });
  } catch (err) {
    console.error("Chat session create error:", err);
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    return apiError(`Oturum oluşturulamadı: ${message}`, 500);
  }
}
