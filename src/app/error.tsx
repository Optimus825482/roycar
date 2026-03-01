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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-semibold text-gray-800">
          Bir hata oluştu
        </h2>
        <p className="text-gray-500 text-sm max-w-md">
          Beklenmeyen bir sorun oluştu. Lütfen tekrar deneyin.
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-[#0f172a] text-white rounded-lg text-sm font-medium hover:bg-[#1e293b] transition-colors"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  );
}
