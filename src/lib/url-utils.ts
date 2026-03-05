/** Sadece güvenli relative path döner: / ile başlayan, // içermeyen. Aksi halde "/admin". */
export function getSafeCallbackUrl(raw: string | null): string {
  const fallback = "/admin";
  if (raw == null || typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.includes("//")) return fallback;
  return trimmed;
}
