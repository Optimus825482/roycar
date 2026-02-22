import Image from "next/image";

interface MeritRoyalLogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export function MeritRoyalLogo({
  width = 180,
  height = 60,
  className,
}: MeritRoyalLogoProps) {
  return (
    <Image
      src="/images/logo.png"
      alt="Merit Royal Hotels"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}
