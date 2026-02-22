import Image from "next/image";
import { cn } from "@/lib/utils";

interface MeritRoyalLogoProps {
  width?: number;
  height?: number;
  className?: string;
  variant?: "light" | "dark";
}

export function MeritRoyalLogo({
  width = 180,
  height = 60,
  className,
  variant = "light",
}: MeritRoyalLogoProps) {
  return (
    <Image
      src="/images/logo_NOBG.PNG"
      alt="Merit Royal Hotels"
      width={width}
      height={height}
      className={cn(
        variant === "dark" ? "brightness-0" : "",
        className,
      )}
      priority
    />
  );
}
