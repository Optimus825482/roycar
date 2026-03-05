import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    application: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  requireAuth: vi.fn(),
}));

describe("GET /api/admin/applications", () => {
  beforeEach(() => {
    vi.mocked(prisma.application.findMany).mockReset();
    vi.mocked(prisma.application.count).mockReset();
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
    const req = new NextRequest("http://localhost/api/admin/applications");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 200 and paginated list when authenticated", async () => {
    vi.mocked(prisma.application.findMany).mockResolvedValue([]);
    vi.mocked(prisma.application.count).mockResolvedValue(0);

    const req = new NextRequest("http://localhost/api/admin/applications");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta).toBeDefined();
    expect(body.meta.total).toBe(0);
    expect(body.meta.page).toBe(1);
  });
});
