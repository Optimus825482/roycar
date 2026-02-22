import Link from "next/link";
import { MeritRoyalLogo } from "@/components/shared/MeritRoyalLogo";
import { prisma } from "@/lib/prisma";

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-mr-navy px-4">
      <MeritRoyalLogo width={240} height={80} />

      <p className="mt-2 font-body text-white/50 text-center text-sm tracking-wide">
        Mükemmelliğin gücü, doğru insanlarla başlar.
      </p>

      {activeForm ? (
        <div className="mt-10 flex flex-col items-center gap-4">
          <Link
            href="/basvuru"
            className="inline-flex items-center gap-2 px-8 py-4 bg-mr-gold text-white text-lg font-semibold rounded-xl hover:bg-mr-gold-dark transition-all shadow-lg hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-mr-gold focus:ring-offset-2 focus:ring-offset-mr-navy"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
              <path d="M14 2v6h6" />
              <path d="M12 18v-6" />
              <path d="m9 15 3-3 3 3" />
            </svg>
            Kariyer Başvurusu
          </Link>
        </div>
      ) : (
        <div className="mt-10 text-center">
          <p className="text-white/30 text-sm">
            Şu anda açık pozisyon bulunmamaktadır.
          </p>
        </div>
      )}

      <div className="mt-16 text-center">
        <Link
          href="/giris"
          className="text-white/20 text-xs hover:text-white/50 transition-colors"
        >
          Yönetim
        </Link>
      </div>
    </div>
  );
}
