"use client";

import { useState } from "react";
import { WizardContainer } from "@/components/application-form/WizardContainer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ApplicationPage() {
  const [showWelcome, setShowWelcome] = useState(true);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      {/* Hoşgeldiniz Dialog */}
      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-md border-mr-gold/20 bg-mr-cream shadow-xl"
        >
          <DialogHeader className="items-center text-center">
            <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-mr-gold/10 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-8 h-8 text-mr-gold"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <DialogTitle className="font-(family-name:--font-handwriting) text-mr-gold text-3xl font-normal">
              Hoşgeldiniz
            </DialogTitle>
            <DialogDescription className="text-mr-text-secondary text-xs tracking-widest uppercase mt-1">
              En İyilerle Birlikte, Daha İyisi İçin.
            </DialogDescription>
          </DialogHeader>

          <div className="my-2">
            <div className="w-12 h-px bg-mr-gold/30 mx-auto" />
          </div>

          <p className="text-mr-text-secondary/80 text-sm leading-relaxed text-center px-2">
            Merit Royal&apos;ın prestijini ve tecrübesini yaşamak, varlığınızla
            katkıda bulunmak üzere ilk adımı atmak üzeresiniz. Sizi aramızda
            görmeyi umut ediyoruz.
          </p>
          <p className="text-mr-text-secondary/60 text-xs text-center italic">
            Umarız her şey istediğiniz gibi olur.
          </p>

          <button
            onClick={() => setShowWelcome(false)}
            className="mt-4 w-full py-3 rounded-lg bg-mr-gold text-white font-medium text-sm tracking-wide hover:bg-mr-gold/90 transition-colors cursor-pointer"
          >
            Başvuruya Başla
          </button>
        </DialogContent>
      </Dialog>

      {/* Sayfa İçeriği */}
      <div className="text-center mb-8">
        <p className="text-mr-text-secondary text-sm tracking-wide">
          En İyilerle Birlikte, Daha İyisi İçin.
        </p>
        <p className="font-(family-name:--font-handwriting) text-mr-gold text-2xl mt-1">
          Hoşgeldiniz
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6 sm:p-8">
        <WizardContainer />
      </div>
    </div>
  );
}
