import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Kullanıcı Adı", type: "text" },
        password: { label: "Parola", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          console.error("[AUTH DEBUG] Missing credentials", { hasUsername: !!credentials?.username, hasPassword: !!credentials?.password });
          throw new Error("Kullanıcı adı ve parola gereklidir.");
        }

        console.log("[AUTH DEBUG] Login attempt for:", credentials.username);

        const user = await prisma.adminUser.findUnique({
          where: { username: credentials.username as string },
        });

        console.log("[AUTH DEBUG] User found:", !!user, user ? { id: user.id, username: user.username, isActive: user.isActive, hashLength: user.passwordHash?.length } : 'null');

        if (!user || !user.isActive) {
          console.error("[AUTH DEBUG] User not found or inactive");
          throw new Error("Geçersiz kimlik bilgileri.");
        }

        const isValid = await compare(
          credentials.password as string,
          user.passwordHash,
        );

        console.log("[AUTH DEBUG] Password compare result:", isValid);

        if (!isValid) {
          console.error("[AUTH DEBUG] Password mismatch for user:", user.username);
          throw new Error("Geçersiz kimlik bilgileri.");
        }

        return {
          id: user.id.toString(),
          email: user.email || "",
          name: user.fullName,
          username: user.username,
          role: user.role,
          permissions: user.permissions,
        };
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
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.permissions = (user as { permissions?: unknown }).permissions;
        token.username = (user as { username?: string }).username;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { permissions?: unknown }).permissions =
          token.permissions;
        (session.user as { username?: string }).username =
          token.username as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
});
