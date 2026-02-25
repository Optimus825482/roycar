import { BrandLogo } from "./BrandLogo";

interface BrandHeaderProps {
  subtitle?: string;
}

export function BrandHeader({ subtitle }: BrandHeaderProps) {
  return (
    <header className="bg-mr-navy px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo />
          <span className="text-sm font-semibold tracking-wide text-white/90">
            F&B Career System
          </span>
        </div>
        {subtitle && (
          <span className="font-body text-sm text-mr-gold-light">
            {subtitle}
          </span>
        )}
      </div>
    </header>
  );
}
