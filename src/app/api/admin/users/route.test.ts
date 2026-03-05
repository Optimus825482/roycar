import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePermission } from "@/lib/auth-helpers";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    adminUser: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  requireAuth: vi.fn(),
  requirePermission: vi.fn(),
}));

vi.mock("bcryptjs", () => ({ hash: vi.fn().mockResolvedValue("hashed") }));

describe("GET /api/admin/users", () => {
  beforeEach(() => {
    vi.mocked(prisma.adminUser.findMany).mockReset();
    vi.mocked(requireAuth).mockResolvedValue({
      ok: true,
      session: { user: { id: "1" }, expires: "" },
    });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      ok: false,
      response: new Response(
        JSON.stringify({ success: false, error: "Oturum gerekli." }),
        { status: 401 }
      ),
    });
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Oturum");
  });

  it("returns 200 and user list when prisma succeeds", async () => {
    const mockUsers = [
      {
        id: 1n,
        username: "admin",
        email: "admin@test.com",
        fullName: "Admin User",
        role: "admin",
        permissions: { user_management: true },
        isActive: true,
        createdAt: new Date("2025-01-01"),
      },
    ];
    vi.mocked(prisma.adminUser.findMany).mockResolvedValue(mockUsers);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].username).toBe("admin");
    expect(body.data[0].id).toBe("1");
  });

  it("calls findMany with orderBy createdAt desc", async () => {
    vi.mocked(prisma.adminUser.findMany).mockResolvedValue([]);
    await GET();
    expect(prisma.adminUser.findMany).toHaveBeenCalledWith({
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
  });
});

describe("POST /api/admin/users", () => {
  beforeEach(() => {
    vi.mocked(requirePermission).mockResolvedValue({
      ok: true,
      session: { user: { id: "1" }, expires: "" },
    });
    vi.mocked(prisma.adminUser.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.adminUser.create).mockReset();
  });

  it("returns 201 and user when body valid and username unique", async () => {
    const created = {
      id: 2n,
      username: "newuser",
      email: "new@test.com",
      fullName: "New User",
      role: "hr_manager",
      permissions: {},
      isActive: true,
      createdAt: new Date(),
    };
    vi.mocked(prisma.adminUser.create).mockResolvedValue(created);

    const req = new NextRequest("http://localhost/api/admin/users", {
      method: "POST",
      body: JSON.stringify({
        username: "newuser",
        fullName: "New User",
        password: "password123",
        email: "new@test.com",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data?.username).toBe("newuser");
  });
});
