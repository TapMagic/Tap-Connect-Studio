/**
 * Shape Autopilot proposal artifacts to match recipe outputKinds.
 */

import type { AiGenerateResult } from "@/lib/services/ai-generate";
import type { AutopilotRecipe } from "./recipes";
import type { AutopilotArtifact } from "./types";

export function shapeArtifactsForRecipe(
  recipe: AutopilotRecipe,
  draft: AiGenerateResult
): AutopilotArtifact[] {
  const kinds = new Set(recipe.outputKinds);
  const artifacts: AutopilotArtifact[] = [];

  if (kinds.has("campaign_draft") || kinds.has("copy_block")) {
    const blocks =
      kinds.has("copy_block") && !kinds.has("campaign_draft")
        ? draft.blocks.filter((b) =>
            ["headline", "rich_text", "button_group", "offer_coupon", "faq"].includes(
              String(b.type)
            )
          )
        : draft.blocks;
    artifacts.push({
      kind: kinds.has("campaign_draft") ? "campaign_draft" : "copy_block",
      label: kinds.has("campaign_draft") ? draft.title : `Copy: ${draft.title}`,
      payload: {
        title: draft.title,
        blocks,
        industry: draft.industry,
        shapedBy: recipe.id,
      },
    });
  }

  if (kinds.has("theme")) {
    artifacts.push({
      kind: "theme",
      label: "Theme palette",
      payload: { ...draft.theme, shapedBy: recipe.id },
    });
  }

  if (kinds.has("schedule_hint")) {
    artifacts.push({
      kind: "schedule_hint",
      label: "Launch windows",
      payload: {
        timezoneHint: "America/New_York",
        windows: [
          { day: "Thu", localTime: "10:00", reason: "Midweek engagement" },
          { day: "Sat", localTime: "11:00", reason: "Weekend foot traffic" },
        ],
        shapedBy: recipe.id,
        note: "Hints only — not scheduled until operator confirms",
      },
    });
  }

  if (artifacts.length === 0) {
    artifacts.push({
      kind: "campaign_draft",
      label: draft.title,
      payload: { title: draft.title, blocks: draft.blocks, industry: draft.industry },
    });
  }

  return artifacts;
}
