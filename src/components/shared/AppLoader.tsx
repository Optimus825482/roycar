"use client";

import { cn } from "@/lib/utils";

interface AppLoaderProps {
  size?: "sm" | "md" | "lg" | "xl";
  text?: string;
  className?: string;
  variant?: "spinner" | "pulse" | "dots" | "skeleton";
  fullPage?: boolean;
}

const sizeConfig = {
  sm: { ring: "w-5 h-5", text: "text-xs", gap: "gap-2" },
  md: { ring: "w-8 h-8", text: "text-sm", gap: "gap-3" },
  lg: { ring: "w-12 h-12", text: "text-base", gap: "gap-4" },
  xl: { ring: "w-16 h-16", text: "text-lg", gap: "gap-5" },
};

/* ─── Brand Spinner: çift halka navy + gold ─── */
function BrandSpinner({ size = "md" }: { size?: AppLoaderProps["size"] }) {
  const s = sizeConfig[size || "md"];
  return (
    <div className={cn("relative", s.ring)}>
      {/* Dış halka - navy */}
      <div
        className={cn(
          "absolute inset-0 rounded-full border-2 border-mr-navy/20 border-t-mr-navy animate-spin",
          s.ring,
        )}
      />
      {/* İç halka - gold, ters yön */}
      <div
        className={cn(
          "absolute inset-1 rounded-full border-2 border-mr-gold/20 border-b-mr-gold animate-spin",
          "animate-[spin_0.8s_linear_reverse_infinite]",
        )}
      />
    </div>
  );
}

/* ─── Brand Pulse Dots ─── */
function BrandDots() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2.5 h-2.5 rounded-full bg-mr-gold"
          style={{
            animation: `brandPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Brand Pulse Logo Effect ─── */
function BrandPulse({ size = "md" }: { size?: AppLoaderProps["size"] }) {
  const s = sizeConfig[size || "md"];
  return (
    <div className={cn("relative flex items-center justify-center", s.ring)}>
      <div className="absolute inset-0 rounded-full bg-mr-gold/20 animate-ping" />
      <div className="absolute inset-1 rounded-full bg-mr-navy/10 animate-pulse" />
      <div className="relative w-3/5 h-3/5 rounded-full bg-linear-to-br from-mr-navy to-mr-gold" />
    </div>
  );
}

/* ─── Skeleton Row ─── */
export function AppSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-linear-to-r from-slate-200 via-mr-gold/10 to-slate-200 bg-size-[200%_100%]",
        "animate-[shimmer_1.5s_ease-in-out_infinite]",
        className,
      )}
    />
  );
}

/* ─── Table Skeleton ─── */
export function AppTableSkeleton({
  rows = 5,
  cols = 7,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="py-4 px-4">
              <AppSkeleton
                className={cn(
                  "h-4",
                  j === 1 ? "w-32" : j === 0 ? "w-20" : "w-16",
                )}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* ─── Main Loader ─── */
export function AppLoader({
  size = "md",
  text,
  className,
  variant = "spinner",
  fullPage = false,
}: AppLoaderProps) {
  const s = sizeConfig[size];

  const loaderContent = (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        s.gap,
        className,
      )}
      role="status"
      aria-label="Yükleniyor"
    >
      {variant === "spinner" && <BrandSpinner size={size} />}
      {variant === "pulse" && <BrandPulse size={size} />}
      {variant === "dots" && <BrandDots />}
      {text && (
        <span
          className={cn(
            s.text,
            "text-mr-text-secondary font-medium animate-pulse",
          )}
        >
          {text}
        </span>
      )}
      <span className="sr-only">Yükleniyor</span>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        {loaderContent}
      </div>
    );
  }

  return loaderContent;
}
