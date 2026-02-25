import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  width?: number;
  height?: number;
  className?: string;
  variant?: "light" | "dark";
}

export function BrandLogo({
  width = 36,
  height = 36,
  className,
  variant = "light",
}: BrandLogoProps) {
  return (
    <Image
      src="/images/logo.png"
      alt="F&B Career System"
      width={width}
      height={height}
      className={cn(
        "rounded-md",
        variant === "dark" ? "brightness-0" : "",
        className,
      )}
      priority
    />
  );
}
