/**
 * NextAuth JWT ve session callback mantığı — test edilebilir olması için ayrı modül.
 * auth.ts callbacks bu fonksiyonları kullanır.
 */

export type JwtUser = {
  id?: string;
  role?: string;
  permissions?: unknown;
  username?: string;
};

export type SessionUser = {
  id?: string;
  role?: string;
  permissions?: unknown;
  username?: string;
};

/**
 * JWT callback: giriş sonrası user bilgisini token'a yazar.
 */
export function mergeUserIntoToken(
  token: Record<string, unknown>,
  user: JwtUser | undefined,
): Record<string, unknown> {
  if (user) {
    token.id = user.id;
    token.role = user.role;
    token.permissions = user.permissions;
    token.username = user.username;
  }
  return token;
}

/**
 * Session callback: token'dan session.user'a id, role, permissions, username kopyalar.
 */
export function applyTokenToSession(
  session: { user?: SessionUser },
  token: Record<string, unknown>,
): { user?: SessionUser } {
  if (session.user) {
    session.user.id = token.id as string;
    (session.user as { role?: string }).role = token.role as string;
    (session.user as { permissions?: unknown }).permissions = token.permissions;
    (session.user as { username?: string }).username =
      token.username as string;
  }
  return session;
}
