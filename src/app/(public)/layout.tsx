import Image from "next/image";
import Link from "next/link";
import { Briefcase } from "lucide-react";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-mr-cream">
      {/* Header */}
      <header className="bg-mr-navy text-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 cursor-pointer group">
            <Image
              src="/images/logo_NOBG.PNG"
              alt="Merit Royal Hotels"
              width={140}
              height={46}
              className="transition-opacity group-hover:opacity-90"
              priority
            />
          </Link>
          <nav className="hidden sm:flex items-center gap-4 text-sm">
            <Link
              href="/basvuru"
              className="inline-flex items-center gap-2 text-mr-gold-light hover:text-mr-gold transition-colors cursor-pointer"
            >
              <Briefcase className="w-4 h-4" />
              Kariyer Başvurusu
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-mr-navy text-white/60 text-sm">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center">
          <p>© {new Date().getFullYear()} Merit Royal Hotels — Kariyer</p>
          <p className="mt-1 text-white/40">Kuzey Kıbrıs Türk Cumhuriyeti</p>
        </div>
      </footer>
    </div>
  );
}
