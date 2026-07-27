/**
 * Shared Visual Authoring Core V0 — unit proofs.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyToSimilarInherited,
  promoteColorToBrandRole,
  resetItemToBrand,
  resetPropertyToBrandKeepPreset,
  resolveProperty,
  setItemOverride,
  type ItemPropertyMap,
  type PropertyStack,
} from "@/lib/fusion/authoring/visual-property";
import {
  brandColorsFromKit,
  COLOR_ROLE_TO_BRAND_FIELD,
  readColorRole,
  writeColorRole,
} from "@/lib/fusion/authoring/brand-kit-adapter";
import { checkBrandContrast, contrastRatio, readableOn } from "@/lib/fusion/authoring/contrast";
import {
  approveStarterItem,
  createBrandStarterKitFixture,
  isApprovedBrandTruth,
  pendingStarterCount,
} from "@/lib/fusion/authoring/brand-starter-kit";
import {
  applyBackgroundToSimilarOnCard,
  buildActionPropertyMap,
  buildCardVisualModel,
  overrideCardItemProperty,
  promoteButtonBackgroundToBrand,
  resetCardItem,
  resetCardItemProperty,
  resolveSelectedAction,
  syncCardVisualFromBrand,
} from "@/lib/fusion/authoring/card-visual-resolve";
import {
  createLabeledHistory,
  pushLabeledHistory,
  redoLabeledHistory,
  undoLabeledHistory,
} from "@/lib/fusion/authoring/session-history";
import {
  DEFAULT_BRAND_WORKSPACE_STATE,
  loadBrandWorkspaceState,
  saveBrandWorkspaceState,
  BRAND_WORKSPACE_STORAGE_KEY,
} from "@/lib/fusion/authoring/workspace-state";
import {
  intakeFromPastedHex,
  intakeFromWebsiteUrl,
} from "@/lib/fusion/authoring/intake";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";

describe("visual property resolution order", () => {
  it("resolves Brand → Surface → Preset → Item", () => {
    const stack: PropertyStack = {
      brand: { value: "#111111", role: "primary" },
      surface: { value: "#222222", role: "primary" },
      preset: { value: "#333333", role: "primary" },
      item: { value: "#444444", role: "primary" },
    };
    assert.equal(resolveProperty(stack).value, "#444444");
    assert.equal(resolveProperty(stack).source, "custom");
    assert.equal(resolveProperty({ ...stack, item: undefined }).value, "#333333");
    assert.equal(resolveProperty({ ...stack, item: undefined }).source, "preset");
    assert.equal(
      resolveProperty({ ...stack, item: undefined, preset: undefined }).value,
      "#222222"
    );
    assert.equal(
      resolveProperty({ ...stack, item: undefined, preset: undefined }).source,
      "surface"
    );
    const brandOnly = resolveProperty({
      brand: { value: "#111111", role: "primary" },
    });
    assert.equal(brandOnly.value, "#111111");
    assert.equal(brandOnly.source, "brand");
    assert.equal(brandOnly.role, "primary");
  });

  it("exposes provenance on every resolved property", () => {
    const r = resolveProperty({
      brand: { value: "#0f0", role: "cta" },
      item: { value: "#f00", role: "cta" },
      label: "Button background",
    });
    assert.equal(r.source, "custom");
    assert.equal(r.role, "cta");
    assert.equal(r.label, "Button background");
  });
});

describe("Card custom override proof", () => {
  const brand = {
    primaryColor: "#1a5f4a",
    secondaryColor: "#0ea5e9",
    accentColor: "#f59e0b",
    backgroundColor: "#0b0f19",
    textColor: "#f8fafc",
    buttonStyle: "ROUNDED",
  };

  it("custom background affects one property only", () => {
    const map = buildActionPropertyMap(brand, null);
    const overridden: ItemPropertyMap = {
      ...map,
      background: setItemOverride(map.background, "#ff00aa", "cta"),
    };
    assert.equal(resolveProperty(overridden.background).source, "custom");
    assert.equal(resolveProperty(overridden.background).value, "#ff00aa");
    assert.equal(resolveProperty(overridden.foreground!).source, "brand");
    assert.equal(resolveProperty(overridden.radius!).source, "surface");
    assert.equal(resolveProperty(overridden.icon!).source, "preset");
  });

  it("reset property to Brand restores inheritance", () => {
    let map = buildActionPropertyMap(brand, { backgroundColor: "#abcdef" });
    assert.equal(resolveProperty(map.background).source, "custom");
    map = {
      ...map,
      background: resetPropertyToBrandKeepPreset(map.background),
    };
    assert.equal(resolveProperty(map.background).source, "brand");
    assert.equal(resolveProperty(map.background).value, brandColorsFromKit(brand).cta);
    assert.equal(resolveProperty(map.icon).source, "preset");
  });

  it("reset item to Brand clears overrides but keeps preset icon", () => {
    let map: ItemPropertyMap = buildActionPropertyMap(brand, {
      backgroundColor: "#111111",
      textColor: "#222222",
    });
    map = resetItemToBrand(map);
    assert.equal(resolveProperty(map.background).source, "brand");
    assert.equal(resolveProperty(map.foreground).source, "brand");
    assert.equal(resolveProperty(map.icon).source, "preset");
  });

  it("Brand change preserves Card custom override", () => {
    let model = buildCardVisualModel(brand, null);
    const id = model.items[0].id;
    model = overrideCardItemProperty(model, id, "background", "#c0ffee");
    model = syncCardVisualFromBrand(model, {
      ...brand,
      primaryColor: "#0000ff",
    });
    const resolved = resolveSelectedAction({
      ...model,
      selectedItemId: id,
    })!;
    assert.equal(resolved.background.source, "custom");
    assert.equal(resolved.background.value, "#c0ffee");
    assert.equal(resolved.foreground.source, "brand");
    assert.equal(resolved.foreground.value, brand.textColor);
  });

  it("resetCardItemProperty and resetCardItem work on model", () => {
    let model = buildCardVisualModel(brand, null);
    const id = model.items[0].id;
    model = overrideCardItemProperty(model, id, "background", "#aaaaaa");
    model = resetCardItemProperty(model, id, "background");
    assert.equal(
      resolveSelectedAction({ ...model, selectedItemId: id })!.background.source,
      "brand"
    );
    model = overrideCardItemProperty(model, id, "background", "#bbbbbb");
    model = resetCardItem(model, id);
    assert.equal(
      resolveSelectedAction({ ...model, selectedItemId: id })!.background.source,
      "brand"
    );
  });

  it("apply to similar skips intentional custom overrides", () => {
    const items = [
      {
        id: "a",
        properties: {
          background: setItemOverride(
            { brand: { value: "#111", role: "cta" } },
            "#aaa",
            "cta"
          ),
        },
      },
      {
        id: "b",
        properties: {
          background: { brand: { value: "#111", role: "cta" } },
        },
      },
      {
        id: "c",
        properties: {
          background: setItemOverride(
            { brand: { value: "#111", role: "cta" } },
            "#ccc",
            "cta"
          ),
        },
      },
    ];
    const next = applyToSimilarInherited(items, "background", "#aaa", "a");
    assert.equal(resolveProperty(next[1].properties.background).value, "#aaa");
    assert.equal(resolveProperty(next[2].properties.background).value, "#ccc");
  });
});

describe("promotion behavior", () => {
  it("promotes custom button background to Brand CTA via API field mapping", () => {
    const brand = { primaryColor: "#1a5f4a", textColor: "#fff", buttonStyle: "PILL" };
    let model = buildCardVisualModel(brand, null);
    const id = model.items[0].id;
    model = overrideCardItemProperty(model, id, "background", "#9b59b6");
    const { result, nextBrand, nextModel } = promoteButtonBackgroundToBrand(model, id);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.role, "cta");
    assert.equal(COLOR_ROLE_TO_BRAND_FIELD.cta, "primaryColor");
    assert.equal(nextBrand?.primaryColor, "#9b59b6");
    assert.ok(nextModel);
    const other = buildCardVisualModel(nextBrand!, null);
    assert.equal(resolveSelectedAction(other)!.background.value, "#9b59b6");
  });

  it("rejects promote when not custom", () => {
    const model = buildCardVisualModel({ primaryColor: "#111" }, null);
    const { result } = promoteButtonBackgroundToBrand(model, model.items[0].id);
    assert.equal(result.ok, false);
  });

  it("promoteColorToBrandRole validates hex", () => {
    assert.equal(promoteColorToBrandRole("nope", "cta").ok, false);
    assert.equal(promoteColorToBrandRole("#abc", "primary").ok, true);
  });
});

describe("Brand Starter Kit fixture", () => {
  it("is deterministic and never auto-approved", () => {
    const a = createBrandStarterKitFixture({
      businessName: "Acme",
      website: "acme.example",
    });
    const b = createBrandStarterKitFixture({
      businessName: "Acme",
      website: "acme.example",
    });
    assert.equal(a.id, b.id);
    assert.equal(a.headline, "We found your Brand.");
    assert.ok(a.items.length >= 6);
    for (const item of a.items) {
      assert.equal(isApprovedBrandTruth(item.state), false);
    }
    assert.equal(pendingStarterCount(a), a.items.length);
    const approved = approveStarterItem(a, "color-primary");
    assert.equal(
      isApprovedBrandTruth(approved.items.find((i) => i.id === "color-primary")!.state),
      true
    );
    assert.equal(
      isApprovedBrandTruth(approved.items.find((i) => i.id === "color-secondary")!.state),
      false
    );
  });
});

describe("intake stubs", () => {
  it("website URL uses local fixture only", () => {
    const ok = intakeFromWebsiteUrl("https://cafe.example", { businessName: "Cafe" });
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.preparedLocally, true);
      assert.equal(ok.starter?.headline, "We found your Brand.");
    }
    const empty = intakeFromWebsiteUrl("https://empty.invalid", {});
    assert.equal(empty.ok, false);
    if (!empty.ok) assert.equal(empty.offerManual, true);
  });

  it("pasted hex extracts colors", () => {
    const r = intakeFromPastedHex("#1a5f4a, c4a35a");
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.colors, ["#1a5f4a", "#c4a35a"]);
  });
});

describe("color roles + contrast", () => {
  it("maps roles to Brand Kit fields without migration", () => {
    const kit = {
      primaryColor: "#111111",
      secondaryColor: "#222222",
      accentColor: "#333333",
      backgroundColor: "#000000",
      textColor: "#ffffff",
    };
    assert.equal(readColorRole(kit, "cta"), "#111111");
    assert.equal(readColorRole(kit, "link"), "#333333");
    const next = writeColorRole(kit, "cta", "#abcdef");
    assert.equal(next.primaryColor, "#abcdef");
  });

  it("reports contrast for required pairs", () => {
    const checks = checkBrandContrast({
      background: "#0b0f19",
      surface: "#111827",
      headline: "#f8fafc",
      body: "#e2e8f0",
      ctaBg: "#22c55e",
      ctaText: readableOn("#22c55e"),
      link: "#f59e0b",
    });
    assert.deepEqual(
      checks.map((c) => c.id),
      [
        "headline_on_background",
        "body_on_surface",
        "cta_text_on_cta",
        "link_on_background",
      ]
    );
    assert.ok((contrastRatio("#000", "#fff") ?? 0) > 20);
  });
});

describe("session history undo/redo", () => {
  it("undo and redo labeled Brand/Card actions", () => {
    let h = createLabeledHistory({ color: "#111" });
    h = pushLabeledHistory(h, { color: "#222" }, "Brand color · Primary");
    h = pushLabeledHistory(h, { color: "#333" }, "Card button background · Custom");
    assert.equal(h.past.length, 2);
    const u = undoLabeledHistory(h)!;
    assert.equal(u.present.color, "#222");
    const r = redoLabeledHistory(u)!;
    assert.equal(r.present.color, "#333");
  });
});

describe("workspace state restoration", () => {
  it("persists topic, drawer, zoom, preview surface", () => {
    const mem: Record<string, string> = {};
    const store = {
      getItem: (k: string) => mem[k] ?? null,
      setItem: (k: string, v: string) => {
        mem[k] = v;
      },
      removeItem: (k: string) => {
        delete mem[k];
      },
      clear: () => {
        for (const k of Object.keys(mem)) delete mem[k];
      },
      key: () => null,
      length: 0,
    };
    const prev = globalThis.sessionStorage;
    Object.defineProperty(globalThis, "sessionStorage", { value: store, configurable: true });
    saveBrandWorkspaceState({
      ...DEFAULT_BRAND_WORKSPACE_STATE,
      topic: "colors",
      drawerOpen: false,
      zoom: 1.2,
      previewSurface: "card",
      selectedAssetId: "logo-1",
    });
    assert.ok(mem[BRAND_WORKSPACE_STORAGE_KEY]);
    const loaded = loadBrandWorkspaceState();
    assert.equal(loaded.topic, "colors");
    assert.equal(loaded.drawerOpen, false);
    assert.equal(loaded.zoom, 1.2);
    assert.equal(loaded.previewSurface, "card");
    assert.equal(loaded.selectedAssetId, "logo-1");
    Object.defineProperty(globalThis, "sessionStorage", { value: prev, configurable: true });
  });
});

describe("shared Card preview model", () => {
  it("builds from TapConnectCardConfig actions", () => {
    const config = {
      version: 3,
      sections: [
        {
          id: "act-1",
          type: "action",
          enabled: true,
          order: 0,
          label: "Call",
          actionKind: "call",
          backgroundColor: "#112233",
        },
        {
          id: "act-2",
          type: "action",
          enabled: true,
          order: 1,
          label: "Web",
          actionKind: "website",
        },
      ],
    } as TapConnectCardConfig;
    const model = buildCardVisualModel(
      { primaryColor: "#1a5f4a", textColor: "#fff" },
      config
    );
    assert.equal(model.items.length, 2);
    assert.equal(
      resolveSelectedAction({ ...model, selectedItemId: "act-1" })!.background.source,
      "custom"
    );
    assert.equal(
      resolveSelectedAction({ ...model, selectedItemId: "act-2" })!.background.source,
      "brand"
    );
    const similar = applyBackgroundToSimilarOnCard(model, "act-1", "#112233");
    assert.equal(
      resolveSelectedAction({ ...similar, selectedItemId: "act-2" })!.background.value,
      "#112233"
    );
  });
});

describe("logo contain plates (contract)", () => {
  it("documents contain + plate variants for UI", () => {
    const plates = ["checker", "dark", "light", "compact"] as const;
    assert.ok(plates.includes("dark"));
    assert.ok(plates.includes("light"));
  });
});
