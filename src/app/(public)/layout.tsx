import Image from "next/image";
import Link from "next/link";
import { Briefcase, Network } from "lucide-react";

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
          <Link
            href="/"
            className="flex items-center gap-3 cursor-pointer group"
          >
            <Image
              src="/images/logo.png"
              alt="F&B Career System"
              width={36}
              height={36}
              className="rounded-md transition-opacity group-hover:opacity-90"
              priority
            />
            <span className="text-sm font-semibold tracking-wide text-white/90">
              F&B Career System
            </span>
          </Link>
          <nav className="hidden sm:flex items-center gap-4 text-sm">
            <Link
              href="/organizasyon"
              className="inline-flex items-center gap-2 text-white/70 hover:text-mr-gold transition-colors cursor-pointer"
            >
              <Network className="w-4 h-4" />
              Organizasyon
            </Link>
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
          <p>© {new Date().getFullYear()} F&B Career System — Kariyer</p>
          <p className="mt-1 text-white/40">Kuzey Kıbrıs Türk Cumhuriyeti</p>
        </div>
      </footer>
    </div>
  );
}
