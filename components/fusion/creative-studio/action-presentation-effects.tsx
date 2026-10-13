"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  actionPresentationEffectCapability,
  readActionPresentationEffects,
  type ActionPresentationFamily,
} from "@/lib/fusion/creative-studio/action-presentation-effects";
import { cn } from "@/lib/utils";

export function ActionPresentationEffects({ family, value, active = true, children, className }: {
  family: ActionPresentationFamily;
  value: Readonly<Record<string, unknown>>;
  active?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const capability = actionPresentationEffectCapability(family);
  const settings = readActionPresentationEffects(value, family);
  const enabled = capability.enabled && settings.enabled && active;
  const animate = enabled && settings.motion !== "none";
  const interaction = enabled ? settings.interaction : "none";
  const variables = {
    ["--tc-action-effect-intensity" as string]: String(settings.intensity / 100),
    ["--tc-action-effect-glow" as string]: `${Math.round(5 + settings.intensity * .16)}px`,
  } as CSSProperties;
  const motionStyle = animate ? {
      animationName: `tc-motion-${settings.motion.replaceAll("_", "-")}`,
      animationDuration: `${settings.durationSeconds}s`,
      animationDelay: `${settings.delaySeconds}s`,
      animationIterationCount: settings.play === "once" ? 1 : "infinite",
      animationTimingFunction: "ease-in-out",
      animationFillMode: "both",
      animationPlayState: settings.trigger === "hover" || settings.trigger === "tap" ? "paused" : "running",
  } as CSSProperties : undefined;
  return <span
    className={cn("tc-action-effects block h-full w-full", className)}
    data-action-effects-contract={capability.contractId}
    data-action-effects-family={family}
    data-action-effects-enabled={enabled ? "true" : "false"}
    data-action-glow={enabled && settings.glow ? "true" : "false"}
    data-action-interaction={interaction}
    data-action-motion={animate ? settings.motion : "none"}
    data-motion-trigger={settings.trigger}
    data-reduced-motion-fallback={settings.reducedMotionFallback}
    style={variables}
  ><span className="tc-action-motion block h-full w-full" style={motionStyle}>{children}</span></span>;
}
