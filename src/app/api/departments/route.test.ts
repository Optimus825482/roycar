import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    department: {
      findMany: vi.fn(),
    },
  },
}));

describe("GET /api/departments", () => {
  beforeEach(() => {
    vi.mocked(prisma.department.findMany).mockReset();
  });

  it("returns 200 and department list when prisma succeeds", async () => {
    const mockDepts = [
      {
        id: 1n,
        name: "İnsan Kaynakları",
        isActive: true,
        sortOrder: 0,
        createdAt: new Date("2025-01-01"),
      },
    ];
    vi.mocked(prisma.department.findMany).mockResolvedValue(mockDepts);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("İnsan Kaynakları");
    expect(body.data[0].id).toBe("1");
  });

  it("returns 500 and error message when prisma throws", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.department.findMany).mockRejectedValue(
      new Error("DB error")
    );

    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("alınamadı");
    consoleSpy.mockRestore();
  });

  it("calls findMany with isActive true and sortOrder asc", async () => {
    vi.mocked(prisma.department.findMany).mockResolvedValue([]);

    await GET();

    expect(prisma.department.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  });
});
