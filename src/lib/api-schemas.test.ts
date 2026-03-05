import { describe, it, expect } from "vitest";
import {
  applyBodySchema,
  adminUserCreateSchema,
  adminUserUpdateSchema,
} from "./api-schemas";

describe("applyBodySchema", () => {
  it("accepts valid apply body", () => {
    const result = applyBodySchema.safeParse({
      formConfigId: 1,
      fullName: "Test User",
      email: "test@example.com",
      phone: "+905551234567",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = applyBodySchema.safeParse({
      fullName: "Test",
      email: "a@b.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = applyBodySchema.safeParse({
      formConfigId: 1,
      fullName: "Test",
      email: "not-an-email",
      phone: "123",
    });
    expect(result.success).toBe(false);
  });
});

describe("adminUserCreateSchema", () => {
  it("accepts valid user create body", () => {
    const result = adminUserCreateSchema.safeParse({
      username: "newuser",
      fullName: "New User",
      password: "password123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.username).toBe("newuser");
      expect(result.data.fullName).toBe("New User");
    }
  });

  it("trims and lowercases username", () => {
    const result = adminUserCreateSchema.safeParse({
      username: "  AdminUser  ",
      fullName: "  Full Name  ",
      password: "secret123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.username).toBe("adminuser");
      expect(result.data.fullName).toBe("Full Name");
    }
  });

  it("rejects short password", () => {
    const result = adminUserCreateSchema.safeParse({
      username: "u",
      fullName: "U",
      password: "12345",
    });
    expect(result.success).toBe(false);
  });
});

describe("adminUserUpdateSchema", () => {
  it("accepts partial update", () => {
    const result = adminUserUpdateSchema.safeParse({
      fullName: "Updated Name",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = adminUserUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
