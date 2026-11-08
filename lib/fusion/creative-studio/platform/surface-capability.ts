import { DEFAULT_GRADIENT, gradientToCss, type GradientModel } from "../gradient";
import { photographyVisualPlane, type VisualPlane } from "../visual-plane";

export const STUDIO_SURFACE_CAPABILITY_CONTRACT = "studioSurfaceCapability@1.0.0" as const;

export type StudioSurfaceTreatment = "transparent" | "solid" | "gradient" | "smoked_glass" | "image";

export type StudioSurfaceState = Readonly<{
  contractId: typeof STUDIO_SURFACE_CAPABILITY_CONTRACT;
  treatment: StudioSurfaceTreatment | "material";
  fill?: string;
  mediaUrl?: string;
  mediaAssetId?: string;
  overlayOpacity: number;
  imageOpacity: number;
  brightness: number;
  contrast: number;
  saturation: number;
  scale: number;
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
  { id: "gradient", label: "Gradient", description: "A smooth blend of colors.", preview: "linear-gradient(135deg,#17212c,#334155)" },
  { id: "smoked_glass", label: "Smoked glass", description: "Translucent depth with readable contrast.", preview: "linear-gradient(135deg,rgba(38,52,60,.9),rgba(8,13,18,.72))" },
  { id: "image", label: "Image-backed", description: "Photography with a governed readability veil.", preview: "linear-gradient(135deg,#304458,#111823)" },
] as const;

export function readStudioSurfaceState(props: Readonly<Record<string, unknown>>): StudioSurfaceState {
  const saved = props.surfaceTreatment;
  const savedState = saved && typeof saved === "object" ? saved as Partial<StudioSurfaceState> : null;
  const hasMaterial = typeof props.materialPreset === "string" && props.materialPreset !== "none" && props.materialPreset.length > 0;
  const image = Boolean(props.backgroundImageUrl);
  const treatment = (hasMaterial && !image ? "material" : image ? "image" : props.gradientFill ? "gradient" : props.containerTreatment ?? savedState?.treatment ?? (props.fill && props.fill !== "transparent" ? "solid" : "transparent")) as StudioSurfaceState["treatment"];
  const fill = String(props.fill ?? savedState?.fill ?? (treatment === "solid" ? "#162019" : treatment === "smoked_glass" ? "rgba(12,20,24,.72)" : "transparent"));
  const mediaUrl = String(props.backgroundImageUrl ?? savedState?.mediaUrl ?? "") || undefined;
  const mediaAssetId = String(props.backgroundMediaAssetId ?? savedState?.mediaAssetId ?? "") || undefined;
  const overlayOpacity = number(props.overlayOpacity ?? savedState?.overlayOpacity, treatment === "image" ? .28 : treatment === "smoked_glass" ? .2 : 0, 0, 1);
  const imageOpacity = number(props.imageOpacity ?? savedState?.imageOpacity, 1, 0, 1);
  const brightness = number(props.brightness ?? savedState?.brightness, 1, .25, 2);
  const contrast = number(props.contrast ?? savedState?.contrast, 1, .25, 2);
  const saturation = number(props.saturation ?? savedState?.saturation, 1, 0, 2);
  const scale = number(props.imageScale ?? savedState?.scale, 1, .5, 3);
  const tint = String(props.overlayColor ?? savedState?.tint ?? "#000000");
  const fitValue = props.backgroundFit ?? savedState?.fit;
  const fit = fitValue === "contain" || fitValue === "fill" ? fitValue : "cover";
  const focalX = number(props.focalX ?? savedState?.focalX, .5, 0, 1);
  const focalY = number(props.focalY ?? savedState?.focalY, .5, 0, 1);
  const blurPx = number(props.backdropBlur ?? savedState?.blurPx, treatment === "smoked_glass" ? 14 : 0, 0, 32);
  const radiusPx = number(props.radius ?? savedState?.radiusPx, 16, 0, Number.MAX_SAFE_INTEGER);
  const borderWidthPx = number(props.borderWidth ?? savedState?.borderWidthPx, treatment === "transparent" ? 0 : 1, 0, Number.MAX_SAFE_INTEGER);
  const borderColor = String(props.borderColor ?? savedState?.borderColor ?? "rgba(255,255,255,.14)");
  const opacity = number(props.opacity ?? savedState?.opacity, 1, 0, 1);
  const shadowPx = number(props.boxShadow ?? savedState?.shadowPx, treatment === "transparent" ? 0 : 18, 0, 48);
  const visualPlane = (props.visualPlane as VisualPlane | undefined) ?? savedState?.visualPlane ?? (treatment === "image" && mediaUrl
    ? photographyVisualPlane({ url: mediaUrl, mediaAssetId, overlayOpacity, tint, fit, focalX, focalY, opacity: imageOpacity, scale })
    : treatment === "transparent" ? { kind: "none" } : { kind: "solid", color: fill });
  return { contractId: STUDIO_SURFACE_CAPABILITY_CONTRACT, treatment, fill, mediaUrl, mediaAssetId, overlayOpacity, imageOpacity, brightness, contrast, saturation, scale, tint, fit, focalX, focalY, blurPx, radiusPx, borderWidthPx, borderColor, opacity, shadowPx, visualPlane };
}

