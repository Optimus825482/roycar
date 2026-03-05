import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { validateAdminCredentials } from "@/lib/auth-credentials";
import {
  mergeUserIntoToken,
  applyTokenToSession,
} from "@/lib/auth-callbacks";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Kullanıcı Adı", type: "text" },
        password: { label: "Parola", type: "password" },
      },
      async authorize(credentials) {
        return validateAdminCredentials({
          username: credentials?.username as string | null | undefined,
          password: credentials?.password as string | null | undefined,
        });
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 60, // 30 dakika
  },
  pages: {
    signIn: "/giris",
  },
  callbacks: {
    jwt({ token, user }) {
      return mergeUserIntoToken(
        token as Record<string, unknown>,
        user as { id?: string; role?: string; permissions?: unknown; username?: string },
      ) as typeof token;
    },
    session({ session, token }) {
      applyTokenToSession(
        session as unknown as { user?: Record<string, unknown> },
        token as Record<string, unknown>,
      );
      return session;
    },
  },
  secret:
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    (() => {
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "NEXTAUTH_SECRET or AUTH_SECRET must be set in production",
        );
      }
      return "dev-secret-not-for-production";
    })(),
});
