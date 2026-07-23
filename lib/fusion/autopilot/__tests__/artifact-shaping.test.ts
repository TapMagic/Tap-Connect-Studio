import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getRecipe } from "../recipes";
import { shapeArtifactsForRecipe } from "../artifact-shaping";
import type { AiGenerateResult } from "@/lib/services/ai-generate";

const sampleDraft = {
  title: "Weekend promo",
  industry: "hospitality",
  theme: {
    primaryColor: "#b8ff3c",
    secondaryColor: "#0b0f19",
    backgroundColor: "#0b0f19",
    textColor: "#ffffff",
  },
  blocks: [
    { id: "1", type: "headline", data: { headline: "Hello" } },
    { id: "2", type: "rich_text", data: { body: "Body" } },
    { id: "3", type: "hero_image", data: { imageUrl: "/x.png" } },
    { id: "4", type: "offer_coupon", data: { title: "20% off" } },
  ],
} as unknown as AiGenerateResult;

describe("artifact shaping", () => {
  it("theme_refresh emits theme only", () => {
    const recipe = getRecipe("campaign.theme_refresh");
    assert.ok(recipe);
    const artifacts = shapeArtifactsForRecipe(recipe!, sampleDraft);
    assert.equal(artifacts.length, 1);
    assert.equal(artifacts[0]?.kind, "theme");
  });

  it("schedule_pack includes schedule_hint", () => {
    const recipe = getRecipe("campaign.schedule_pack");
    assert.ok(recipe);
    const artifacts = shapeArtifactsForRecipe(recipe!, sampleDraft);
    assert.ok(artifacts.some((a) => a.kind === "schedule_hint"));
  });

  it("copy_refresh prefers copy_block", () => {
    const recipe = getRecipe("campaign.copy_refresh");
    assert.ok(recipe);
    const artifacts = shapeArtifactsForRecipe(recipe!, sampleDraft);
    assert.equal(artifacts[0]?.kind, "copy_block");
  });
});
