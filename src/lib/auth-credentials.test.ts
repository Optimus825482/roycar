import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateAdminCredentials } from "./auth-credentials";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    adminUser: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  compare: vi.fn(),
}));

describe("validateAdminCredentials", () => {
  beforeEach(() => {
    vi.mocked(prisma.adminUser.findUnique).mockReset();
    vi.mocked(compare).mockReset();
  });

  it("throws when username is missing", async () => {
    await expect(
      validateAdminCredentials({ password: "secret" }),
    ).rejects.toThrow("Kullanıcı adı ve parola gereklidir.");
    expect(prisma.adminUser.findUnique).not.toHaveBeenCalled();
  });

  it("throws when password is missing", async () => {
    await expect(
      validateAdminCredentials({ username: "admin" }),
    ).rejects.toThrow("Kullanıcı adı ve parola gereklidir.");
    expect(prisma.adminUser.findUnique).not.toHaveBeenCalled();
  });

  it("throws when user not found", async () => {
    vi.mocked(prisma.adminUser.findUnique).mockResolvedValue(null);
    await expect(
      validateAdminCredentials({ username: "unknown", password: "x" }),
    ).rejects.toThrow("Geçersiz kimlik bilgileri.");
  });

  it("throws when user is inactive", async () => {
    vi.mocked(prisma.adminUser.findUnique).mockResolvedValue({
      id: 1n,
      username: "admin",
      fullName: "Admin",
      email: "a@b.com",
      passwordHash: "hash",
      role: "admin",
      permissions: {},
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    await expect(
      validateAdminCredentials({ username: "admin", password: "secret" }),
    ).rejects.toThrow("Geçersiz kimlik bilgileri.");
    expect(compare).not.toHaveBeenCalled();
  });

  it("throws when password is wrong", async () => {
    vi.mocked(prisma.adminUser.findUnique).mockResolvedValue({
      id: 1n,
      username: "admin",
      fullName: "Admin",
      email: "a@b.com",
      passwordHash: "hash",
      role: "admin",
      permissions: { user_management: true },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    vi.mocked(compare).mockResolvedValue(false as never);
    await expect(
      validateAdminCredentials({ username: "admin", password: "wrong" }),
    ).rejects.toThrow("Geçersiz kimlik bilgileri.");
  });

  it("returns user shape when credentials are valid", async () => {
    vi.mocked(prisma.adminUser.findUnique).mockResolvedValue({
      id: 1n,
      username: "admin",
      fullName: "Sistem Yöneticisi",
      email: "admin@test.com",
      passwordHash: "hash",
      role: "admin",
      permissions: { user_management: true },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    vi.mocked(compare).mockResolvedValue(true as never);

    const user = await validateAdminCredentials({
      username: "admin",
      password: "secret",
    });

    expect(user).toEqual({
      id: "1",
      email: "admin@test.com",
      name: "Sistem Yöneticisi",
      username: "admin",
      role: "admin",
      permissions: { user_management: true },
    });
    expect(prisma.adminUser.findUnique).toHaveBeenCalledWith({
      where: { username: "admin" },
    });
    expect(compare).toHaveBeenCalledWith("secret", "hash");
  });
});
