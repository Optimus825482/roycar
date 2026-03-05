import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

// Simple in-memory rate limiters
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const loginRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const adminRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 5; // 5 requests per minute per IP (apply)
const LOGIN_RATE_LIMIT_MAX = 10; // 10 login attempts per minute per IP
const ADMIN_RATE_LIMIT_MAX = 120; // 120 requests per minute per IP (admin API)

// Periodic cleanup to prevent memory leak — runs every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap) {
      if (now > entry.resetAt) rateLimitMap.delete(ip);
    }
    for (const [ip, entry] of loginRateLimitMap) {
      if (now > entry.resetAt) loginRateLimitMap.delete(ip);
    }
    for (const [ip, entry] of adminRateLimitMap) {
      if (now > entry.resetAt) adminRateLimitMap.delete(ip);
    }
  },
  5 * 60 * 1000,
);

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginRateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    loginRateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= LOGIN_RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

function checkAdminRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = adminRateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    adminRateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= ADMIN_RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Rate limiting for apply endpoint
  if (pathname === "/api/apply" && req.method === "POST") {
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        {
          success: false,
          error: "Çok fazla istek. Lütfen bir dakika bekleyin.",
        },
        { status: 429 },
      );
    }
  }

  // Rate limiting for login (NextAuth credentials callback)
  if (pathname.startsWith("/api/auth") && req.method === "POST") {
    if (!checkLoginRateLimit(ip)) {
      return NextResponse.json(
        {
          success: false,
          error: "Çok fazla giriş denemesi. Lütfen bir dakika bekleyin.",
        },
        { status: 429 },
      );
    }
  }

  // Protect admin pages
  if (pathname.startsWith("/admin")) {
    if (!req.auth) {
      const loginUrl = new URL("/giris", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect admin API routes
  if (pathname.startsWith("/api/admin")) {
    if (!req.auth) {
      return NextResponse.json(
        { success: false, error: "Yetkisiz erişim." },
        { status: 401 },
      );
    }
    if (!checkAdminRateLimit(ip)) {
      return NextResponse.json(
        {
          success: false,
          error: "Çok fazla istek. Lütfen bir dakika bekleyin.",
        },
        { status: 429 },
      );
    }
  }

  return NextResponse.next();
});

const isTestEnv =
  typeof process !== "undefined" && process.env?.VITEST === "true";

/** Test-only: reset apply rate limit map for deterministic tests (no-op in production) */
export const __testResetRateLimitMap = isTestEnv
  ? function __testResetRateLimitMap(): void {
      rateLimitMap.clear();
    }
  : function __testResetRateLimitMap(): void {};

/** Test-only: reset login rate limit map for deterministic tests (no-op in production) */
export const __testResetLoginRateLimitMap = isTestEnv
  ? function __testResetLoginRateLimitMap(): void {
      loginRateLimitMap.clear();
    }
  : function __testResetLoginRateLimitMap(): void {};

/** Test-only: reset admin rate limit map for deterministic tests (no-op in production) */
export const __testResetAdminRateLimitMap = isTestEnv
  ? function __testResetAdminRateLimitMap(): void {
      adminRateLimitMap.clear();
    }
  : function __testResetAdminRateLimitMap(): void {};

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/apply", "/api/auth/:path*"],
};
