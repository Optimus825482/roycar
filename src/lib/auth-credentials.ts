/**
 * Admin giriş kimlik doğrulama mantığı — test edilebilir olması için ayrı modül.
 * auth.ts Credentials provider authorize bu fonksiyonu kullanır.
 */
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export type ValidatedAdminUser = {
  id: string;
  email: string;
  name: string;
  username: string;
  role: string | null;
  permissions: unknown;
};

/**
 * Kullanıcı adı ve parola ile admin kullanıcı doğrular.
 * @throws Error "Kullanıcı adı ve parola gereklidir." | "Geçersiz kimlik bilgileri."
 */
export async function validateAdminCredentials(credentials: {
  username?: string | null;
  password?: string | null;
}): Promise<ValidatedAdminUser> {
  if (!credentials?.username || !credentials?.password) {
    throw new Error("Kullanıcı adı ve parola gereklidir.");
  }

  const user = await prisma.adminUser.findUnique({
    where: { username: credentials.username as string },
  });

  if (!user || !user.isActive) {
    throw new Error("Geçersiz kimlik bilgileri.");
  }

  const isValid = await compare(
    credentials.password as string,
    user.passwordHash,
  );

  if (!isValid) {
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
}
