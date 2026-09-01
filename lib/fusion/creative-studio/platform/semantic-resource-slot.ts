/**
 * Family-neutral contract for an authored resource occupying a semantic slot.
 *
 * Recipes and ordinary modules may govern presentation geometry, while the
 * canonical Studio Asset browser remains the selection/provenance authority.
 */
export const STUDIO_SEMANTIC_RESOURCE_SLOT_CONTRACT = "studioSemanticResourceSlot@1.0.0" as const;
export const STUDIO_VISUAL_RESOURCE_FIT_CONTRACT = "studioVisualResourceFit@1.0.0" as const;

export type StudioNormalizedArtworkBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type StudioVisualResourceBackingMode = "transparent" | "light" | "dark" | "brand" | "custom" | "auto-contrast";

export type StudioVisualResourceBackingPlate = {
  mode: StudioVisualResourceBackingMode;
  /** Resolved paint is committed so every renderer reproduces Auto Contrast. */
  resolvedColor: string;
  customColor?: string;
  resolution: "host" | "auto-contrast" | "contract-default";
};

export type StudioVisualResourceLegibility = {
  sourceTransparency: "transparent" | "opaque" | "unknown";
  opaqueBackground: "none" | "baked-in-likely" | "unknown";
  detectedBackgroundColor?: string;
  artworkTone: "light" | "dark" | "mixed" | "unknown";
  recommendedBacking: "transparent" | "light" | "dark";
  recommendationReason: "contrast" | "baked-source-background" | "insufficient-evidence" | "not-needed";
};

export type StudioVisualResourceMetadata = {
  intrinsicWidth?: number;
  intrinsicHeight?: number;
  visibleBounds?: StudioNormalizedArtworkBounds;
  boundsSource?: "alpha" | "edge-background" | "asset-metadata" | "raw";
  compatibility?: "compatible" | "safe-fallback" | "incompatible";
  fitMode?: "visible-contain" | "raw-contain";
  crop?: {
    zoom: number;
    offsetX: number;
    offsetY: number;
  };
  backingPlate?: StudioVisualResourceBackingPlate;
  legibility?: StudioVisualResourceLegibility;
  treatment?: {
    contractId: typeof STUDIO_VISUAL_RESOURCE_FIT_CONTRACT;
    maskShape: StudioVisualResourceFitContract["maskShape"];
    fitPolicy: StudioVisualResourceFitContract["fitPolicy"];
    safeInset: number;
    preserveAspectRatio: true;
    rendererMapping: StudioVisualResourceFitContract["rendererMapping"];
  };
};

export type StudioVisualResourceFitContract = {
  contractId: typeof STUDIO_VISUAL_RESOURCE_FIT_CONTRACT;
  maskShape: "none" | "circle" | "rounded-rectangle";
  safeInset: number;
  fitPolicy: "visible-contain" | "raw-contain";
  visibleBounds: { coordinateSpace: "normalized-source"; committedOnResource: true };
  boundsPolicy: "alpha-or-edge-background" | "alpha-only" | "raw";
  scale: { value: number; min: number; max: number; step: number };
  translation: { minX: number; maxX: number; minY: number; maxY: number };
  cropCapability: "focal-zoom" | "none";
  preserveAspectRatio: true;
  alignment: "center";
  minimumVisibleArtworkUtilization: number;
  clipping: "mask" | "none";
  backgroundTreatment: "preserve" | "transparent";
  backingPlate: {
    capability: "governed-choice" | "none";
    allowedModes: readonly StudioVisualResourceBackingMode[];
    defaultMode: StudioVisualResourceBackingMode;
    lightColor: string;
    darkColor: string;
    brandColor?: string;
    customColorAllowed: boolean;
  };
  fallback: "safe-contain" | "reject";
  rendererMapping: "canonical-visible-bounds-transform";
};

