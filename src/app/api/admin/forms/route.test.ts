import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    formConfig: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  requireAuth: vi.fn(),
}));

describe("GET /api/admin/forms", () => {
  beforeEach(() => {
    vi.mocked(prisma.formConfig.findMany).mockReset();
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
  });

  it("returns 200 and form list when authenticated and prisma succeeds", async () => {
    const mockForms = [
      {
        id: 1n,
        title: "Test Form",
        mode: "static",
        isPublished: true,
        isActive: true,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
        _count: { questions: 5, applications: 10 },
      },
    ];
    vi.mocked(prisma.formConfig.findMany).mockResolvedValue(mockForms as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].title).toBe("Test Form");
    expect(body.data[0].id).toBe("1");
  });

  it("calls findMany with orderBy and include _count", async () => {
    vi.mocked(prisma.formConfig.findMany).mockResolvedValue([]);
    await GET();
    expect(prisma.formConfig.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { questions: true, applications: true } } },
    });
  });
});
