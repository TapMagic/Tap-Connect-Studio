import type { CreativeCompositionBlock, CreativeCompositionNode } from "../composition";
import type { BrandPreviewContext } from "../reconstitution/standard-button-catalog";
import { declaredAuthoringCapability } from "./authoring-completeness";

export const STUDIO_TEXT_AUTHORING_CONTRACT = "studioTextAuthoring@1.0.0" as const;

export type StudioTextRoleId = "heading" | "subheading" | "body" | "label" | "quote" | "free";
export type StudioTextValueSource = "brand" | "local";
export type StudioTextHeightMode = "auto" | "minimum" | "fixed";
export type StudioTextOverflowMode = "visible" | "scroll" | "clip";

export type StudioTextRole = Readonly<{
  id: StudioTextRoleId;
  label: string;
  description: string;
  sample: string;
  brandFontRole: "heading" | "body";
  defaults: Readonly<Record<string, unknown>>;
  minHeightPx: number;
}>;

export const STUDIO_TEXT_ROLES: readonly StudioTextRole[] = Object.freeze([
  { id: "heading", label: "Heading Text Box", description: "A decisive primary idea.", sample: "A clear point of view", brandFontRole: "heading", minHeightPx: 54, defaults: { fontSize: 34, fontWeight: 800, lineHeight: 1.06, letterSpacingEm: -0.025, align: "left", textMultiline: false, spacingAbovePx: 8, spacingBelowPx: 10 } },
  { id: "subheading", label: "Subheading Text Box", description: "A supporting promise or section lead.", sample: "What makes this worth your time", brandFontRole: "heading", minHeightPx: 44, defaults: { fontSize: 22, fontWeight: 650, lineHeight: 1.2, letterSpacingEm: -0.01, align: "left", textMultiline: false, spacingAbovePx: 4, spacingBelowPx: 8 } },
  { id: "body", label: "Body Text Box", description: "Comfortable reading for useful detail.", sample: "Add the detail your visitor needs to take the next step with confidence.", brandFontRole: "body", minHeightPx: 72, defaults: { fontSize: 16, fontWeight: 450, lineHeight: 1.55, letterSpacingEm: 0, align: "left", textMultiline: true, spacingAbovePx: 2, spacingBelowPx: 8 } },
  { id: "label", label: "Caption / Label", description: "Compact context, category, or eyebrow copy.", sample: "FEATURED SERVICE", brandFontRole: "body", minHeightPx: 32, defaults: { fontSize: 12, fontWeight: 750, lineHeight: 1.15, letterSpacingEm: 0.12, align: "left", textTransform: "uppercase", textMultiline: false, spacingAbovePx: 4, spacingBelowPx: 5 } },
  { id: "quote", label: "Quote Text Box", description: "An expressive testimonial or statement.", sample: "“The kind of experience people remember.”", brandFontRole: "heading", minHeightPx: 78, defaults: { fontSize: 25, fontWeight: 500, lineHeight: 1.35, letterSpacingEm: -0.01, align: "left", italic: true, textMultiline: true, flowInsetPx: 12, spacingAbovePx: 8, spacingBelowPx: 12 } },
  { id: "free", label: "Free Text Box", description: "Unstyled copy ready for direct placement.", sample: "Type anywhere", brandFontRole: "body", minHeightPx: 44, defaults: { fontSize: 16, fontWeight: 500, lineHeight: 1.35, letterSpacingEm: 0, align: "left", textMultiline: true, spacingAbovePx: 0, spacingBelowPx: 0 } },
]);

export function studioTextRole(id: unknown): StudioTextRole {
  return STUDIO_TEXT_ROLES.find((role) => role.id === id) ?? STUDIO_TEXT_ROLES[2];
}

export function textRoleCanonicalProps(roleId: StudioTextRoleId, brand?: BrandPreviewContext | null): Record<string, unknown> {
  const role = studioTextRole(roleId);
  const fontFamily = role.brandFontRole === "heading"
    ? brand?.headingFontFamily || '"Inter", ui-sans-serif, system-ui, sans-serif'
    : brand?.bodyFontFamily || '"Inter", ui-sans-serif, system-ui, sans-serif';
  return {
    elementKind: "text",
    text: role.sample,
    textRole: role.id,
    textMinHeightPx: role.minHeightPx,
    textHeightMode: "auto" satisfies StudioTextHeightMode,
    textOverflow: "visible" satisfies StudioTextOverflowMode,
    ...role.defaults,
    fontFamily,
    color: brand?.textColor || "#f8fafc",
    flowWidthPercent: 100,
    flowAlignment: "stretch",
    fontSource: "brand" satisfies StudioTextValueSource,
    colorSource: "brand" satisfies StudioTextValueSource,
    textStyleSource: "brand" satisfies StudioTextValueSource,
    brandFontRole: role.brandFontRole,
    opacity: 1,
    boxFill: "transparent",
    boxFillOpacity: 1,
    boxBorder: "transparent",
    boxBorderWidth: 0,
    boxRadius: 0,
    boxPadding: 0,
    boxShadow: 0,
  };
}

export function applyStudioTextRole(current: Record<string, unknown>, roleId: StudioTextRoleId, brand?: BrandPreviewContext | null): Record<string, unknown> {
  const next = textRoleCanonicalProps(roleId, brand);
  return { ...current, ...next, text: current.text ?? next.text };
}

export type StudioTextAccessibility = Readonly<{
  empty: boolean;
  phoneReadability: "pass" | "warning";
  contrast: "pass" | "warning" | "unknown";
  ratio: number | null;
  message: string;
}>;

