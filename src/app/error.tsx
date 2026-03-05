"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-mr-cream px-4">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-semibold text-mr-navy">
          Bir hata oluştu
        </h2>
        <p className="text-mr-text-secondary text-sm max-w-md">
          Beklenmeyen bir sorun oluştu. Lütfen tekrar deneyin.
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-mr-navy text-white rounded-lg text-sm font-medium hover:bg-mr-navy-light transition-colors cursor-pointer"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  );
}
