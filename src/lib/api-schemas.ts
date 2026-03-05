import { z } from "zod";

// ─── Apply (başvuru) body ───

const answerEntrySchema = z.object({
  answerText: z.string().optional(),
  answerJson: z.unknown().optional(),
  answerFile: z.string().optional(),
});

export const applyBodySchema = z.object({
  formConfigId: z.union([z.string(), z.number()]),
  fullName: z.string().min(1, "Ad soyad zorunludur"),
  email: z.string().email("Geçerli e-posta girin"),
  phone: z.string().min(1, "Telefon zorunludur"),
  answers: z.record(z.string(), answerEntrySchema).optional(),
  departmentId: z.union([z.string(), z.number()]).optional(),
  positionId: z.union([z.string(), z.number()]).optional(),
  positionTitle: z.string().optional(),
  photoPath: z.string().optional(),
});

export type ApplyBody = z.infer<typeof applyBodySchema>;

// ─── Admin user permissions object (JSON shape) ───

export const adminPermissionsSchema = z
  .record(z.string(), z.boolean())
  .optional();

export type AdminPermissions = z.infer<typeof adminPermissionsSchema>;

// ─── Admin user create ───

export const adminUserCreateSchema = z.object({
  username: z.string().min(1, "Kullanıcı adı zorunludur").transform((s) => s.trim().toLowerCase()),
  fullName: z.string().min(1, "Ad soyad zorunludur").transform((s) => s.trim()),
  password: z.string().min(6, "Parola en az 6 karakter olmalıdır"),
  email: z.string().optional().transform((s) => s?.trim() || undefined),
  role: z.string().optional(),
  permissions: adminPermissionsSchema,
});

export type AdminUserCreateBody = z.infer<typeof adminUserCreateSchema>;

// ─── Admin user update ───

export const adminUserUpdateSchema = z.object({
  username: z.string().min(1).transform((s) => s.trim().toLowerCase()).optional(),
  fullName: z.string().min(1).transform((s) => s.trim()).optional(),
  email: z.string().optional().transform((s) => s?.trim() || null),
  role: z.string().optional(),
  permissions: adminPermissionsSchema,
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export type AdminUserUpdateBody = z.infer<typeof adminUserUpdateSchema>;
