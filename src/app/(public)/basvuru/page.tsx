"use client";

import { WizardContainer } from "@/components/application-form/WizardContainer";

export default function ApplicationPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <div className="text-center mb-8">
        <p className="text-mr-text-secondary text-sm tracking-wide">
          Sektörün En İyileriyle, En İyisi İçin.
        </p>
        <p className="font-(family-name:--font-handwriting) text-mr-gold text-2xl mt-1">
          Hoşgeldiniz
        </p>
        <div className="mt-4 mx-auto max-w-lg text-mr-text-secondary/80 text-sm leading-relaxed">
          <p>
            Merit Royal&apos;ın prestijini ve tecrübesini yaşamak, varlığınızla katkıda bulunmak üzere ilk adımı atmak üzeresiniz.
            Sizi aramızda görmeyi umut ediyoruz. Umarız her şey istediğiniz gibi olur.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6 sm:p-8">
        <WizardContainer />
      </div>
    </div>
  );
}
