"use client";

import { useState } from "react";
import { WizardContainer } from "@/components/application-form/WizardContainer";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export default function ApplicationPage() {
  const [showWelcome, setShowWelcome] = useState(true);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      {/* Hoşgeldiniz Dialog */}
      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-md border-mr-gold/30 bg-linear-to-b from-[#1a1a2e] to-[#16213e] shadow-2xl"
        >
          <VisuallyHidden>
            <DialogTitle>Hoşgeldiniz</DialogTitle>
          </VisuallyHidden>
          <div className="my-2">
            <div className="w-12 h-px bg-mr-gold/50 mx-auto" />
          </div>

          <p className="text-white/80 text-sm leading-relaxed text-center px-2">
            Merit Royal&apos;ın prestijini ve tecrübesini yaşamak, varlığınızla
            katkıda bulunmak üzere ilk adımı atmak üzeresiniz. Sizi aramızda
            görmeyi umut ediyoruz.
          </p>
          <p className="text-mr-gold/70 text-xs text-center italic">
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
      <div className="bg-white rounded-xl shadow-sm border p-6 sm:p-8">
        <WizardContainer />
      </div>
    </div>
  );
}
