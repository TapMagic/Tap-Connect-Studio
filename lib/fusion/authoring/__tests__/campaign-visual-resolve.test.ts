/**
 * Campaign Format Migration — unit proofs for shared visual adapter.
 * Maturity: IMPLEMENTED BUT NOT OWNER-READY.
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  applyCtaOverridesToBlocks,
  applyResolvedToCampaignTheme,
  buildCampaignVisualModel,
  buildCtaPropertyMap,
  campaignProvenanceLabel,
  checkCampaignContrast,
  classifyCampaignInheritance,
  overrideCampaignItemProperty,
  overrideCampaignSurfaceProperty,
  resetCampaignItem,
  resetCampaignItemProperty,
  resetCampaignSurfaceProperty,
  resetCampaignThemeToBrand,
  resolveCampaignSurface,
  resolveSelectedCampaignCta,
  syncCampaignVisualFromBrand,
  applyBackgroundToSimilarCampaignCtas,
} from "@/lib/fusion/authoring/campaign-visual-resolve";
import { resolveProperty } from "@/lib/fusion/authoring/visual-property";
import {
  CAMPAIGN_AUTHORING_TOOLS,
  clearWorkspaceTools,
  ensureDefaultToolRegistries,
  getWorkspaceTool,
  getWorkspaceTools,
} from "@/lib/fusion/authoring/workspace-tools";
import {
  createLabeledHistory,
  pushLabeledHistory,
  redoLabeledHistory,
  undoLabeledHistory,
} from "@/lib/fusion/authoring/session-history";
import type { ContentBlock } from "@/lib/types/campaign";

const brand = {
  primaryColor: "#1a5f4a",
  secondaryColor: "#0ea5e9",
  accentColor: "#f59e0b",
  backgroundColor: "#0b0f19",
  textColor: "#f8fafc",
  fontStyle: "MODERN",
  buttonStyle: "ROUNDED",
};

const sampleBlocks: ContentBlock[] = [
  {
    id: "btn-block",
    type: "button_group",
    order: 0,
    enabled: true,
    label: "Buttons",
    data: {
      buttons: [
        {
          id: "b1",
          label: "Primary CTA",
          url: "https://example.com",
          style: "primary",
          icon: "link",
          shape: "pill",
        },
        {
          id: "b2",
          label: "Secondary",
          url: "https://example.com/2",
          style: "secondary",
          icon: "external",
        },
      ],
    },
  },
];

describe("Campaign inheritance classification", () => {
  it("is mixed snapshot + runtime fallback", () => {
    const c = classifyCampaignInheritance();
    assert.equal(c.class, "mixed");
    assert.equal(c.properties.backgroundColor, "snapshot");
    assert.equal(c.properties.contactProfile, "runtime");
  });
});

describe("Campaign provenance labels", () => {
  it("maps surface → Campaign for host copy", () => {
    assert.equal(campaignProvenanceLabel("brand"), "Brand");
    assert.equal(campaignProvenanceLabel("surface"), "Campaign");
    assert.equal(campaignProvenanceLabel("preset"), "Preset");
    assert.equal(campaignProvenanceLabel("custom"), "Custom");
  });
});

describe("Brand → Campaign property resolution", () => {
  it("inherits background, headline, body, CTA from Brand when theme empty", () => {
    const model = buildCampaignVisualModel(brand, {}, [], null);
    const surface = resolveCampaignSurface(model);
    assert.equal(surface.background?.source, "brand");
    assert.equal(surface.background?.value, brand.backgroundColor);
    assert.equal(surface.headline?.source, "brand");
    assert.equal(surface.headline?.value, brand.textColor);
    assert.equal(surface.body?.source, "brand");
    assert.equal(surface.cta?.source, "brand");
    assert.equal(surface.cta?.value, brand.primaryColor);
  });

  it("Campaign surface override wins without detaching other roles", () => {
    let model = buildCampaignVisualModel(
      brand,
      { backgroundColor: "#111827", primaryColor: brand.primaryColor },
      [],
      null
    );
    model = overrideCampaignSurfaceProperty(model, "background", "#334155");
    const surface = resolveCampaignSurface(model);
    assert.equal(surface.background?.source, "surface");
    assert.equal(surface.background?.value, "#334155");
    assert.equal(campaignProvenanceLabel(surface.background!.source), "Campaign");
    assert.equal(surface.headline?.source, "brand");
  });
});

describe("Campaign CTA block/item override", () => {
  it("custom background affects one property only", () => {
    const map = buildCtaPropertyMap(brand, null, brand.primaryColor);
    const overridden = {
      ...map,
      background: {
        ...map.background,
        item: { value: "#ff00aa", role: "cta" as const },
      },
    } as typeof map;
    assert.equal(resolveProperty(overridden.background).source, "custom");
    assert.equal(resolveProperty(overridden.foreground).source, "brand");
    assert.ok(
      resolveProperty(overridden.radius).source === "preset" ||
        resolveProperty(overridden.radius).source === "surface" ||
        resolveProperty(overridden.radius).source === "brand"
    );
    assert.equal(resolveProperty(overridden.icon).source, "preset");
  });

  it("Brand change preserves Custom CTA override", () => {
    let model = buildCampaignVisualModel(brand, {}, sampleBlocks, "btn-block::b1");
    model = overrideCampaignItemProperty(model, "btn-block::b1", "background", "#abcdef");
    assert.equal(
      resolveSelectedCampaignCta(model)?.background?.source,
      "custom"
    );
    const nextBrand = { ...brand, primaryColor: "#00ff88", textColor: "#ffffff" };
    model = syncCampaignVisualFromBrand(model, nextBrand);
    const cta = resolveSelectedCampaignCta(model)!;
    assert.equal(cta.background?.source, "custom");
    assert.equal(cta.background?.value, "#abcdef");
    assert.equal(cta.foreground?.source, "brand");
    assert.equal(cta.foreground?.value, "#ffffff");
  });

  it("reset property and reset item restore inheritance", () => {
    let model = buildCampaignVisualModel(brand, {}, sampleBlocks, "btn-block::b1");
    model = overrideCampaignItemProperty(model, "btn-block::b1", "background", "#ff00aa");
    model = overrideCampaignItemProperty(model, "btn-block::b1", "foreground", "#111111");
    model = resetCampaignItemProperty(model, "btn-block::b1", "background");
    let cta = resolveSelectedCampaignCta(model)!;
    assert.notEqual(cta.background?.source, "custom");
    assert.equal(cta.foreground?.source, "custom");
    model = resetCampaignItem(model, "btn-block::b1");
    cta = resolveSelectedCampaignCta(model)!;
    assert.notEqual(cta.background?.source, "custom");
    assert.notEqual(cta.foreground?.source, "custom");
  });

  it("apply to similar skips already-custom siblings", () => {
    let model = buildCampaignVisualModel(brand, {}, sampleBlocks, "btn-block::b1");
    model = overrideCampaignItemProperty(model, "btn-block::b2", "background", "#111111");
    model = applyBackgroundToSimilarCampaignCtas(model, "btn-block::b1", "#ff00aa");
    // source item unchanged; b2 stays custom #111111
    const b2 = model.items.find((i) => i.id === "btn-block::b2")!;
    assert.equal(resolveProperty(b2.properties.background).value, "#111111");
  });
});

describe("Reset Campaign theme to Brand", () => {
  it("clears surface overrides", () => {
    let model = buildCampaignVisualModel(
      brand,
      { backgroundColor: "#222222", textColor: "#eeeeee" },
      [],
      null
    );
    model = resetCampaignThemeToBrand(model);
    const surface = resolveCampaignSurface(model);
    assert.equal(surface.background?.source, "brand");
    assert.equal(surface.headline?.source, "brand");
  });

  it("resetCampaignSurfaceProperty clears one key", () => {
    let model = buildCampaignVisualModel(
      brand,
      { backgroundColor: "#222222" },
      [],
      null
    );
    model = resetCampaignSurfaceProperty(model, "background");
    assert.equal(resolveCampaignSurface(model).background?.source, "brand");
  });
});

describe("Typography mapping", () => {
  it("maps fontStyle through surface stack", () => {
    const model = buildCampaignVisualModel(brand, { fontStyle: "display" }, [], null);
    const font = resolveCampaignSurface(model).font;
    assert.equal(font?.value, "display");
    assert.equal(font?.source, "surface");
  });
});

describe("Contrast + theme flatten + block writeback", () => {
  it("runs contrast checks", () => {
    const model = buildCampaignVisualModel(brand, {}, sampleBlocks, "btn-block::b1");
    const checks = checkCampaignContrast(model);
    assert.ok(checks.length >= 4);
  });

  it("applyResolvedToCampaignTheme snapshot-flattens for save/public", () => {
    let model = buildCampaignVisualModel(brand, {}, [], null);
    model = overrideCampaignSurfaceProperty(model, "background", "#123456");
    const theme = applyResolvedToCampaignTheme(model);
    assert.equal(theme.backgroundColor, "#123456");
    assert.equal(theme.primaryColor, brand.primaryColor);
  });

  it("applyCtaOverridesToBlocks writes custom only", () => {
    let model = buildCampaignVisualModel(brand, {}, sampleBlocks, "btn-block::b1");
    model = overrideCampaignItemProperty(model, "btn-block::b1", "background", "#ff00aa");
    const next = applyCtaOverridesToBlocks(model, sampleBlocks);
    const buttons = (next[0].data as { buttons: { id: string; backgroundColor?: string }[] })
      .buttons;
    assert.equal(buttons.find((b) => b.id === "b1")?.backgroundColor, "#ff00aa");
    assert.equal(buttons.find((b) => b.id === "b2")?.backgroundColor, undefined);
  });
});

describe("Session history for Campaign visual draft", () => {
  it("undo/redo theme change", () => {
    let h = createLabeledHistory({ bg: "#000000" });
    h = pushLabeledHistory(h, { bg: "#111111" }, "Campaign background");
    h = pushLabeledHistory(h, { bg: "#222222" }, "Campaign background");
    const undone = undoLabeledHistory(h);
    assert.ok(undone);
    assert.equal(undone!.present.bg, "#111111");
    const redone = redoLabeledHistory(undone!);
    assert.ok(redone);
    assert.equal(redone!.present.bg, "#222222");
  });
});

describe("Campaign tool registry + drawer recommendations", () => {
  beforeEach(() => {
    clearWorkspaceTools();
    ensureDefaultToolRegistries();
  });

  it("registers Campaign tools with recommended drawer modes", () => {
    const tools = getWorkspaceTools("campaign-authoring");
    assert.ok(tools.length >= 10);
    assert.equal(getWorkspaceTool("campaign-authoring", "colors")?.recommendedDrawerMode, "compact");
    assert.equal(getWorkspaceTool("campaign-authoring", "media")?.recommendedDrawerMode, "library");
    assert.equal(getWorkspaceTool("campaign-authoring", "history")?.recommendedDrawerMode, "expanded");
    assert.equal(getWorkspaceTool("campaign-authoring", "outline")?.recommendedDrawerMode, "balanced");
    assert.equal(CAMPAIGN_AUTHORING_TOOLS.find((t) => t.id === "buttons")?.recommendedDrawerMode, "compact");
  });
});
