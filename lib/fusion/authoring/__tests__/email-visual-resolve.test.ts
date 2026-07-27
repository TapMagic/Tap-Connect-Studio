/**
 * Email visual resolve — Shared Visual Authoring Core fourth consumer proofs.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ContentBlock } from "@/lib/types/campaign";
import {
  buildEmailVisualModel,
  buildEmailCtaPropertyMap,
  emailProvenanceLabel,
  resetEmailSurfaceProperty,
  resetEmailThemeToBrand,
  overrideEmailItemProperty,
  resetEmailItem,
  resolveEmailSurface,
  resolveSelectedEmailCta,
  applyResolvedToEmailTheme,
  checkEmailContrast,
  emailTypographyFallback,
} from "@/lib/fusion/authoring/email-visual-resolve";
import { resolveProperty } from "@/lib/fusion/authoring/visual-property";

const brand = {
  primaryColor: "#1a5f4a",
  secondaryColor: "#0ea5e9",
  accentColor: "#f59e0b",
  backgroundColor: "#0b0f19",
  textColor: "#f8fafc",
  fontStyle: "MODERN",
  buttonStyle: "ROUNDED",
};

const blocks: ContentBlock[] = [
  {
    id: "btn",
    type: "button_group",
    order: 0,
    enabled: true,
    label: "CTA",
    data: {
      buttons: [
        {
          id: "b1",
          label: "Shop",
          url: "https://example.com",
          style: "primary",
          icon: "link",
          backgroundColor: "#ff00aa",
        },
      ],
    },
  },
];

describe("Email provenance labels", () => {
  it("maps surface → Email", () => {
    assert.equal(emailProvenanceLabel("surface"), "Email");
    assert.equal(emailProvenanceLabel("brand"), "Brand");
  });
});

describe("Brand → Email property resolution", () => {
  it("inherits Brand when no Email theme override", () => {
    const model = buildEmailVisualModel(brand, null, blocks);
    const surface = resolveEmailSurface(model);
    assert.equal(surface.background?.source, "brand");
  });

  it("applies Email theme override as surface", () => {
    const model = buildEmailVisualModel(brand, { backgroundColor: "#224466" }, blocks);
    const surface = resolveEmailSurface(model);
    assert.equal(surface.background?.source, "surface");
    assert.equal(surface.background?.value, "#224466");
  });
});

describe("CTA item override", () => {
  it("overrides one CTA property without detaching siblings", () => {
    const model = buildEmailVisualModel(brand, null, blocks);
    const itemId = model.items[0]!.id;
    const next = overrideEmailItemProperty(model, itemId, "background", "#aabbcc");
    const cta = resolveSelectedEmailCta(next);
    assert.equal(cta?.background?.source, "custom");
    assert.equal(cta?.background?.value, "#aabbcc");
  });

  it("resets CTA to Brand", () => {
    const model = buildEmailVisualModel(brand, null, blocks);
    const itemId = model.items[0]!.id;
    let next = overrideEmailItemProperty(model, itemId, "background", "#aabbcc");
    next = resetEmailItem(next, itemId);
    const cta = resolveSelectedEmailCta(next);
    assert.notEqual(cta?.background?.source, "custom");
  });
});

describe("Reset property to Brand", () => {
  it("resets surface color to Brand", () => {
    let model = buildEmailVisualModel(brand, { headlineColor: "#112233" }, blocks);
    model = resetEmailSurfaceProperty(model, "headline");
    const surface = resolveEmailSurface(model);
    assert.equal(surface.headline?.source, "brand");
  });

  it("resets entire Email theme to Brand", () => {
    let model = buildEmailVisualModel(
      brand,
      { backgroundColor: "#111", headlineColor: "#222" },
      blocks
    );
    model = resetEmailThemeToBrand(model);
    const surface = resolveEmailSurface(model);
    assert.equal(surface.background?.source, "brand");
    assert.equal(surface.headline?.source, "brand");
  });
});

describe("Apply resolved theme", () => {
  it("flattens stacks to EmailVisualTheme", () => {
    const model = buildEmailVisualModel(brand, { ctaBackgroundColor: "#00ff99" }, blocks);
    const theme = applyResolvedToEmailTheme(model);
    assert.equal(theme.ctaBackgroundColor, "#00ff99");
  });
});

describe("Email-safe typography", () => {
  it("includes fallback stack", () => {
    const model = buildEmailVisualModel(brand, null, blocks);
    const typo = emailTypographyFallback(model);
    assert.match(typo.emailSafe, /Arial/);
  });
});

describe("Contrast checks", () => {
  it("runs dark-inbox advisory", () => {
    const model = buildEmailVisualModel(brand, null, blocks);
    const checks = checkEmailContrast(model);
    assert.ok(checks.length >= 4);
  });
});

describe("CTA property map", () => {
  it("tracks custom item layer", () => {
    const map = buildEmailCtaPropertyMap(brand, {
      id: "x",
      label: "Go",
      url: "#",
      style: "primary",
      icon: "link",
      backgroundColor: "#ff5500",
    });
    const resolved = resolveProperty(map.background);
    assert.equal(resolved.source, "custom");
  });
});
