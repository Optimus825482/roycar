import { MeritRoyalLogo } from "./MeritRoyalLogo";

interface BrandHeaderProps {
  subtitle?: string;
}

export function BrandHeader({ subtitle }: BrandHeaderProps) {
  return (
    <header className="bg-mr-navy px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <MeritRoyalLogo />
        {subtitle && (
          <span className="font-body text-sm text-mr-gold-light">
            {subtitle}
          </span>
        )}
      </div>
    </header>
  );
}
