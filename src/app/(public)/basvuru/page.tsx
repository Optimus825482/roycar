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
            <DialogDescription className="text-mr-text-primary text-sm tracking-widest uppercase font-medium">
              En İyilerle Birlikte, Daha İyisi İçin.
            </DialogDescription>
            <DialogTitle className="font-(family-name:--font-handwriting) text-mr-gold text-3xl font-normal mt-1">
              Hoşgeldiniz
            </DialogTitle>
          </DialogHeader>

          <div className="my-2">
            <div className="w-12 h-px bg-mr-gold/40 mx-auto" />
          </div>

          <p className="text-mr-text-primary/90 text-sm leading-relaxed text-center px-2">
            Merit Royal&apos;ın prestijini ve tecrübesini yaşamak, varlığınızla
            katkıda bulunmak üzere ilk adımı atmak üzeresiniz. Sizi aramızda
            görmeyi umut ediyoruz.
          </p>
          <p className="text-mr-gold/80 text-xs text-center italic">
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
