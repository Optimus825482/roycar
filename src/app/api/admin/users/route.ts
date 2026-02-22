import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/utils";
import { hash } from "bcryptjs";

// GET /api/admin/users — Kullanıcı listesi
export async function GET() {
  try {
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
    const body = await req.json();
    const { username, email, fullName, password, role, permissions } = body;

    if (!username?.trim() || !fullName?.trim() || !password?.trim()) {
      return apiError("Kullanıcı adı, ad soyad ve parola zorunludur.");
    }

    if (password.length < 6) {
      return apiError("Parola en az 6 karakter olmalıdır.");
    }

    // Check duplicate username
    const existing = await prisma.adminUser.findUnique({
      where: { username: username.trim().toLowerCase() },
    });
    if (existing) {
      return apiError("Bu kullanıcı adı zaten kayıtlı.");
    }

    const passwordHash = await hash(password, 12);

    const user = await prisma.adminUser.create({
      data: {
        username: username.trim().toLowerCase(),
        email: email?.trim() || null,
        fullName: fullName.trim(),
        passwordHash,
        role: role || "hr_manager",
        permissions: permissions || {
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
