import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildButtonHref } from "@/lib/fusion/card/designer-elements";
import {
  actionProps,
  inferActionIntentFromDestination,
  reconcileActionIntent,
  standardButtonActions,
  validateActionDestination,
} from "@/lib/fusion/card/action-intent-presentation";
import {
  resolveStandardButtonPreset,
  STANDARD_BUTTON_CATALOG,
} from "../standard-button-catalog";
import { buttonContentNode, updateButtonLabel } from "../../button-composition";
import { applyStudioPresentation } from "../../platform/presentation-application";
import { discoverStandardButtons, standardButtonDiscoveryContext, standardButtonDiscoveryResources } from "../standard-button-discovery";

describe("Standard Button catalog", () => {
  it("retains the five reviewed concepts but exposes only the three that pass the quality gate", () => {
    assert.deepEqual(STANDARD_BUTTON_CATALOG.map((preset) => preset.name), [
      "Brand Primary", "Brand Outline", "Full-width CTA", "Icon + Label", "Compact Utility",
    ]);
    assert.deepEqual(discoverStandardButtons({ businessName: "Acme" }, standardButtonDiscoveryContext()).resources.map((resource) => resource.application.presetId), ["brand-primary", "full-width-cta", "icon-label"]);
    assert.deepEqual(STANDARD_BUTTON_CATALOG.filter((preset) => preset.readiness === "architecture_ready").map((preset) => preset.id), ["brand-outline", "compact-utility"]);
  });

  it("resolves Brand props deterministically and preserves canonical nested label content", () => {
    const preset = STANDARD_BUTTON_CATALOG[0];
    const brand = { businessName: "Acme", primaryColor: "#ffcc00", headingFontFamily: "Acme Sans" };
    const first = resolveStandardButtonPreset(preset, brand);
    const second = resolveStandardButtonPreset(preset, brand);
    assert.deepEqual(first, second);
    assert.equal(first.fill, "#ffcc00");
    assert.equal(buttonContentNode(first, "label", "standard-brand-primary")?.props.text, "Get started");
  });

  it("searches by use case and tags without exposing withheld presets", () => {
    assert.deepEqual(discoverStandardButtons({ businessName: "Acme" }, standardButtonDiscoveryContext({ query: "contact" })).resources.map((resource) => resource.application.presetId), ["icon-label"]);
    assert.equal(discoverStandardButtons({ businessName: "Acme" }, standardButtonDiscoveryContext({ query: "wallet" })).resources.length, 0);
  });

  it("keeps meaningful geometry differences in the canonical resolved payload", () => {
    const primary = resolveStandardButtonPreset(STANDARD_BUTTON_CATALOG[0], { businessName: "Acme" });
    const fullWidth = resolveStandardButtonPreset(STANDARD_BUTTON_CATALOG[2], { businessName: "Acme" });
    assert.ok(Number(fullWidth.width) > Number(primary.width));
    assert.equal(fullWidth.width, 0.9);
    assert.equal(fullWidth.showDescription, true);
    assert.equal(primary.showIcon, true);
  });
});

describe("Standard Button replacement", () => {
  it("replaces presentation while preserving authored purpose and canonical label content", () => {
    const current = resolveStandardButtonPreset(STANDARD_BUTTON_CATALOG[0], { businessName: "Acme" });
    const authored = updateButtonLabel({
      ...current,
      label: "Call Rich",
      actionType: "call",
      href: "+13525550123",
      accessibleLabel: "Call Rich now",
      trackingName: "hero-call",
    }, "Call Rich", "button-1");
    const replacement = standardButtonDiscoveryResources({ businessName: "Acme", primaryColor: "#ffcc00" })[2];
    const result = applyStudioPresentation({
      operation: "apply",
      target: { id: "button-1", kind: "button", capabilities: ["presentation", "content", "action"], props: authored },
      resource: replacement,
      context: standardButtonDiscoveryContext(),
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const next = result.props;
    assert.match(String(next.gradientFill), /linear-gradient/);
    assert.equal(next.actionType, "call");
    assert.equal(next.href, "+13525550123");
    assert.equal(next.accessibleLabel, "Call Rich now");
    assert.equal(next.trackingName, "hero-call");
    assert.equal(buttonContentNode(next, "label", "button-1")?.props.text, "Call Rich");
    assert.deepEqual((next.presentationProvenance as { resource: { resourceId: string } }).resource.resourceId, "standard-button:full-width-cta");
  });
});

describe("Standard Button actions", () => {
  it("offers approved provider-neutral intents and no Payment", () => {
    assert.deepEqual(standardButtonActions().map((action) => action.kind), ["call", "email", "sms", "website", "map", "review", "book"]);
    assert.equal(standardButtonActions().some((action) => action.label.toLowerCase().includes("payment")), false);
  });

  it("normalizes Call once and resolves family-neutral tel semantics", () => {
    const props = actionProps("call", "+1 (352) 555-0123");
    assert.equal(props.href, "tel:+13525550123");
    assert.equal(buildButtonHref(props), "tel:+13525550123");
  });

  it("reconciles destination semantics for authoring presentation", () => {
    assert.equal(inferActionIntentFromDestination("tel:+15550118"), "call");
    assert.equal(inferActionIntentFromDestination("mailto:hello@example.com"), "email");
    assert.equal(inferActionIntentFromDestination("sms:+15550118"), "sms");
    assert.equal(inferActionIntentFromDestination("https://maps.google.com/?q=Ocala"), "map");
    assert.deepEqual(reconcileActionIntent("website", "tel:+15550118"), { kind: "call", destination: "tel:+15550118", source: "destination-scheme" });
    assert.equal(reconcileActionIntent("review", "https://example.com/review").kind, "review");
    assert.equal(reconcileActionIntent("call", "https://example.com").kind, "website");
    assert.equal(validateActionDestination("call", "tel:+15550118"), null);
  });

  it("supports canonical Text, Directions, and Booking destinations", () => {
    assert.equal(buildButtonHref(actionProps("sms", "352-555-0123")), "sms:3525550123");
    assert.equal(buildButtonHref(actionProps("email", "hello@example.com")), "mailto:hello@example.com");
    assert.match(buildButtonHref(actionProps("map", "123 Main St")) || "", /^https:\/\/maps\.google\.com/);
    assert.equal(buildButtonHref(actionProps("book", "https://cal.example.com/rich")), "https://cal.example.com/rich");
    assert.equal(validateActionDestination("book", "not a url"), "Enter a complete URL beginning with https://");
  });
});
