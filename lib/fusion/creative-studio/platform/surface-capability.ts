import { photographyVisualPlane, type VisualPlane } from "../visual-plane";

export const STUDIO_SURFACE_CAPABILITY_CONTRACT = "studioSurfaceCapability@1.0.0" as const;

export type StudioSurfaceTreatment = "transparent" | "solid" | "smoked_glass" | "image";

export type StudioSurfaceState = Readonly<{
  contractId: typeof STUDIO_SURFACE_CAPABILITY_CONTRACT;
  treatment: StudioSurfaceTreatment;
  fill?: string;
  mediaUrl?: string;
  mediaAssetId?: string;
  overlayOpacity: number;
  imageOpacity: number;
  brightness: number;
  tint: string;
  fit: "cover" | "contain" | "fill";
  focalX: number;
  focalY: number;
  blurPx: number;
  radiusPx: number;
  borderWidthPx: number;
  borderColor: string;
  opacity: number;
  shadowPx: number;
  visualPlane: VisualPlane;
}>;

export const STUDIO_SURFACE_TREATMENTS: readonly Readonly<{
  id: StudioSurfaceTreatment;
  label: string;
  description: string;
  preview: string;
}>[] = [
  { id: "transparent", label: "Transparent", description: "Let the Card surface show through.", preview: "linear-gradient(135deg,transparent 45%,rgba(255,255,255,.12) 46% 54%,transparent 55%)" },
  { id: "solid", label: "Solid", description: "A clear Brand-backed plane.", preview: "#162019" },
  { id: "smoked_glass", label: "Smoked glass", description: "Translucent depth with readable contrast.", preview: "linear-gradient(135deg,rgba(38,52,60,.9),rgba(8,13,18,.72))" },
  { id: "image", label: "Image-backed", description: "Photography with a governed readability veil.", preview: "linear-gradient(135deg,#304458,#111823)" },
] as const;

export function readStudioSurfaceState(props: Readonly<Record<string, unknown>>): StudioSurfaceState {
  const saved = props.surfaceTreatment;
  const savedState = saved && typeof saved === "object" ? saved as Partial<StudioSurfaceState> : null;
  const treatment = (savedState?.treatment ?? props.containerTreatment ?? "transparent") as StudioSurfaceTreatment;
  const fill = String(savedState?.fill ?? props.fill ?? (treatment === "solid" ? "#162019" : treatment === "smoked_glass" ? "rgba(12,20,24,.72)" : "transparent"));
  const mediaUrl = String(savedState?.mediaUrl ?? props.backgroundImageUrl ?? "") || undefined;
  const mediaAssetId = String(savedState?.mediaAssetId ?? props.backgroundMediaAssetId ?? "") || undefined;
  const overlayOpacity = number(savedState?.overlayOpacity ?? props.overlayOpacity, treatment === "image" ? .28 : treatment === "smoked_glass" ? .2 : 0, 0, 1);
  const imageOpacity = number(savedState?.imageOpacity ?? props.imageOpacity, 1, .1, 1);
  const brightness = number(savedState?.brightness ?? props.brightness, 1, .25, 2);
  const tint = String(savedState?.tint ?? props.overlayColor ?? "#000000");
  const fitValue = savedState?.fit ?? props.backgroundFit;
  const fit = fitValue === "contain" || fitValue === "fill" ? fitValue : "cover";
  const focalX = number(savedState?.focalX ?? props.focalX, .5, 0, 1);
  const focalY = number(savedState?.focalY ?? props.focalY, .5, 0, 1);
  const blurPx = number(savedState?.blurPx ?? props.backdropBlur, treatment === "smoked_glass" ? 14 : 0, 0, 32);
  const radiusPx = number(savedState?.radiusPx ?? props.radius, 16, 0, 48);
  const borderWidthPx = number(savedState?.borderWidthPx ?? props.borderWidth, treatment === "transparent" ? 0 : 1, 0, 8);
  const borderColor = String(savedState?.borderColor ?? props.borderColor ?? "rgba(255,255,255,.14)");
  const opacity = number(savedState?.opacity ?? props.opacity, 1, .1, 1);
  const shadowPx = number(savedState?.shadowPx ?? props.boxShadow, treatment === "transparent" ? 0 : 18, 0, 48);
  const visualPlane = savedState?.visualPlane ?? (props.visualPlane as VisualPlane | undefined) ?? (treatment === "image" && mediaUrl
    ? photographyVisualPlane({ url: mediaUrl, mediaAssetId, overlayOpacity, tint, fit, focalX, focalY, opacity: imageOpacity })
    : treatment === "transparent" ? { kind: "none" } : { kind: "solid", color: fill });
  return { contractId: STUDIO_SURFACE_CAPABILITY_CONTRACT, treatment, fill, mediaUrl, mediaAssetId, overlayOpacity, imageOpacity, brightness, tint, fit, focalX, focalY, blurPx, radiusPx, borderWidthPx, borderColor, opacity, shadowPx, visualPlane };
}

