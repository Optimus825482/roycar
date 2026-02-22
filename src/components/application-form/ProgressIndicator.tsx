"use client";

interface ProgressIndicatorProps {
  current: number;
  total: number;
}

export function ProgressIndicator({ current, total }: ProgressIndicatorProps) {
  const percent = total > 0 ? Math.round(((current + 1) / total) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-mr-text-muted">
        <span>
          Soru {current + 1} / {total}
        </span>
        <span>%{percent}</span>
      </div>
      <div className="w-full h-2 bg-mr-bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-mr-gold rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
