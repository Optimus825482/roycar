import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    application: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  requireAuth: vi.fn(),
}));

describe("GET /api/admin/evaluations", () => {
  beforeEach(() => {
    vi.mocked(prisma.application.count).mockReset();
    vi.mocked(prisma.application.findMany).mockReset();
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
    const req = new Request("http://localhost/api/admin/evaluations");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 200 and applications with stats when authenticated", async () => {
    vi.mocked(prisma.application.count)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2);
    vi.mocked(prisma.application.findMany).mockResolvedValue([
      {
        id: 1n,
        applicationNo: "A001",
        fullName: "Test",
        email: "t@t.com",
        evaluations: [],
      },
    ] as never);

    const req = new Request("http://localhost/api/admin/evaluations");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.stats).toEqual({
      total: 10,
      evaluated: 5,
      pending: 3,
      failed: 2,
    });
    expect(Array.isArray(body.data.applications)).toBe(true);
  });
});
