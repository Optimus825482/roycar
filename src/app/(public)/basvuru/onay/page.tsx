"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const applicationNo = searchParams.get("no") || "—";
  const [showQR, setShowQR] = useState(false);

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
      <div className="text-6xl">✅</div>

      <h1 className="text-3xl font-heading font-semibold text-mr-navy">
        Başvurunuz Alındı
      </h1>

      <p className="text-mr-text-secondary text-lg">
        Başvurunuz başarıyla kaydedildi. Ekibimiz en kısa sürede değerlendirme
        yapacaktır.
      </p>

      <div className="bg-mr-cream rounded-xl border border-mr-gold/30 p-6 inline-block">
        <p className="text-sm text-mr-text-muted mb-1">Başvuru Numaranız</p>
        <p className="text-2xl font-mono font-bold text-mr-navy tracking-wider">
          {applicationNo}
        </p>
      </div>

      <p className="text-sm text-mr-text-muted">
        Bu numarayı not alınız. Başvuru durumunuzu takip etmek için
        kullanabilirsiniz.
      </p>

      {/* QR Kod Bölümü */}
      <div className="pt-4 space-y-3">
        <button
          onClick={() => setShowQR(!showQR)}
          className="text-sm text-mr-gold hover:text-mr-gold-dark underline transition-colors"
          aria-expanded={showQR}
          aria-controls="qr-section"
        >
          {showQR ? "QR Kodu Gizle" : "Başvuru Linkini Paylaş (QR Kod)"}
        </button>

        {showQR && (
          <div id="qr-section" className="space-y-2">
            <Image
              src="/api/apply/qrcode"
              alt="Kariyer başvuru QR kodu"
              width={200}
              height={200}
              className="mx-auto rounded-lg border border-mr-gold/20"
              unoptimized
            />
            <p className="text-xs text-mr-text-muted">
              Bu QR kodu taratarak kariyer sayfasına ulaşabilirsiniz.
            </p>
          </div>
        )}
      </div>

      <Link
        href="/"
        className="inline-block mt-4 px-6 py-3 bg-mr-navy text-white rounded-lg hover:bg-mr-navy-light transition-colors"
      >
        Ana Sayfaya Dön
      </Link>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <p className="text-mr-text-muted">Yükleniyor...</p>
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
