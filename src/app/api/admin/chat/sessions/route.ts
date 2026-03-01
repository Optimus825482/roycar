import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { createChatSession, getChatSessions } from "@/services/chat.service";

// GET /api/admin/chat/sessions — Oturum listesi
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const adminUsername =
      (session?.user as { username?: string })?.username ||
      req.headers.get("x-admin-username");
    if (!adminUsername) return apiError("Yetkisiz erişim.", 401);
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
    return apiError("Oturumlar alınamadı.", 500);
  }
}

// POST /api/admin/chat/sessions — Yeni oturum
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const adminUsername =
      (session?.user as { username?: string })?.username ||
      req.headers.get("x-admin-username");
    if (!adminUsername) return apiError("Yetkisiz erişim.", 401);
    const admin = await prisma.adminUser.findUnique({
      where: { username: adminUsername },
    });
    if (!admin) return apiError("Admin bulunamadı.", 401);

    const body = await req.json().catch(() => ({}));
    const chatSession = await createChatSession(admin.id, body.title);
    const serialized = JSON.parse(
      JSON.stringify(chatSession, (_k, v) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    );
    return Response.json({ success: true, data: serialized }, { status: 201 });
  } catch (err) {
    console.error("Chat session create error:", err);
    return apiError("Oturum oluşturulamadı.", 500);
  }
}