export type StudioSemanticResourceSource =
  | "upload"
  | "brand"
  | "studio"
  | "recent"
  | "favorite"
  | "pexels"
  | "logo_dev"
  | "url"
  | "legacy";

export type StudioSemanticResource = {
  src: string;
  alt: string;
  assetId?: string;
  source?: StudioSemanticResourceSource;
  sourceLabel?: string;
  sourceUrl?: string;
  rights?: string;
  licenseCode?: string;
  attributionText?: string;
  visual?: StudioVisualResourceMetadata;
  brandVariant?: {
    role: "primary" | "reverse" | "dark" | "mark" | "monochrome" | "transparent";
    groupId?: string;
  };
  derivative?: {
    canonical: true;
    sourceAssetId: string;
    operation: "remove-background" | "transparent-version" | "avatar-version" | "contrast-version" | "cleanup";
    createdBy: "host" | "tapit" | "system";
    provenanceId: string;
  };
  provenance: "brand" | "host-selected" | "template" | "tapit" | "legacy-preserved" | "system-default";
};

export type StudioVisualResourceCrop = NonNullable<NonNullable<StudioSemanticResource["visual"]>["crop"]>;

/**
 * Transactional handoff from Asset discovery into a governed semantic slot.
 * The candidate remains separate from the committed slot value until Apply.
 */
export type StudioVisualResourceCropSession = {
  sessionId: string;
  targetSlotId: string;
  candidateAssetId?: string;
  candidateRenderSource: string;
  candidateResource: StudioSemanticResource;
  priorCommittedResource?: StudioSemanticResource;
  initialCrop: StudioVisualResourceCrop;
  phase: "loading" | "ready" | "error";
  error?: string;
};

export type StudioSemanticResourceSlot = {
  contractId: typeof STUDIO_SEMANTIC_RESOURCE_SLOT_CONTRACT;
  id: string;
  label: string;
  semanticRole: "identity" | "image" | "icon" | "background";
  acceptedKinds: readonly ("logo" | "image" | "icon")[];
  required: boolean;
  applicable: boolean;
  value?: StudioSemanticResource;
  defaultValue?: StudioSemanticResource;
  presentation: {
    ownership: "governed" | "direct";
    fit: "contain" | "cover" | "fill";
    scale?: { value: number; min: number; max: number; step: number };
    visualFit?: StudioVisualResourceFitContract;
  };
  operations: readonly ("choose" | "replace" | "remove" | "reset" | "adjust")[];
};

export function createStudioSemanticResourceSlot(
  input: Omit<StudioSemanticResourceSlot, "contractId">,
): StudioSemanticResourceSlot {
  return { ...input, contractId: STUDIO_SEMANTIC_RESOURCE_SLOT_CONTRACT };
}

export function createIdentityVisualResourceFitContract(): StudioVisualResourceFitContract {
  return {
    contractId: STUDIO_VISUAL_RESOURCE_FIT_CONTRACT,
    maskShape: "circle",
    safeInset: 0.105,
    fitPolicy: "visible-contain",
    visibleBounds: { coordinateSpace: "normalized-source", committedOnResource: true },
    boundsPolicy: "alpha-or-edge-background",
    scale: { value: 1, min: 0.58, max: 2.4, step: 0.01 },
    translation: { minX: -0.48, maxX: 0.48, minY: -0.48, maxY: 0.48 },
    cropCapability: "focal-zoom",
    preserveAspectRatio: true,
    alignment: "center",
    minimumVisibleArtworkUtilization: 0.52,
    clipping: "mask",
    backgroundTreatment: "preserve",
    backingPlate: {
      capability: "governed-choice",
      allowedModes: ["transparent", "light", "dark", "auto-contrast"],
      defaultMode: "transparent",
      lightColor: "#ffffff",
      darkColor: "#080b10",
      customColorAllowed: false,
    },
    fallback: "safe-contain",
    rendererMapping: "canonical-visible-bounds-transform",
  };
}
