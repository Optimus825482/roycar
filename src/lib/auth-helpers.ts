import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { apiError } from "@/lib/utils";

export type SessionWithUser = Session;

type SessionOrError =
  | { ok: true; session: Session }
  | { ok: false; response: Response };

/**
 * Requires an authenticated session. Returns 401 if no session.
 * @returns Session or error Response (caller should return response if !ok)
 */
export async function requireAuth(): Promise<SessionOrError> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, response: apiError("Oturum gerekli.", 401) };
  }
  return { ok: true, session };
}

/**
 * Requires an authenticated session and the given permission.
 * Returns 401 if no session, 403 if permission is missing.
 * @param permission - Permission key (e.g. 'user_management')
 * @returns Session or error Response (caller should return response if !ok)
 */
export async function requirePermission(
  permission: string,
): Promise<SessionOrError> {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult;
  const permissions = (
    authResult.session.user as { permissions?: Record<string, boolean> }
  )?.permissions;
  if (!permissions?.[permission]) {
    return {
      ok: false,
      response: apiError("Bu işlem için yetkiniz yok.", 403),
    };
  }
  return { ok: true, session: authResult.session };
}
