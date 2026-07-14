import Image from "next/image";
import { TAP_CONNECT_BRAND, TAP_CONNECT_LOGO } from "@/lib/brand/assets";
import { cn } from "@/lib/utils";

type TapConnectLogoProps = {
  /** Mark/square for nav & favicon-style spots */
  variant?: "mark" | "full";
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  alt?: string;
};

/** Shared Tap Connect logo — use mark in cramped UI, full on marketing surfaces. */
export function TapConnectLogo({
  variant = "mark",
  className,
  imgClassName,
  priority = false,
  alt = TAP_CONNECT_BRAND.name,
}: TapConnectLogoProps) {
  const size = variant === "full" ? { width: 240, height: 240 } : { width: 72, height: 72 };

  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <Image
        src={TAP_CONNECT_LOGO}
        alt={alt}
        width={size.width}
        height={size.height}
        priority={priority}
        className={cn(
          "object-contain",
          variant === "mark" ? "h-9 w-9 rounded-lg" : "h-16 w-auto sm:h-20",
          imgClassName
        )}
      />
    </span>
  );
}
