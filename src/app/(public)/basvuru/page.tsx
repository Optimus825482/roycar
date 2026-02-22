"use client";

import { WizardContainer } from "@/components/application-form/WizardContainer";

export default function ApplicationPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <div className="text-center mb-8">
        <p className="text-mr-text-secondary mt-2">
          Mükemmelliğin gücü, doğru insanlarla başlar.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6 sm:p-8">
        <WizardContainer />
      </div>
    </div>
  );
}
