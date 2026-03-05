import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/utils";
import { hash } from "bcryptjs";
import { requireAuth, requirePermission } from "@/lib/auth-helpers";
import { adminUserCreateSchema } from "@/lib/api-schemas";

// GET /api/admin/users — Kullanıcı listesi
export async function GET() {
  try {
    const authResult = await requireAuth();
    if (!authResult.ok) return authResult.response;

    const users = await prisma.adminUser.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        permissions: true,
        isActive: true,
        createdAt: true,
      },
    });

    const serialized = JSON.parse(
      JSON.stringify(users, (_k, v) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    );

    return Response.json({ success: true, data: serialized });
  } catch (err) {
    console.error("Users GET error:", err);
    return apiError("Kullanıcılar alınamadı.", 500);
  }
}

// POST /api/admin/users — Yeni kullanıcı oluştur
export async function POST(req: NextRequest) {
  try {
    const authResult = await requirePermission("user_management");
    if (!authResult.ok) return authResult.response;

    const body = await req.json();
    const parsed = adminUserCreateSchema.safeParse(body);
    if (!parsed.success) {
      const firstMessage = parsed.error.issues[0]?.message;
      const message =
        typeof firstMessage === "string" ? firstMessage : "Geçersiz istek.";
      return apiError(message, 400);
    }
    const { username, fullName, password, email, role, permissions } =
      parsed.data;

    // Check duplicate username
    const existing = await prisma.adminUser.findUnique({
      where: { username },
    });
    if (existing) {
      return apiError("Bu kullanıcı adı zaten kayıtlı.");
    }

    const passwordHash = await hash(password, 12);

    const user = await prisma.adminUser.create({
      data: {
        username,
        email: email ?? null,
        fullName,
        passwordHash,
        role: role || "hr_manager",
        permissions: permissions ?? {
          form_builder: true,
          ai_chat: true,
          evaluations: true,
          screening: true,
          data_import: true,
          settings: false,
          user_management: false,
        },
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        permissions: true,
        isActive: true,
        createdAt: true,
      },
    });

    const serialized = JSON.parse(
      JSON.stringify(user, (_k, v) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    );

    return Response.json({ success: true, data: serialized }, { status: 201 });
  } catch (err) {
    console.error("Users POST error:", err);
    return apiError("Kullanıcı oluşturulamadı.", 500);
  }
}
