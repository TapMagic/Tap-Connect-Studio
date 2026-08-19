export type SignatureAssetKind = "action" | "identity" | "divider" | "frame" | "stage" | "footer" | "micro-part";
export type SignatureLifecycle = "production" | "candidate" | "reference" | "superseded" | "duplicate" | "quarantined";
export type SignatureSubgroup = "actions" | "identity" | "frames-stages" | "dividers" | "micro-parts";
export type SignatureSourceReadiness =
  | "production-ready"
  | "production-ready-with-derived-control-needed"
  | "production-ready-with-state-treatment"
  | "visual-authority-needs-blank-shell"
  | "visual-authority-needs-state-implementation";
export type SignatureTintMode = "none" | "approved-mask" | "approved-palette" | "layered-safe";
export type SignatureEnergyMode = "fixed" | "approved-mask" | "approved-state-variants";
export type SignatureVersion = `${number}.${number}.${number}`;
export type SignatureContractId<TName extends string = string> = `${TName}@${SignatureVersion}`;
export type SignatureSide = "left" | "right" | "center" | "none";
export type SignatureAuthorityClass = "canonical" | "reference-only" | "audit-only";
export type SignatureRuntimeEligibility = "runtime-eligible" | "runtime-ineligible";
export type SignatureCertificationState = "uncertified" | "candidate" | "certified" | "rejected" | "revoked";
export type SignatureEntitlementKey = `signature.family.${string}`;
export type SignatureSourceMode = "exact-asset" | "styled-preserve";

export type SignatureSocketContractId = SignatureContractId<"semanticPlugSocket" | "identityHeaderSocket">;
export type SignatureLiveContentContractId = SignatureContractId<"informationalLine">;
export type SignatureAssemblyContractId = SignatureContractId<"singleStackAssembly" | "twinRailAssembly">;
export type SignatureEntitlementContractId = SignatureContractId<"signatureEntitlementResolution">;

export const APPROVED_SIGNATURE_CONTRACT_IDS = {
  semanticPlugSocket: "semanticPlugSocket@1.0.0",
  identityHeaderSocket: "identityHeaderSocket@1.0.0",
  informationalLine: "informationalLine@1.0.0",
  singleStackAssembly: "singleStackAssembly@1.0.0",
  twinRailAssembly: "twinRailAssembly@1.0.0",
  entitlementResolution: "signatureEntitlementResolution@1.0.0",
} as const satisfies Record<string, SignatureContractId>;

const SIGNATURE_CONTRACT_ID_PATTERN = /^[A-Za-z][A-Za-z0-9]*@\d+\.\d+\.\d+$/;

export function isSignatureContractId(value: unknown, expectedName?: string): value is SignatureContractId {
  if (typeof value !== "string" || !SIGNATURE_CONTRACT_ID_PATTERN.test(value)) return false;
  return expectedName ? value.startsWith(`${expectedName}@`) : true;
}

export type SignatureSafeInsets = { top: number; right: number; bottom: number; left: number };
export type SignatureNormalizedPoint = { x: number; y: number };
export type SignatureNormalizedRect = { x: number; y: number; width: number; height: number };

export type SignatureSourceGeometry = {
  widthPx: number;
  heightPx: number;
  runtimeScale?: number;
};

export type SignatureLiveContentGeometry = {
  safeArea: SignatureNormalizedRect;
  alignment: "left" | "center" | "right";
  recommendedWidthPx?: number;
  fontSizePxAt390?: readonly [number, number];
  lineHeightPxAt390?: readonly [number, number];
};

export type SignatureAssetProvenance = {
  sourceAssetPath: string;
  authorityManifest: string;
  geometryAuthority?: string;
  sourceMode: SignatureSourceMode;
  immutable: boolean;
};

export type SignatureSocketGeometry = {
  bounds: SignatureNormalizedRect;
  safeArea: SignatureNormalizedRect;
  center: SignatureNormalizedPoint;
  allowedOverflow?: SignatureSafeInsets;
};

export type SignatureSocketBinding = {
  contractId: SignatureSocketContractId;
  geometry: SignatureSocketGeometry;
  ownership: "component" | "live-action" | "identity-content";
};

export type SignatureAttachmentAnchor = {
  id: string;
  point: SignatureNormalizedPoint;
  edge: "top" | "right" | "bottom" | "left" | "center";
  accepts?: readonly string[];
};

export type SignatureRepeatability = {
  axis: "x" | "y";
  cadence: "action-row" | "paired-level" | string;
  nativeStridePx: number;
  normalizedStride: number;
  preferredOverlapPx: number;
  maximumSeamOverlapPx: number;
};

export type SignatureCertification = {
  state: SignatureCertificationState;
  geometryVersion: SignatureVersion;
  certifiedAt?: string;
  evidence?: readonly string[];
};

