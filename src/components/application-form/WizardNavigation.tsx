"use client";

import { Button } from "@/components/ui/button";

interface WizardNavigationProps {
  canGoBack: boolean;
  canGoForward: boolean;
  isLastQuestion: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function WizardNavigation({
  canGoBack,
  canGoForward,
  isLastQuestion,
  isSubmitting,
  onBack,
  onNext,
  onSubmit,
}: WizardNavigationProps) {
  return (
    <nav
      className="flex items-center justify-between pt-4"
      aria-label="Form navigasyonu"
    >
      <Button
        variant="outline"
        onClick={onBack}
        disabled={!canGoBack}
        className="min-w-[100px] focus:ring-2 focus:ring-mr-gold focus:ring-offset-2"
        aria-label="Önceki soruya dön"
      >
        ← Geri
      </Button>

      {isLastQuestion ? (
        <Button
          onClick={onSubmit}
          disabled={isSubmitting || !canGoForward}
          className="min-w-[140px] bg-mr-gold hover:bg-mr-gold-dark text-white focus:ring-2 focus:ring-mr-gold focus:ring-offset-2"
          aria-label="Başvuruyu gözden geçir"
        >
          {isSubmitting ? "Gönderiliyor..." : "Başvuruyu Gönder"}
        </Button>
      ) : (
        <Button
          onClick={onNext}
          disabled={!canGoForward}
          className="min-w-[100px] bg-mr-navy hover:bg-mr-navy-light text-white focus:ring-2 focus:ring-mr-gold focus:ring-offset-2"
          aria-label="Sonraki soruya geç"
        >
          İleri →
        </Button>
      )}
    </nav>
  );
}
