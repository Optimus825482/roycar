import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  cn,
  sanitizeInput,
  sanitizeObject,
  generateApplicationNo,
  safeBigInt,
  apiSuccess,
  apiError,
  handleRouteError,
} from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", true && "visible")).toBe(
      "base visible",
    );
  });

  it("merges tailwind classes and resolves conflicts", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("handles undefined and null", () => {
    expect(cn("a", undefined, null, "b")).toBe("a b");
  });
});

describe("sanitizeInput", () => {
  it("escapes ampersand", () => {
    expect(sanitizeInput("a & b")).toBe("a &amp; b");
  });

  it("escapes less-than and greater-than", () => {
    expect(sanitizeInput("<script>")).toBe("&lt;script&gt;");
  });

  it("escapes double and single quotes", () => {
    expect(sanitizeInput('"foo"')).toBe("&quot;foo&quot;");
    expect(sanitizeInput("'bar'")).toBe("&#x27;bar&#x27;");
  });

  it("trims whitespace", () => {
    expect(sanitizeInput("  hello  ")).toBe("hello");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeInput("")).toBe("");
  });

  it("sanitizes multiple special chars", () => {
    expect(sanitizeInput('<a href="x">')).toBe(
      "&lt;a href=&quot;x&quot;&gt;",
    );
  });
});

describe("sanitizeObject", () => {
  it("sanitizes string values in object", () => {
    expect(sanitizeObject({ name: "<script>", age: 1 })).toEqual({
      name: "&lt;script&gt;",
      age: 1,
    });
  });

  it("leaves non-string values unchanged", () => {
    expect(sanitizeObject({ a: 1, b: true, c: null })).toEqual({
      a: 1,
      b: true,
      c: null,
    });
  });
});

describe("generateApplicationNo", () => {
  const currentYear = new Date().getFullYear();

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(`${currentYear}-06-15T12:00:00Z`) });
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns string in MR-YEAR-XXXX format", () => {
    const result = generateApplicationNo();
    expect(result).toMatch(new RegExp(`^MR-${currentYear}-[a-z0-9]{4}\\d{5}$`));
  });

  it("includes year", () => {
    expect(generateApplicationNo()).toContain(`MR-${currentYear}-`);
  });

  it("produces different values on different timestamps", () => {
    const a = generateApplicationNo();
    vi.advanceTimersByTime(1000);
    const b = generateApplicationNo();
    expect(a).not.toBe(b);
  });
});

describe("safeBigInt", () => {
  it("returns BigInt for valid numeric string", () => {
    expect(safeBigInt("123")).toBe(123n);
    expect(safeBigInt("0")).toBe(0n);
    expect(safeBigInt("999999999999999999")).toBe(999999999999999999n);
  });

  it("returns null for non-numeric string", () => {
    expect(safeBigInt("")).toBeNull();
    expect(safeBigInt("abc")).toBeNull();
    expect(safeBigInt("12.3")).toBeNull();
    expect(safeBigInt("-1")).toBeNull();
    expect(safeBigInt(" 123 ")).toBeNull();
  });
});

describe("apiSuccess", () => {
  it("returns object with success true and data", () => {
    const res = apiSuccess({ id: 1 });
    expect(res).toEqual({ success: true, data: { id: 1 } });
  });

  it("includes optional message", () => {
    const res = apiSuccess({ ok: true }, "Done");
    expect(res).toEqual({ success: true, data: { ok: true }, message: "Done" });
  });

  it("serializes BigInt to string for JSON compatibility", () => {
    const res = apiSuccess({ count: 100n });
    expect(res).toEqual({ success: true, data: { count: "100" } });
  });
});

describe("apiError", () => {
  it("returns Response with success false and error message", async () => {
    const res = apiError("Something failed");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ success: false, error: "Something failed" });
  });

  it("uses custom status when provided", async () => {
    const res = apiError("Not found", 404);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ success: false, error: "Not found" });
  });

  it("includes optional code in body when provided", async () => {
    const res = apiError("Validation failed", 400, "VALIDATION_ERROR");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({
      success: false,
      error: "Validation failed",
      code: "VALIDATION_ERROR",
    });
  });
});

describe("handleRouteError", () => {
  it("returns apiError response and logs", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = handleRouteError(new Error("DB fail"), "İşlem başarısız.", 500);
    consoleSpy.mockRestore();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ success: false, error: "İşlem başarısız." });
  });
});