export type SignatureFurnitureAccessibility = {
  furniture: "decorative" | "meaningful";
  ariaHidden: boolean;
  interactive: boolean;
  liveContent: "none" | "text" | "socket-content";
  accessibleNameSource?: "live-label" | "live-content" | "explicit-label";
};

export type SignatureAccessState = {
  visible: boolean;
  selectable: boolean;
  publishable: boolean;
};

export type SignatureEntitlementResolutionContract = {
  contractId: SignatureEntitlementContractId;
  entitlementKey: SignatureEntitlementKey;
  entitled: SignatureAccessState;
  nonEntitled: SignatureAccessState;
  afterLoss: {
    existingObjects: "read-only" | "editable";
    existingPublishedOutput: "remain-live" | "revoke";
    newInsertion: "allow" | "block";
    restrictedReplacement: "allow" | "block";
  };
  publicRenderRequiresCurrentEntitlement: boolean;
  publicationEnforcement: "server-required" | "client-only";
};

export function resolveSignatureAccess(
  contract: SignatureEntitlementResolutionContract,
  entitled: boolean,
): SignatureAccessState {
  return entitled ? contract.entitled : contract.nonEntitled;
}

export type SignatureComponentContract = {
  familyId: string;
  familyVersion: SignatureVersion;
  componentId: string;
  componentVersion: SignatureVersion;
  role: string;
  side: SignatureSide;
  layoutCompatibility: readonly string[];
  sockets: readonly SignatureSocketBinding[];
  liveContentContract?: SignatureLiveContentContractId;
  attachmentAnchors: readonly SignatureAttachmentAnchor[];
  repeatability?: SignatureRepeatability;
  authority: SignatureAuthorityClass;
  lifecycle: SignatureLifecycle;
  runtimeEligibility: SignatureRuntimeEligibility;
  certification: SignatureCertification;
  sourceSha256: string;
  finishId: string;
  entitlementKey: SignatureEntitlementKey;
  accessibility: SignatureFurnitureAccessibility;
  sourceGeometry?: SignatureSourceGeometry;
  liveContentGeometry?: SignatureLiveContentGeometry;
  provenance?: SignatureAssetProvenance;
};

export function isSignatureComponentRuntimeEligible(component: SignatureComponentContract): boolean {
  return component.authority === "canonical"
    && component.lifecycle === "production"
    && component.runtimeEligibility === "runtime-eligible"
    && component.certification.state === "certified";
}

export type SignatureExpansionContract = {
  mode: "protected-cap-inset";
  /** Normalized source-image cuts. Corners/hardware outside these cuts never stretch. */
  cornerCaps: SignatureSafeInsets;
  contentSafeArea: SignatureSafeInsets;
  glowSafeArea: SignatureSafeInsets;
  plinthSafeRegion: { top: number; bottom: number };
  minimumWidthPx: number;
  minimumHeightPx: number;
  innerPadding: SignatureSafeInsets;
  childGapPx: number;
  flow: "vertical";
};

export type SignatureSocketContract = {
  identity?: boolean;
  eyebrow?: boolean;
  title?: boolean;
  description?: boolean;
  cue?: boolean;
  action?: boolean;
  dividerCenter?: boolean;
  childContent?: boolean;
  statusText?: boolean;
  icon?: boolean;
  rating?: boolean;
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
  tintMode: SignatureTintMode;
  energyMode: SignatureEnergyMode;
  sourceReadiness: SignatureSourceReadiness;
  provenanceManifest?: string;
  sourceNumber?: number;
  blockerNote?: string;
  nestingCapabilities: { canContainChildren: boolean; acceptedChildKinds: readonly SignatureAssetKind[] };
  lifecycle: SignatureLifecycle;
  expressionTier: "signature";
  referenceOnly: boolean;
  sortOrder: number;
  tags: readonly string[];
  /** Optional immutable blank chassis used when a content-bearing approval render cannot host live sockets. */
  liveShellAsset?: string;
  /** Present only for authored containers whose rails/caps must expand without whole-raster distortion. */
  expansionContract?: SignatureExpansionContract;
  /** Optional normalized authority metadata. Existing legacy records remain valid until deliberately migrated. */
  normalizedContract?: SignatureComponentContract;
};

export type SignatureFamilyDefinition = {
  id: string;
  slug: string;
  label: string;
  lifecycle: SignatureLifecycle;
  sortOrder: number;
  version?: SignatureVersion;
  entitlement?: SignatureEntitlementResolutionContract;
  finishId?: string;
  launchMode?: SignatureSourceMode;
  provenanceManifest?: string;
};

export type SignatureLayoutRecipe = {
  id: "SINGLE" | "STACK-2" | "STACK-3" | "GRID-2" | "GROUPED-COMPACT" | "ICON-ROW";
  label: string;
  minItems: number;
  maxItems: number;
  columns: 1 | 2;
  compact: boolean;
};