export function evaluateStudioTextAccessibility(node: CreativeCompositionNode, block: CreativeCompositionBlock, fallbackBackground?: string | null): StudioTextAccessibility {
  const empty = String(node.props.text || "").trim().length === 0;
  const size = Number(node.props.fontSize ?? 16);
  const foreground = parseHex(String(node.props.color || ""));
  const background = reliableBackground(node, block, fallbackBackground);
  const ratio = foreground && background ? contrastRatio(foreground, background) : null;
  const weight = Number(node.props.fontWeight ?? 400);
  const large = size >= 24 || (size >= 18.66 && weight >= 700);
  const contrast = ratio == null ? "unknown" : ratio >= (large ? 3 : 4.5) ? "pass" : "warning";
  const message = empty
    ? "Text is empty and will not communicate to visitors."
    : contrast === "unknown"
      ? "Contrast cannot be verified against a transparent or layered surface. Check it in Preview."
      : contrast === "warning"
        ? `Contrast is ${ratio?.toFixed(1)}:1; increase separation from the surface.`
        : `Contrast is ${ratio?.toFixed(1)}:1 against the resolved solid surface.`;
  return Object.freeze({ empty, phoneReadability: size < 14 ? "warning" : "pass", contrast, ratio, message });
}

function reliableBackground(node: CreativeCompositionNode, block: CreativeCompositionBlock, fallback?: string | null) {
  if (node.parentId) {
    const parent = block.nodes.find((candidate) => candidate.id === node.parentId);
    if (parent) {
      const treatment = String(parent.props.surfaceTreatment || "transparent");
      if (treatment === "solid") return parseHex(String(parent.props.fill || ""));
      if (treatment !== "transparent") return null;
    }
  }
  if (block.background?.kind === "solid") return parseHex(String(block.background.value || ""));
  if (block.background?.kind && block.background.kind !== "none") return null;
  return parseHex(String(fallback || ""));
}

function parseHex(value: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  return [0, 2, 4].map((offset) => Number.parseInt(match[1].slice(offset, offset + 2), 16)) as [number, number, number];
}

function contrastRatio(left: [number, number, number], right: [number, number, number]) {
  const luminance = (rgb: [number, number, number]) => {
    const channels = rgb.map((value) => { const channel = value / 255; return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4; });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const a = luminance(left);
  const b = luminance(right);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export const STUDIO_TEXT_CAPABILITY_DECLARATIONS = Object.freeze({
  editable: ["content", "role", "font-family", "font-size", "font-weight", "line-height", "tracking", "alignment", "color", "width", "height-mode", "minimum-height", "fixed-height", "overflow", "inset", "flow-alignment", "space-before", "space-after", "text-box-fill", "text-box-opacity", "text-box-border", "text-box-radius", "text-box-padding", "text-box-shadow", "overall-opacity"],
  preserved: ["empty-state", "phone-readability", "contrast-status", "brand-provenance", "undo-redo", "preview-live-parity"],
  deferred: ["glyph-gradient", "outline", "glow", "dynamic-data", "reusable-text-styles"],
} as const);

const TEXT_PARITY = ["canvas", "preview", "public", "live-device"] as const;
const TEXT_EDITABLE_DECLARATIONS = STUDIO_TEXT_CAPABILITY_DECLARATIONS.editable.map((id) => declaredAuthoringCapability({
  id: `text.${id}`,
  label: id.replaceAll("-", " "),
  classification: "editable-reachable",
  applicable: true,
  stateAuthority: "CreativeCompositionNode.props",
  compilerAuthority: "textRoleCanonicalProps/applyStudioTextRole",
  rendererAuthority: "CreativeCompositionCanvas.NodeVisual",
  persistenceAuthority: "TapConnectCardConfig.rootComposition/section.composition",
  validationAuthority: "Studio Text authoring control bounds",
  historyAuthority: "useLabeledUndoRedo transaction",
  controlId: `text-${id}`,
  commandId: `text.set-${id}`,
  parityAuthorities: TEXT_PARITY,
}));

const TEXT_PRESERVED_DECLARATIONS = STUDIO_TEXT_CAPABILITY_DECLARATIONS.preserved.map((id) => declaredAuthoringCapability({
  id: `text.${id}`,
  label: id.replaceAll("-", " "),
  classification: "preserved-read-only",
  applicable: true,
  stateAuthority: id === "brand-provenance" ? "CreativeCompositionNode.props value-source fields" : "Studio Text canonical projection",
  rendererAuthority: "CreativeCompositionCanvas.NodeVisual",
  persistenceAuthority: "TapConnectCardConfig",
}));

const TEXT_DEFERRED_REASONS: Record<(typeof STUDIO_TEXT_CAPABILITY_DECLARATIONS.deferred)[number], string> = {
  "glyph-gradient": "Full Color and Text Effects authority is outside Slice 3.",
  outline: "Text Effects is deferred until its shared renderer and catalog are accepted.",
  glow: "Text Effects is deferred until its shared renderer and catalog are accepted.",
  "dynamic-data": "Dynamic data is explicitly outside the accepted Text slice.",
  "reusable-text-styles": "Reusable style promotion requires a future shared-resource lifecycle.",
};

export const STUDIO_TEXT_AUTHORING_DECLARATIONS = Object.freeze([
  ...TEXT_EDITABLE_DECLARATIONS,
  ...TEXT_PRESERVED_DECLARATIONS,
  ...STUDIO_TEXT_CAPABILITY_DECLARATIONS.deferred.map((id) => declaredAuthoringCapability({ id: `text.${id}`, label: id.replaceAll("-", " "), classification: "deliberately-deferred", applicable: true, deferralReason: TEXT_DEFERRED_REASONS[id] })),
]);
