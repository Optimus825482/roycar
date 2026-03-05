import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePermission } from "@/lib/auth-helpers";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    screeningCriteria: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  requireAuth: vi.fn(),
  requirePermission: vi.fn(),
}));

describe("GET /api/admin/screening", () => {
  beforeEach(() => {
    vi.mocked(prisma.screeningCriteria.findMany).mockReset();
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

  it("returns 200 and criteria list when authenticated", async () => {
    const mockCriteria = [
      {
        id: 1n,
        name: "Kriter 1",
        department: { name: "IT" },
        _count: { results: 5 },
      },
    ];
    vi.mocked(prisma.screeningCriteria.findMany).mockResolvedValue(
      mockCriteria as never
    );
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data[0].name).toBe("Kriter 1");
  });
});

describe("POST /api/admin/screening", () => {
  beforeEach(() => {
    vi.mocked(prisma.screeningCriteria.create).mockReset();
    vi.mocked(requirePermission).mockResolvedValue({
      ok: true,
      session: { user: { id: "1" }, expires: "" },
    });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requirePermission).mockResolvedValue({
      ok: false,
      response: new Response(
        JSON.stringify({ success: false, error: "Oturum gerekli." }),
        { status: 401 }
      ),
    });
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ name: "Test" }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    vi.mocked(requirePermission).mockResolvedValue({
      ok: true,
      session: { user: { id: "1" }, expires: "" },
    });
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Kriter adı|zorunlu/);
  });
});
