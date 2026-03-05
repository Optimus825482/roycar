import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { PUT, DELETE } from "./route";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    adminUser: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  requirePermission: vi.fn(),
}));

vi.mock("bcryptjs", () => ({ hash: vi.fn().mockResolvedValue("hashed") }));

const mockUser = {
  id: 1n,
  username: "testuser",
  email: "test@test.com",
  fullName: "Test User",
  role: "hr_manager",
  permissions: {},
  isActive: true,
  createdAt: new Date(),
};

function putReq(body: object, id = "1") {
  return new NextRequest(`http://localhost/api/admin/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("PUT /api/admin/users/[id]", () => {
  beforeEach(() => {
    vi.mocked(requirePermission).mockResolvedValue({
      ok: true,
      session: { user: { id: "1" }, expires: "" },
    });
    vi.mocked(prisma.adminUser.findUnique).mockReset();
    vi.mocked(prisma.adminUser.update).mockReset();
  });

  it("returns 200 and updated user when body is valid", async () => {
    vi.mocked(prisma.adminUser.findUnique)
      .mockResolvedValueOnce(mockUser as never)
      .mockResolvedValueOnce(null as never);
    const updated = { ...mockUser, fullName: "Updated Name" };
    vi.mocked(prisma.adminUser.update).mockResolvedValue(updated as never);

    const res = await PUT(putReq({ fullName: "Updated Name" }), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data?.fullName).toBe("Updated Name");
  });

  it("returns 400 when id is invalid", async () => {
    const res = await PUT(putReq({ fullName: "x" }, "abc"), {
      params: Promise.resolve({ id: "abc" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/Geçersiz|ID/i);
    expect(prisma.adminUser.findUnique).not.toHaveBeenCalled();
  });

  it("returns 404 when user not found", async () => {
    vi.mocked(prisma.adminUser.findUnique).mockResolvedValue(null as never);

    const res = await PUT(putReq({ fullName: "x" }), {
      params: Promise.resolve({ id: "999" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/bulunamadı/i);
  });

  it("returns 400 when username is duplicate", async () => {
    vi.mocked(prisma.adminUser.findUnique)
      .mockResolvedValueOnce(mockUser as never)
      .mockResolvedValueOnce({ id: 2n, username: "otheruser" } as never);

    const res = await PUT(putReq({ username: "otheruser" }), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/kullanıcı adı.*kayıtlı/i);
  });

  it("returns 403 when no user_management permission", async () => {
    vi.mocked(requirePermission).mockResolvedValue({
      ok: false,
      response: new Response(
        JSON.stringify({ success: false, error: "Bu işlem için yetkiniz yok." }),
        { status: 403 }
      ),
    });

    const res = await PUT(putReq({ fullName: "x" }), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(403);
    expect(prisma.adminUser.findUnique).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/admin/users/[id]", () => {
  beforeEach(() => {
    vi.mocked(requirePermission).mockResolvedValue({
      ok: true,
      session: { user: { id: "1" }, expires: "" },
    });
    vi.mocked(prisma.adminUser.findUnique).mockReset();
    vi.mocked(prisma.adminUser.delete).mockReset();
  });

  it("returns 200 when user deleted", async () => {
    vi.mocked(prisma.adminUser.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.adminUser.delete).mockResolvedValue(mockUser as never);

    const res = await DELETE(new NextRequest("http://localhost/api/admin/users/1"), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data?.deleted).toBe(true);
  });

  it("returns 400 when id is invalid", async () => {
    const res = await DELETE(
      new NextRequest("http://localhost/api/admin/users/invalid"),
      { params: Promise.resolve({ id: "invalid" }) }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/Geçersiz|ID/i);
    expect(prisma.adminUser.delete).not.toHaveBeenCalled();
  });

  it("returns 404 when user not found", async () => {
    vi.mocked(prisma.adminUser.findUnique).mockResolvedValue(null as never);

    const res = await DELETE(
      new NextRequest("http://localhost/api/admin/users/999"),
      { params: Promise.resolve({ id: "999" }) }
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/bulunamadı/i);
    expect(prisma.adminUser.delete).not.toHaveBeenCalled();
  });

  it('returns 400 "Ana yönetici silinemez" when username === "admin"', async () => {
    vi.mocked(prisma.adminUser.findUnique).mockResolvedValue({
      ...mockUser,
      username: "admin",
    } as never);

    const res = await DELETE(
      new NextRequest("http://localhost/api/admin/users/1"),
      { params: Promise.resolve({ id: "1" }) }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/Ana yönetici.*silinemez/i);
    expect(prisma.adminUser.delete).not.toHaveBeenCalled();
  });

  it("returns 403 when no user_management permission", async () => {
    vi.mocked(requirePermission).mockResolvedValue({
      ok: false,
      response: new Response(
        JSON.stringify({ success: false, error: "Bu işlem için yetkiniz yok." }),
        { status: 403 }
      ),
    });

    const res = await DELETE(
      new NextRequest("http://localhost/api/admin/users/1"),
      { params: Promise.resolve({ id: "1" }) }
    );
    expect(res.status).toBe(403);
    expect(prisma.adminUser.findUnique).not.toHaveBeenCalled();
  });
});
