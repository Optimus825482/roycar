import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    orgPosition: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  requireAuth: vi.fn(),
}));

describe("GET /api/admin/org-chart", () => {
  beforeEach(() => {
    vi.mocked(prisma.orgPosition.findMany).mockReset();
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
  });

  it("returns 200 and positions when authenticated", async () => {
    const mockPositions = [
      { id: 1n, title: "Pozisyon 1", sortOrder: 0 },
    ];
    vi.mocked(prisma.orgPosition.findMany).mockResolvedValue(
      mockPositions as never
    );
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data[0].title).toBe("Pozisyon 1");
  });
});

describe("POST /api/admin/org-chart", () => {
  beforeEach(() => {
    vi.mocked(prisma.orgPosition.create).mockReset();
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
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ title: "Yeni Pozisyon" }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when title is missing", async () => {
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Pozisyon başlığı|gereklidir/);
  });
});
