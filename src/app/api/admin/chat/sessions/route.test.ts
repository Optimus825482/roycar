import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import * as chatService from "@/services/chat.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    adminUser: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  requirePermission: vi.fn(),
}));

vi.mock("@/services/chat.service", () => ({
  getChatSessions: vi.fn(),
  createChatSession: vi.fn(),
}));

describe("GET /api/admin/chat/sessions", () => {
  beforeEach(() => {
    vi.mocked(prisma.adminUser.findUnique).mockReset();
    vi.mocked(chatService.getChatSessions).mockReset();
    vi.mocked(requirePermission).mockResolvedValue({
      ok: true,
      session: {
        user: { id: "1", username: "admin" },
        expires: "",
      },
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
    const req = new NextRequest("http://localhost/api/admin/chat/sessions");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 200 and sessions when authenticated and admin found", async () => {
    vi.mocked(prisma.adminUser.findUnique).mockResolvedValue({
      id: 1n,
      username: "admin",
    } as never);
    vi.mocked(chatService.getChatSessions).mockResolvedValue([
      { id: 1n, title: "Session 1" },
    ] as never);

    const req = new NextRequest("http://localhost/api/admin/chat/sessions");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data[0].title).toBe("Session 1");
  });
});

describe("POST /api/admin/chat/sessions", () => {
  beforeEach(() => {
    vi.mocked(prisma.adminUser.findUnique).mockReset();
    vi.mocked(chatService.createChatSession).mockReset();
    vi.mocked(requirePermission).mockResolvedValue({
      ok: true,
      session: {
        user: { id: "1", username: "admin" },
        expires: "",
      },
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
    const req = new NextRequest("http://localhost/api/admin/chat/sessions", {
      method: "POST",
      body: JSON.stringify({ title: "New" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 201 and created session when authenticated", async () => {
    vi.mocked(prisma.adminUser.findUnique).mockResolvedValue({
      id: 1n,
      username: "admin",
    } as never);
    vi.mocked(chatService.createChatSession).mockResolvedValue({
      id: 2n,
      title: "New Session",
    } as never);

    const req = new NextRequest("http://localhost/api/admin/chat/sessions", {
      method: "POST",
      body: JSON.stringify({ title: "New Session" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.title).toBe("New Session");
  });
});
