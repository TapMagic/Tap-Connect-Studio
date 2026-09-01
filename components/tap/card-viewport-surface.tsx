import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const STUDIO_PHONE_VIEWPORT_WIDTH_PX = 390;

/**
 * Shared geometry boundary for the Card on a real phone and in Studio Device
 * View. Runtime fills the actual phone width; Studio uses the canonical 390px
 * representative width and may scale the whole boundary without reflowing it.
 */
export function CardViewportSurface({
  children,
  environment,
  className,
  style,
  testId = "card-viewport-surface",
  ...data
}: {
  children: ReactNode;
  environment: "studio" | "runtime";
  className?: string;
  style?: CSSProperties;
  testId?: string;
} & Record<`data-${string}`, string | number | boolean | undefined>) {
  return (
    <div
      className={cn(
        "min-w-0 w-full",
        environment === "studio"
          ? "max-w-[390px]"
          : "mx-auto max-w-[512px]",
        className
      )}
      style={style}
      data-testid={testId}
      data-card-viewport-authority="phone-v1"
      data-viewport-environment={environment}
      data-canonical-studio-width={STUDIO_PHONE_VIEWPORT_WIDTH_PX}
      {...data}
    >
      {children}
    </div>
  );
}
