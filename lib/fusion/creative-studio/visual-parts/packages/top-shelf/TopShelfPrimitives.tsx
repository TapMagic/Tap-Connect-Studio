import React, { type CSSProperties, type ReactNode } from "react";

export type TopShelfPalette = Readonly<{
  glowStart: string;
  glowEnd: string;
  faceTop: string;
  faceMid: string;
  faceBottom: string;
  border: string;
  text: string;
  mutedText: string;
  icon: string;
}>;

export const DEFAULT_TOP_SHELF_PALETTE: TopShelfPalette = {
  glowStart: "rgba(59,130,246,.30)",
  glowEnd: "rgba(168,85,247,.30)",
  faceTop: "#404040",
  faceMid: "#171717",
  faceBottom: "#000000",
  border: "rgba(255,255,255,.25)",
  text: "#ffffff",
  mutedText: "#a3a3a3",
  icon: "#ffffff",
};

function paletteVars(palette: TopShelfPalette): CSSProperties {
  return {
    "--ts-glow-start": palette.glowStart,
    "--ts-glow-end": palette.glowEnd,
    "--ts-face-top": palette.faceTop,
    "--ts-face-mid": palette.faceMid,
    "--ts-face-bottom": palette.faceBottom,
    "--ts-border": palette.border,
    "--ts-text": palette.text,
    "--ts-muted-text": palette.mutedText,
    "--ts-icon": palette.icon,
  } as CSSProperties;
}

export function OuterGlowRing({
  children,
  palette = DEFAULT_TOP_SHELF_PALETTE,
  intensity = 0.5,
  className = "",
}: {
  children: ReactNode;
  palette?: TopShelfPalette;
  intensity?: number;
  className?: string;
}) {
  return (
    <span
      className={`ts-outer-glow ${className}`}
      style={{
        ...paletteVars(palette),
        "--ts-glow-opacity": String(Math.min(1, Math.max(0, intensity))),
      } as CSSProperties}
    >
      <span aria-hidden className="ts-outer-glow__halo" />
      {children}
    </span>
  );
}

export function ButtonBase({
  children,
  onClick,
  palette = DEFAULT_TOP_SHELF_PALETTE,
  className = "",
  disabled = false,
  type = "button",
  ariaLabel,
  style,
  /** Studio composition may nest inside an Action <a> — use span to avoid nested interactive. */
  as = "button",
}: {
  children: ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  palette?: TopShelfPalette;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  ariaLabel?: string;
  style?: CSSProperties;
  as?: "button" | "span";
}) {
  const classNames = `ts-button-base ${className}`;
  const mergedStyle = { ...paletteVars(palette), ...style };
  if (as === "span") {
    return (
      <span
        className={classNames}
        style={mergedStyle}
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        data-ts-disabled={disabled ? "true" : undefined}
      >
        {children}
      </span>
    );
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={classNames}
      style={mergedStyle}
    >
      {children}
    </button>
  );
}

export function GlossOverlay({ intensity = 1 }: { intensity?: number }) {
  return (
    <span
      aria-hidden
      className="ts-gloss-overlay"
      style={{ opacity: Math.min(1, Math.max(0, intensity)) }}
    />
  );
}

export type TopShelfIconComponent = React.ComponentType<{
  className?: string;
  "aria-hidden"?: boolean;
}>;

export function IconRing({
  icon: Icon,
  size = "md",
  palette = DEFAULT_TOP_SHELF_PALETTE,
}: {
  icon?: TopShelfIconComponent;
  size?: "sm" | "md" | "lg";
  palette?: TopShelfPalette;
}) {
  return (
    <span
      className="ts-icon-ring"
      data-size={size}
      style={paletteVars(palette)}
      aria-hidden={!Icon || undefined}
    >
      <span aria-hidden className="ts-icon-ring__highlight" />
      {Icon ? <Icon className="ts-icon-ring__icon" aria-hidden /> : null}
    </span>
  );
}
