/**
 * Independent Border capability — style / width / color / radius.
 * Border None clears object border residues without touching selection chrome.
 */

export type BorderStyle = "none" | "solid" | "dashed" | "dotted" | "double";

export type BorderModel = {
  style: BorderStyle;
  width: number;
  color: string;
  radiusLinked: boolean;
  radius: number;
  radiusTopLeft: number;
  radiusTopRight: number;
  radiusBottomRight: number;
  radiusBottomLeft: number;
};

export const DEFAULT_BORDER: BorderModel = {
  style: "none",
  width: 0,
  color: "#ffffff",
  radiusLinked: true,
  radius: 0,
  radiusTopLeft: 0,
  radiusTopRight: 0,
  radiusBottomRight: 0,
  radiusBottomLeft: 0,
};

export function readBorderFromProps(props: Record<string, unknown>): BorderModel {
  const width = Number(props.borderWidth ?? props.strokeWidth ?? props.outlineWidth ?? 0);
  const style = (String(props.borderStyle || (width > 0 ? "solid" : "none")) as BorderStyle);
  const radius = Number(props.radius ?? props.outlineRadius ?? 0);
  return {
    style: width <= 0 || style === "none" ? "none" : style,
    width: style === "none" ? 0 : width,
    color: String(props.borderColor || props.stroke || props.outlineColor || "#ffffff"),
    radiusLinked: props.cornersLinked !== false,
    radius,
    radiusTopLeft: Number(props.radiusTopLeft ?? radius),
    radiusTopRight: Number(props.radiusTopRight ?? radius),
    radiusBottomRight: Number(props.radiusBottomRight ?? radius),
    radiusBottomLeft: Number(props.radiusBottomLeft ?? radius),
  };
}

/** Completely remove border visual residues (not selection chrome). */
export function clearBorderProps(props: Record<string, unknown>): Record<string, unknown> {
  return {
    ...props,
    borderStyle: "none",
    borderWidth: 0,
    borderColor: undefined,
    strokeWidth: props.elementKind === "icon" || props.iconProvider ? props.strokeWidth : 0,
    outlineWidth: 0,
    outlineColor: undefined,
    // Keep shape radius — radius is not border.
  };
}

export function applyBorderProps(
  props: Record<string, unknown>,
  border: Partial<BorderModel>
): Record<string, unknown> {
  const current = readBorderFromProps(props);
  const next: BorderModel = { ...current, ...border };
  if (next.style === "none" || next.width <= 0) {
    return clearBorderProps(props);
  }
  const linked = next.radiusLinked !== false;
  return {
    ...props,
    borderStyle: next.style,
    borderWidth: next.width,
    borderColor: next.color,
    outlineWidth: next.width,
    outlineColor: next.color,
    cornersLinked: linked,
    radius: next.radius,
    radiusTopLeft: linked ? next.radius : next.radiusTopLeft,
    radiusTopRight: linked ? next.radius : next.radiusTopRight,
    radiusBottomRight: linked ? next.radius : next.radiusBottomRight,
    radiusBottomLeft: linked ? next.radius : next.radiusBottomLeft,
  };
}

export function borderIsVisuallyNone(props: Record<string, unknown>): boolean {
  const border = readBorderFromProps(props);
  return border.style === "none" || border.width <= 0;
}
