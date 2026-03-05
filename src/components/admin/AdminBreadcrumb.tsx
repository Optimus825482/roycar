"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const SEGMENT_LABELS: Record<string, string> = {
  admin: "Dashboard",
  basvurular: "Başvurular",
  "form-builder": "Form Builder",
  "on-eleme": "Başvuru Değerlendirme",
  "aday-gruplari": "Aday Grupları",
  chat: "AI Asistan",
  "veri-aktarimi": "Veri Aktarımı",
  organizasyon: "Org Şeması",
  ayarlar: "Ayarlar",
};

function getSegmentLabel(segment: string, prevSegments: string[]): string {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  const parent = prevSegments[prevSegments.length - 1];
  if (parent === "basvurular") return "Detay";
  if (parent === "form-builder") return "Düzenle";
  if (parent === "on-eleme") return "Oturum";
  if (parent === "aday-gruplari") return "Grup";
  if (/^\d+$/.test(segment)) return "Detay";
  return segment;
}

export function AdminBreadcrumb() {
  const pathname = usePathname();
  if (!pathname?.startsWith("/admin")) return null;

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return null;

  const items: { href: string; label: string }[] = [];
  let acc = "";
  for (let i = 0; i < segments.length; i++) {
    acc += (acc ? "/" : "") + segments[i];
    const label = getSegmentLabel(segments[i], segments.slice(0, i));
    items.push({ href: "/" + acc, label });
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-4 flex items-center gap-1.5 text-sm text-mr-text-secondary"
    >
      {items.map((item, i) => (
        <span key={item.href} className="flex items-center gap-1.5">
          {i > 0 && (
            <ChevronRight className="w-4 h-4 shrink-0 text-mr-text-muted" />
          )}
          {i < items.length - 1 ? (
            <Link
              href={item.href}
              className="hover:text-mr-navy hover:underline cursor-pointer"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-mr-navy">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
