import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    importLog: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  requirePermission: vi.fn(),
}));

describe("GET /api/admin/import/logs", () => {
  beforeEach(() => {
    vi.mocked(prisma.importLog.findMany).mockReset();
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
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 200 and import logs when authenticated", async () => {
    const mockLogs = [
      {
        id: 1n,
        fileName: "test.xlsx",
        status: "completed",
        createdAt: new Date("2025-01-01"),
      },
    ];
    vi.mocked(prisma.importLog.findMany).mockResolvedValue(mockLogs as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data[0].fileName).toBe("test.xlsx");
  });
});
