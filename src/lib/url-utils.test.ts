import { describe, it, expect } from "vitest";
import { getSafeCallbackUrl } from "./url-utils";

describe("getSafeCallbackUrl", () => {
  it("returns /admin when raw is null", () => {
    expect(getSafeCallbackUrl(null)).toBe("/admin");
  });

  it("returns /admin when raw is empty string", () => {
    expect(getSafeCallbackUrl("")).toBe("/admin");
  });

  it("returns /admin when raw is whitespace only", () => {
    expect(getSafeCallbackUrl("  ")).toBe("/admin");
  });

  it("returns path when valid single segment", () => {
    expect(getSafeCallbackUrl("/admin")).toBe("/admin");
  });

  it("returns path when valid multi segment", () => {
    expect(getSafeCallbackUrl("/admin/ayarlar")).toBe("/admin/ayarlar");
  });

  it("returns /admin when path starts with // (protocol-relative)", () => {
    expect(getSafeCallbackUrl("//evil.com")).toBe("/admin");
  });

  it("returns /admin when path is full URL", () => {
    expect(getSafeCallbackUrl("https://evil.com")).toBe("/admin");
  });

  it("returns /admin when path contains // in the middle", () => {
    expect(getSafeCallbackUrl("/path//double")).toBe("/admin");
  });
});
