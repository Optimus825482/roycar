import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/utils";
import { hash } from "bcryptjs";

// PUT /api/admin/users/:id — Kullanıcı güncelle
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { fullName, email, username, role, permissions, isActive, password } =
      body;

    const userId = BigInt(id);

    // Check user exists
    const existing = await prisma.adminUser.findUnique({
      where: { id: userId },
    });
    if (!existing) {
      return apiError("Kullanıcı bulunamadı.", 404);
    }

    // Check username uniqueness if changed
    if (username && username.trim().toLowerCase() !== existing.username) {
      const dup = await prisma.adminUser.findUnique({
        where: { username: username.trim().toLowerCase() },
      });
      if (dup) {
        return apiError("Bu kullanıcı adı zaten kayıtlı.");
      }
    }

    const updateData: Record<string, unknown> = {};
    if (fullName?.trim()) updateData.fullName = fullName.trim();
    if (username?.trim()) updateData.username = username.trim().toLowerCase();
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (role) updateData.role = role;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (typeof isActive === "boolean") updateData.isActive = isActive;
    if (password?.trim() && password.length >= 6) {
      updateData.passwordHash = await hash(password, 12);
    }

    const user = await prisma.adminUser.update({
      where: { id: userId },
      data: updateData,
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

    return Response.json({ success: true, data: serialized });
  } catch (err) {
    console.error("Users PUT error:", err);
    return apiError("Kullanıcı güncellenemedi.", 500);
  }
}

// DELETE /api/admin/users/:id — Kullanıcı sil
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = BigInt(id);

    const existing = await prisma.adminUser.findUnique({
      where: { id: userId },
    });
    if (!existing) {
      return apiError("Kullanıcı bulunamadı.", 404);
    }

    // Don't allow deleting the main admin
    if (existing.username === "admin") {
      return apiError("Ana yönetici hesabı silinemez.");
    }

    await prisma.adminUser.delete({ where: { id: userId } });

    return Response.json({ success: true, data: { deleted: true } });
  } catch (err) {
    console.error("Users DELETE error:", err);
    return apiError("Kullanıcı silinemedi.", 500);
  }
}
