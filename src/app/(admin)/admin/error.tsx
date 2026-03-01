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
    <div className="flex items-center justify-center py-20">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Bir hata oluştu</h2>
        <p className="text-gray-500 text-sm max-w-md">
          Bu sayfa yüklenirken bir sorun oluştu.
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
