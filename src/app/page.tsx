import Link from "next/link";
import { MeritRoyalLogo } from "@/components/shared/MeritRoyalLogo";
import { prisma } from "@/lib/prisma";
import { FileUp, ArrowRight, Shield } from "lucide-react";

export const dynamic = "force-dynamic";

async function getActiveForm() {
  try {
    const form = await prisma.formConfig.findFirst({
      where: { isPublished: true, isActive: true },
      select: { id: true, title: true },
    });
    return form;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const activeForm = await getActiveForm();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-mr-navy px-4 overflow-hidden">
      {/* Subtle background accents */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-mr-gold/20 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-linear-to-r from-transparent via-mr-gold/20 to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 30% 20%, rgba(197,165,90,0.4) 0%, transparent 50%),
                              radial-gradient(circle at 70% 80%, rgba(197,165,90,0.3) 0%, transparent 50%)`,
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <MeritRoyalLogo width={260} height={86} />

        {/* Divider */}
        <div className="w-20 h-px bg-mr-gold/40 mt-6 mb-4" />

        <p className="font-body text-white/60 text-center text-lg sm:text-xl tracking-wide leading-relaxed">
          En İyilerle Birlikte, Daha İyisi İçin.
        </p>
        <p className="mt-3 font-(family-name:--font-handwriting) text-mr-gold text-5xl sm:text-6xl text-center">
          Hoşgeldiniz
        </p>

        {activeForm ? (
          <div className="mt-10 flex flex-col items-center gap-4">
            <Link
              href="/basvuru"
              className="group inline-flex items-center gap-3 px-8 py-4 bg-mr-gold text-white text-lg font-semibold rounded-xl hover:bg-mr-gold-dark transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.03] active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-mr-gold focus:ring-offset-2 focus:ring-offset-mr-navy"
            >
              <FileUp className="w-5 h-5" />
              Kariyer Başvurusu
              <ArrowRight className="w-4 h-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
            </Link>
            <p className="text-white/30 text-xs flex items-center gap-1.5">
              <Shield className="w-3 h-3" />
              Bilgileriniz gizli ve güvende tutulur
            </p>
          </div>
        ) : (
          <div className="mt-10 text-center">
            <p className="text-white/30 text-sm">
              Şu anda açık pozisyon bulunmamaktadır.
            </p>
          </div>
        )}
      </div>

      <footer className="absolute bottom-6 left-0 right-0 text-center space-y-2">
        <p className="text-white/25 text-xs tracking-wide">
          © {new Date().getFullYear()} Merit Royal Hotels — Tüm hakları saklıdır.
        </p>
        <Link
          href="/giris"
          className="inline-block text-white/15 text-[10px] hover:text-white/40 transition-colors mt-1 cursor-pointer"
        >
          Yönetim
        </Link>
      </footer>
    </div>
  );
}
