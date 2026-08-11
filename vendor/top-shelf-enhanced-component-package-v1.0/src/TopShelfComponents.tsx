import React from "react";
import {
  ButtonBase,
  DEFAULT_TOP_SHELF_PALETTE,
  GlossOverlay,
  IconRing,
  OuterGlowRing,
  type TopShelfIconComponent,
  type TopShelfPalette,
} from "./TopShelfPrimitives";

export function TopShelfButton({
  label,
  onClick,
  icon,
  cue = "→",
  palette = DEFAULT_TOP_SHELF_PALETTE,
  disabled = false,
}: {
  label: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  icon?: TopShelfIconComponent;
  cue?: React.ReactNode;
  palette?: TopShelfPalette;
  disabled?: boolean;
}) {
  return (
    <OuterGlowRing palette={palette} intensity={0.3}>
      <ButtonBase onClick={onClick} palette={palette} disabled={disabled}>
        <GlossOverlay intensity={0.9} />
        <span className="ts-action-content">
          {icon ? <IconRing icon={icon} size="md" palette={palette} /> : null}
          <span className="ts-action-label">{label}</span>
        </span>
        <span className="ts-action-cue" aria-hidden>{cue}</span>
      </ButtonBase>
    </OuterGlowRing>
  );
}

export function PremiumActionButton({
  label = "Unlock Access",
  description = "Tap to execute",
  onClick,
  icon,
  iconPosition = "right",
  palette = {
    ...DEFAULT_TOP_SHELF_PALETTE,
    glowStart: "rgba(245,158,11,.20)",
    glowEnd: "rgba(249,115,22,.20)",
  },
  disabled = false,
}: {
  label?: string;
  description?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  icon?: TopShelfIconComponent;
  iconPosition?: "left" | "right";
  palette?: TopShelfPalette;
  disabled?: boolean;
}) {
  const ring = icon ? <IconRing icon={icon} size="lg" palette={palette} /> : null;
  return (
    <OuterGlowRing palette={palette} intensity={0.5}>
      <ButtonBase
        onClick={onClick}
        palette={palette}
        disabled={disabled}
        className="ts-premium-action"
      >
        <GlossOverlay />
        {iconPosition === "left" ? ring : null}
        <span className="ts-copy-stack">
          <span className="ts-copy-stack__label">{label}</span>
          {description ? <span className="ts-copy-stack__description">{description}</span> : null}
        </span>
        {iconPosition === "right" ? ring : null}
      </ButtonBase>
    </OuterGlowRing>
  );
}

export function CircularRingButton({
  icon,
  onClick,
  ariaLabel,
  palette = {
    ...DEFAULT_TOP_SHELF_PALETTE,
    glowStart: "rgba(6,182,212,.30)",
    glowEnd: "rgba(37,99,235,.30)",
  },
  disabled = false,
}: {
  icon: TopShelfIconComponent;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  ariaLabel: string;
  palette?: TopShelfPalette;
  disabled?: boolean;
}) {
  const Icon = icon;
  return (
    <OuterGlowRing palette={palette} intensity={0.55}>
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        disabled={disabled}
        className="ts-circular-button"
        style={{
          "--ts-face-top": palette.faceTop,
          "--ts-face-mid": palette.faceMid,
          "--ts-face-bottom": palette.faceBottom,
          "--ts-border": palette.border,
          "--ts-icon": palette.icon,
        } as React.CSSProperties}
      >
        <GlossOverlay />
        <span className="ts-circular-button__inner">
          <Icon className="ts-circular-button__icon" aria-hidden />
        </span>
      </button>
    </OuterGlowRing>
  );
}
