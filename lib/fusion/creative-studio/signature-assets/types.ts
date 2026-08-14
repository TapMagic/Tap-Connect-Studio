export type SignatureAssetKind = "action" | "identity" | "divider" | "frame" | "stage" | "footer";
export type SignatureLifecycle = "production" | "candidate" | "reference";
export type SignatureSubgroup = "actions" | "identity" | "dividers" | "frames-stages" | "footer";

export type SignatureSafeInsets = { top: number; right: number; bottom: number; left: number };

export type SignatureSocketContract = {
  identity?: boolean;
  eyebrow?: boolean;
  title?: boolean;
  description?: boolean;
  cue?: boolean;
  action?: boolean;
  dividerCenter?: boolean;
  childContent?: boolean;
};

/** Family-neutral catalog contract used by every premium authored visual family. */
export type SignatureAssetDefinition = {
  id: string;
  familyId: string;
  label: string;
  subgroup: SignatureSubgroup;
  assetKind: SignatureAssetKind;
  role: string;
  variant: string;
  sourceAsset: string;
  sourceSha256: string;
  width: number;
  height: number;
  aspectRatio: number;
  glowPadding: SignatureSafeInsets;
  safeInsets: SignatureSafeInsets;
  socketContract: SignatureSocketContract;
  layoutCapabilities: readonly string[];
  responsiveContract: { proportional: true; phoneSafe: boolean; minRenderedWidthPx?: number };
  stateContract: readonly ("default" | "hover" | "pressed" | "disabled")[];
  tintCapabilities: readonly string[];
  nestingCapabilities: { canContainChildren: boolean; acceptedChildKinds: readonly SignatureAssetKind[] };
  lifecycle: SignatureLifecycle;
  expressionTier: "signature";
  referenceOnly: boolean;
  sortOrder: number;
  tags: readonly string[];
  /** Optional immutable blank chassis used when a content-bearing approval render cannot host live sockets. */
  liveShellAsset?: string;
};

export type SignatureFamilyDefinition = {
  id: string;
  slug: string;
  label: string;
  lifecycle: SignatureLifecycle;
  sortOrder: number;
};

export type SignatureLayoutRecipe = {
  id: "SINGLE" | "STACK-2" | "STACK-3" | "GRID-2" | "GROUPED-COMPACT";
  label: string;
  minItems: number;
  maxItems: number;
  columns: 1 | 2;
  compact: boolean;
};
