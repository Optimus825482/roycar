import { describe, it, expect } from "vitest";
import { mergeUserIntoToken, applyTokenToSession } from "./auth-callbacks";

describe("auth-callbacks", () => {
  describe("mergeUserIntoToken", () => {
    it("copies id, role, permissions, username from user to token", () => {
      const token: Record<string, unknown> = { sub: "1" };
      const user = {
        id: "42",
        role: "admin",
        permissions: { user_management: true },
        username: "admin",
      };
      const result = mergeUserIntoToken(token, user);
      expect(result.id).toBe("42");
      expect(result.role).toBe("admin");
      expect(result.permissions).toEqual({ user_management: true });
      expect(result.username).toBe("admin");
      expect(result.sub).toBe("1");
    });

    it("leaves token unchanged when user is undefined", () => {
      const token: Record<string, unknown> = { sub: "1" };
      const result = mergeUserIntoToken(token, undefined);
      expect(result).toBe(token);
      expect(result.id).toBeUndefined();
      expect(result.sub).toBe("1");
    });
  });

  describe("applyTokenToSession", () => {
    it("copies id, role, permissions, username from token to session.user", () => {
      const session = { user: { name: "Admin" }, expires: "2025-12-31" };
      const token = {
        id: "99",
        role: "editor",
        permissions: { forms_edit: true },
        username: "editor",
      };
      applyTokenToSession(
        session as { user?: Record<string, unknown> },
        token,
      );
      expect((session.user as Record<string, unknown>).id).toBe("99");
      expect((session.user as Record<string, unknown>).role).toBe("editor");
      expect((session.user as Record<string, unknown>).permissions).toEqual({
        forms_edit: true,
      });
      expect((session.user as Record<string, unknown>).username).toBe("editor");
      expect((session.user as Record<string, unknown>).name).toBe("Admin");
    });

    it("does nothing when session.user is missing", () => {
      const session = { expires: "2025-12-31" };
      const token = { id: "1", role: "admin" };
      applyTokenToSession(
        session as { user?: Record<string, unknown> },
        token,
      );
      expect(session).not.toHaveProperty("user");
    });
  });
});
