/**
 * Restrained semantic domain accents for Creative Studio chrome.
 * Quiet orientation cues — never recolor large panels or compete with artwork.
 */

export type StudioSemanticDomain =
  | "text"
  | "media"
  | "appearance"
  | "structure"
  | "assist"
  | "action";

export const STUDIO_SEMANTIC_ACCENTS: Record<
  StudioSemanticDomain,
  { label: string; hue: string; cssVar: string }
> = {
  text: { label: "Typography", hue: "#7dd3fc", cssVar: "--studio-accent-text" },
  media: { label: "Media", hue: "#f9a8d4", cssVar: "--studio-accent-media" },
  appearance: {
    label: "Appearance",
    hue: "#c4b5fd",
    cssVar: "--studio-accent-appearance",
  },
  structure: {
    label: "Structure",
    hue: "#86efac",
    cssVar: "--studio-accent-structure",
  },
  assist: { label: "Assist", hue: "#b8ff2c", cssVar: "--studio-accent-assist" },
  action: { label: "Action", hue: "#fdba74", cssVar: "--studio-accent-action" },
};

export function semanticAccentStyle(
  domain: StudioSemanticDomain
): { borderColor: string; color: string } {
  const hue = STUDIO_SEMANTIC_ACCENTS[domain].hue;
  return {
    borderColor: `${hue}66`,
    color: hue,
  };
}

export function semanticRailIndicatorClass(domain: StudioSemanticDomain): string {
  return `data-[semantic='${domain}']:border-l-2`;
}

/** Map common Studio rail/tool ids onto semantic domains. */
export function domainForStudioTool(toolId: string): StudioSemanticDomain {
  const id = toolId.toLowerCase();
  if (id.includes("text") || id.includes("font") || id.includes("type")) return "text";
  if (
    id.includes("media") ||
    id.includes("image") ||
    id.includes("photo") ||
    id.includes("pexels") ||
    id.includes("logo") ||
    id.includes("background")
  ) {
    return "media";
  }
  if (
    id.includes("appearance") ||
    id.includes("material") ||
    id.includes("pattern") ||
    id.includes("color") ||
    id.includes("effect")
  ) {
    return "appearance";
  }
  if (
    id.includes("layer") ||
    id.includes("align") ||
    id.includes("layout") ||
    id.includes("group")
  ) {
    return "structure";
  }
  if (id.includes("magic") || id.includes("write") || id.includes("assist")) {
    return "assist";
  }
  if (id.includes("action") || id.includes("bind") || id.includes("link")) {
    return "action";
  }
  return "appearance";
}
