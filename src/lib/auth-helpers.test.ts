import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAuth, requirePermission } from "./auth-helpers";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: (...args: unknown[]) => mockAuth(...args) }));

describe("requireAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is null", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await requireAuth();
    expect(result.ok).toBe(false);
    expect("response" in result && result.response.status).toBe(401);
    const body = await (result as { response: Response }).response.json();
    expect(body).toEqual({ success: false, error: "Oturum gerekli." });
  });

  it("returns 401 when session has no user", async () => {
    mockAuth.mockResolvedValue({});
    const result = await requireAuth();
    expect(result.ok).toBe(false);
    expect("response" in result && result.response.status).toBe(401);
  });

  it("returns session when user is present", async () => {
    const session = {
      user: { id: "1", name: "Test", email: "test@test.com" },
      expires: "2025-12-31",
    };
    mockAuth.mockResolvedValue(session);
    const result = await requireAuth();
    expect(result.ok).toBe(true);
    expect("session" in result && result.session).toEqual(session);
  });
});

describe("requirePermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await requirePermission("user_management");
    expect(result.ok).toBe(false);
    expect("response" in result && result.response.status).toBe(401);
  });

  it("returns 403 when user has no permission", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", permissions: { form_builder: true, user_management: false } },
      expires: "2025-12-31",
    });
    const result = await requirePermission("user_management");
    expect(result.ok).toBe(false);
    expect("response" in result && result.response.status).toBe(403);
    const body = await (result as { response: Response }).response.json();
    expect(body.error).toContain("yetkiniz yok");
  });

  it("returns 403 when permissions object is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1" },
      expires: "2025-12-31",
    });
    const result = await requirePermission("user_management");
    expect(result.ok).toBe(false);
    expect("response" in result && result.response.status).toBe(403);
  });

  it("returns session when user has the permission", async () => {
    const session = {
      user: {
        id: "1",
        name: "Admin",
        permissions: { user_management: true, form_builder: true },
      },
      expires: "2025-12-31",
    };
    mockAuth.mockResolvedValue(session);
    const result = await requirePermission("user_management");
    expect(result.ok).toBe(true);
    expect("session" in result && result.session).toEqual(session);
  });
});
