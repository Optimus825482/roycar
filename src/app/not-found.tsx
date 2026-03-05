import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-mr-cream px-4">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-semibold text-mr-navy">
          Sayfa Bulunamadı
        </h2>
        <p className="text-mr-text-secondary text-sm">
          Aradığınız sayfa mevcut değil veya taşınmış olabilir.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 bg-mr-navy text-white rounded-lg text-sm font-medium hover:bg-mr-navy-light transition-colors cursor-pointer"
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  );
}