export function applyStudioSurfaceTreatment(
  props: Readonly<Record<string, unknown>>,
  treatment: StudioSurfaceTreatment,
  patch: Partial<Pick<StudioSurfaceState, "fill" | "mediaUrl" | "mediaAssetId">> = {},
): Record<string, unknown> {
  const current = readStudioSurfaceState(props);
  const fill = patch.fill ?? (treatment === "solid" ? "#162019" : treatment === "smoked_glass" ? "rgba(12,20,24,.72)" : "transparent");
  // Presence, not truthiness, distinguishes "keep the current Asset" from
  // the explicit Remove image command. An optional undefined value is the
  // canonical clear operation used by every shared MediaPicker consumer.
  const mediaUrl = Object.prototype.hasOwnProperty.call(patch, "mediaUrl") ? patch.mediaUrl : current.mediaUrl;
  const mediaAssetId = Object.prototype.hasOwnProperty.call(patch, "mediaAssetId") ? patch.mediaAssetId : current.mediaAssetId;
  const visualPlane: VisualPlane = treatment === "image" && mediaUrl
    ? photographyVisualPlane({ url: mediaUrl, mediaAssetId, overlayOpacity: current.overlayOpacity, tint: current.tint, fit: current.fit, focalX: current.focalX, focalY: current.focalY, opacity: current.imageOpacity })
    : treatment === "transparent" ? { kind: "none" } : { kind: "solid", color: fill };
  const surfaceTreatment: StudioSurfaceState = { ...current, contractId: STUDIO_SURFACE_CAPABILITY_CONTRACT, treatment, fill, mediaUrl, mediaAssetId, visualPlane };
  return { ...props, surfaceTreatment, containerTreatment: treatment, fill, backgroundImageUrl: mediaUrl, backgroundMediaAssetId: mediaAssetId, visualPlane };
}

export function applyStudioSurfaceParameters(
  props: Readonly<Record<string, unknown>>,
  patch: Partial<Pick<StudioSurfaceState, "fill" | "overlayOpacity" | "imageOpacity" | "brightness" | "tint" | "fit" | "focalX" | "focalY" | "blurPx" | "radiusPx" | "borderWidthPx" | "borderColor" | "opacity" | "shadowPx">>,
): Record<string, unknown> {
  const current = readStudioSurfaceState(props);
  const next = { ...current, ...patch };
  const visualPlane: VisualPlane = next.treatment === "image" && next.mediaUrl
    ? photographyVisualPlane({ url: next.mediaUrl, mediaAssetId: next.mediaAssetId, overlayOpacity: next.overlayOpacity, tint: next.tint, fit: next.fit, focalX: next.focalX, focalY: next.focalY, opacity: next.imageOpacity })
    : next.treatment === "transparent" ? { kind: "none" } : { kind: "solid", color: next.fill || "transparent" };
  const surfaceTreatment: StudioSurfaceState = { ...next, visualPlane };
  return {
    ...props,
    surfaceTreatment,
    fill: next.fill,
    overlayOpacity: next.overlayOpacity,
    imageOpacity: next.imageOpacity,
    brightness: next.brightness,
    overlayColor: next.tint,
    backgroundFit: next.fit,
    focalX: next.focalX,
    focalY: next.focalY,
    backdropBlur: next.blurPx,
    radius: next.radiusPx,
    borderWidth: next.borderWidthPx,
    borderColor: next.borderColor,
    opacity: next.opacity,
    boxShadow: next.shadowPx,
    visualPlane,
  };
}

function number(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}
