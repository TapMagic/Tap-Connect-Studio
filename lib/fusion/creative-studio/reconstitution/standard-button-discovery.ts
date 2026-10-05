import type { StudioDiscoveryContext, StudioDiscoveryResource } from "@/lib/fusion/creative-studio/platform/discovery";
import { filterStudioDiscoveryResources } from "@/lib/fusion/creative-studio/platform/discovery";
import { type StudioPresentationApplication } from "@/lib/fusion/creative-studio/platform/presentation-application";
import {
  resolveStandardButtonPreset,
  STANDARD_BUTTON_CATALOG,
  type BrandPreviewContext,
  type StandardButtonPresetId,
} from "./standard-button-catalog";
import { STANDARD_BUTTON_APPEARANCE_PRESETS } from "./standard-button-appearance";

export type StandardButtonDiscoveryApplication = StudioPresentationApplication & {
  presetId: StandardButtonPresetId;
  presetVersion: number;
};

export function standardButtonDiscoveryResources(
  brand: BrandPreviewContext
): readonly StudioDiscoveryResource<StandardButtonDiscoveryApplication, Record<string, unknown>>[] {
  return STANDARD_BUTTON_CATALOG.map((preset) => {
    const presentation = resolveStandardButtonPreset(preset, brand);
    const appearanceCategory = STANDARD_BUTTON_APPEARANCE_PRESETS.find((candidate) => candidate.id === preset.props.appearancePreset)?.category;
    const readiness = preset.readiness === "product_ready" ? "ready" as const : "preview" as const;
    return {
      ref: { provider: "tapconnect-catalog", resourceId: `standard-button:${preset.id}`, version: preset.version },
      kind: "button-presentation",
      label: preset.name,
      description: preset.description,
      preview: { authority: "creative-composition-renderer", payload: presentation },
      taxonomy: { category: "standard", collections: ["standard-buttons", ...(appearanceCategory ? [`button-${appearanceCategory.toLowerCase().replaceAll(" ", "-").replaceAll("&", "and")}`] : [])], tags: preset.tags },
      compatibility: { targetKinds: ["button"], requiredCapabilities: ["presentation"] },
      source: { authority: "tapconnect-standard-button-catalog", provenance: `standard-button:${preset.id}@${preset.version}` },
      brand: { relationship: preset.id.startsWith("brand-") ? "derived" : "compatible" },
      governance: { readiness, approval: "approved", available: true },
      search: { text: [preset.name, preset.description, preset.useCase, ...preset.tags].join(" "), keywords: preset.tags },
      application: { presentation, supportedOperations: ["apply", "replace"], presetId: preset.id, presetVersion: preset.version },
      consumerCompatibility: { insertion: "standalone-or-future-structured-slot" },
    };
  });
}

export function discoverStandardButtons(brand: BrandPreviewContext, context: StudioDiscoveryContext) {
  return filterStudioDiscoveryResources(standardButtonDiscoveryResources(brand), context);
}

export function standardButtonDiscoveryContext(input: {
  query?: string;
  mode?: StudioDiscoveryContext["mode"];
  readiness?: StudioDiscoveryContext["readiness"];
} = {}): StudioDiscoveryContext {
  return {
    authoringJob: "add-action",
    target: { kind: "button", capabilities: ["presentation", "action", "content"] },
    resourceKinds: ["button-presentation"],
    brandRelationship: "derived",
    approval: ["approved"],
    readiness: input.readiness ?? ["ready"],
    query: input.query,
    mode: input.mode ?? (input.query ? "search" : "recommended"),
    category: "standard",
    limit: 40,
  };
}
