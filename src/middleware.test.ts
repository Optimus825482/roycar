import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth so default export runs inner logic: auth(fn) => (req) => fn(req)
vi.mock("@/lib/auth", () => ({
  auth: (fn: (req: NextRequest & { auth?: unknown }) => unknown) =>
    (req: NextRequest & { auth?: unknown }) => fn(req),
}));

// Import after mock so middleware uses mocked auth
const getMiddleware = async () => {
  const mod = await import("@/middleware");
  return mod.default;
};

/** Build request with optional auth (no cookies by default). */
function req(
  url: string,
  options?: { method?: string; auth?: unknown; headers?: HeadersInit }
): NextRequest & { auth?: unknown } {
  const r = new NextRequest(url, {
    method: options?.method ?? "GET",
    headers: options?.headers,
  }) as NextRequest & { auth?: unknown };
  r.auth = options?.auth ?? undefined;
  return r;
}

describe("middleware", () => {
  beforeEach(async () => {
    const mod = await import("@/middleware");
    if (typeof mod.__testResetRateLimitMap === "function") {
      mod.__testResetRateLimitMap();
    }
    if (typeof mod.__testResetLoginRateLimitMap === "function") {
      mod.__testResetLoginRateLimitMap();
    }
  });

  describe("admin API — no auth", () => {
    it("GET /api/admin/users returns 401 and body success false when no cookie/auth", async () => {
      const middleware = await getMiddleware();
      const r = req("http://localhost/api/admin/users");
      const res = middleware(r);
      expect(res.status).toBe(401);
      const data = await (res as Response).json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Yetkisiz erişim.");
    });

    it("GET /api/admin/forms returns 401 when no auth", async () => {
      const middleware = await getMiddleware();
      const r = req("http://localhost/api/admin/forms");
      const res = middleware(r);
      expect(res.status).toBe(401);
      const data = await (res as Response).json();
      expect(data.success).toBe(false);
    });
  });

  describe("admin page redirect", () => {
    it("/admin redirects to /giris?callbackUrl=/admin when no auth", async () => {
      const middleware = await getMiddleware();
      const r = req("http://localhost/admin");
      const res = middleware(r);
      expect(res.status).toBe(307);
      const location = (res as Response).headers.get("location");
      expect(location).toContain("/giris");
      expect(location).toContain("callbackUrl=");
      expect(location).toMatch(/callbackUrl=.*%2Fadmin/);
    });
  });

  describe("rate limit — POST /api/apply", () => {
    it("returns 429 on 6th POST /api/apply from same IP", async () => {
      const middleware = await getMiddleware();
      const base = "http://localhost/api/apply";
      const ip = "192.168.1.1";
      const headers = { "x-forwarded-for": ip, "Content-Type": "application/json" };

      for (let i = 0; i < 5; i++) {
        const r = req(base, { method: "POST", auth: {}, headers });
        const res = middleware(r);
        expect(res.status).not.toBe(429);
      }
      const r6 = req(base, { method: "POST", auth: {}, headers });
      const res6 = middleware(r6);
      expect(res6.status).toBe(429);
      const data = await (res6 as Response).json();
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/Çok fazla istek|bekleyin/);
    });
  });

  describe("rate limit — POST /api/auth (login)", () => {
    it("returns 429 on 11th POST /api/auth from same IP", async () => {
      const middleware = await getMiddleware();
      const base = "http://localhost/api/auth/callback/credentials";
      const ip = "10.0.0.1";
      const headers = { "x-forwarded-for": ip };

      for (let i = 0; i < 10; i++) {
        const r = req(base, { method: "POST", auth: {}, headers });
        const res = middleware(r);
        expect(res.status).not.toBe(429);
      }
      const r11 = req(base, { method: "POST", auth: {}, headers });
      const res11 = middleware(r11);
      expect(res11.status).toBe(429);
      const data = await (res11 as Response).json();
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/giriş denemesi|bekleyin/);
    });
  });
});
