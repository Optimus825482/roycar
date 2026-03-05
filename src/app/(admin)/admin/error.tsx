"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center py-20 bg-mr-cream/50 rounded-lg">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold text-mr-navy">Bir hata oluştu</h2>
        <p className="text-mr-text-secondary text-sm max-w-md">
          Bu sayfa yüklenirken bir sorun oluştu.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-mr-navy text-white rounded-lg text-sm font-medium hover:bg-mr-navy-light transition-colors cursor-pointer"
          >
            Tekrar Dene
          </button>
          <a
            href="/admin"
            className="px-6 py-2.5 bg-mr-gold text-mr-navy rounded-lg text-sm font-medium hover:bg-mr-gold-dark transition-colors cursor-pointer"
          >
            Admin’e dön
          </a>
        </div>
      </div>
    </div>
  );
}