export function applyStudioSurfaceTreatment(
  props: Readonly<Record<string, unknown>>,
  treatment: StudioSurfaceTreatment,
  patch: Partial<Pick<StudioSurfaceState, "fill" | "mediaUrl" | "mediaAssetId">> & { gradient?: GradientModel } = {},
): Record<string, unknown> {
  const current = readStudioSurfaceState(props);
  const fill = patch.fill ?? (treatment === "solid" ? "#162019" : treatment === "smoked_glass" ? "rgba(12,20,24,.72)" : "transparent");
  // Presence, not truthiness, distinguishes "keep the current Asset" from
  // the explicit Remove image command. An optional undefined value is the
  // canonical clear operation used by every shared MediaPicker consumer.
  const mediaUrl = treatment === "image" ? (Object.hasOwn(patch, "mediaUrl") ? patch.mediaUrl : current.mediaUrl) : undefined;
  const mediaAssetId = treatment === "image" ? (Object.hasOwn(patch, "mediaAssetId") ? patch.mediaAssetId : current.mediaAssetId) : undefined;
  const visualPlane: VisualPlane = treatment === "image" && mediaUrl
    ? photographyVisualPlane({ url: mediaUrl, mediaAssetId, overlayOpacity: current.overlayOpacity, tint: current.tint, fit: current.fit, focalX: current.focalX, focalY: current.focalY, opacity: current.imageOpacity, scale: current.scale })
    : treatment === "gradient" ? { kind: "gradient", gradient: patch.gradient ?? DEFAULT_GRADIENT }
    : treatment === "transparent" ? { kind: "none" } : { kind: "solid", color: fill };
  const surfaceTreatment: StudioSurfaceState = { ...current, contractId: STUDIO_SURFACE_CAPABILITY_CONTRACT, treatment, fill, mediaUrl, mediaAssetId, visualPlane };
  return { ...props, surfaceTreatment, containerTreatment: treatment, fill,
    // Durable clears survive JSON history and merged node patches.
    materialPreset: null, gradientFill: treatment === "gradient" ? gradientToCss(patch.gradient ?? DEFAULT_GRADIENT) : null,
    gradientStart: null, gradientEnd: null, texture: null, highlight: null, shine: false,
    surfaceFillKind: treatment, backgroundImageUrl: mediaUrl ?? null, backgroundMediaAssetId: mediaAssetId ?? null, visualPlane };

}

export function applyStudioSurfaceParameters(
  props: Readonly<Record<string, unknown>>,
  patch: Partial<Pick<StudioSurfaceState, "fill" | "overlayOpacity" | "imageOpacity" | "brightness" | "contrast" | "saturation" | "scale" | "tint" | "fit" | "focalX" | "focalY" | "blurPx" | "radiusPx" | "borderWidthPx" | "borderColor" | "opacity" | "shadowPx">>,
): Record<string, unknown> {
  const keys = {
    fill: "fill", overlayOpacity: "overlayOpacity", imageOpacity: "imageOpacity",
    brightness: "brightness", contrast: "contrast", saturation: "saturation", scale: "imageScale",
    tint: "overlayColor", fit: "backgroundFit", focalX: "focalX", focalY: "focalY", blurPx: "backdropBlur",
    radiusPx: "radius", borderWidthPx: "borderWidth", borderColor: "borderColor", opacity: "opacity", shadowPx: "boxShadow",
  } as const;
  const next = { ...props };
  const saved = props.surfaceTreatment && typeof props.surfaceTreatment === "object" ? props.surfaceTreatment : {};
  const surfaceTreatment: Record<string, unknown> = { ...saved, ...patch };
  for (const key of Object.keys(patch) as Array<keyof typeof keys>) next[keys[key]] = patch[key];
  // Only fill/image operations rebuild a Visual Plane. Edge/depth edits must
  // not replace a Material/gradient or normalize any unrelated property.
  const imageKeys = ["overlayOpacity", "imageOpacity", "brightness", "contrast", "saturation", "scale", "tint", "fit", "focalX", "focalY"];
  const state = readStudioSurfaceState({ ...next, surfaceTreatment });
  if (state.treatment === "image" && state.mediaUrl && imageKeys.some(key => Object.hasOwn(patch, key))) {
    next.visualPlane = photographyVisualPlane({ url: state.mediaUrl, mediaAssetId: state.mediaAssetId, overlayOpacity: state.overlayOpacity, tint: state.tint, fit: state.fit, focalX: state.focalX, focalY: state.focalY, opacity: state.imageOpacity, scale: state.scale });
    surfaceTreatment.visualPlane = next.visualPlane;
  } else if (Object.hasOwn(patch, "fill") && (state.treatment === "solid" || state.treatment === "smoked_glass")) {
    next.visualPlane = { kind: "solid", color: patch.fill };
    surfaceTreatment.visualPlane = next.visualPlane;
  }
  next.surfaceTreatment = surfaceTreatment;
  return next;
}

function number(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}
