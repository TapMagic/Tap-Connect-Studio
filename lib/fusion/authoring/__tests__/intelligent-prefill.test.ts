import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInheritanceState, overrideField } from "../brand-inheritance";
import {
  fillRemainingBlanks,
  refreshFromApproved,
  resetToSavedInformation,
  parsePrefillPolicy,
  sourceLabel,
  stopAutomaticPrefill,
  stopUsingSource,
} from "../intelligent-prefill";

describe("intelligent prefill", () => {
  const approved = {
    businessName: "Northstar Workshop",
    phone: "+1 555 0100",
    primaryColor: "#1a5f4a",
    logoUrl: "https://example.com/logo.png",
  };

  it("fills only blank fields and preserves overrides", () => {
    let state = createInheritanceState(
      { businessName: "Northstar Workshop" },
      { useBrandKit: true }
    );
    state = overrideField(state, "primaryColor", "#ff0000");
    const next = fillRemainingBlanks(state, approved);
    assert.equal(next.fields.phone?.localValue, "+1 555 0100");
    assert.equal(next.fields.primaryColor?.mode, "overridden");
    assert.equal(next.fields.primaryColor?.localValue, "#ff0000");
    assert.equal(next.fields.businessName?.localValue, "Northstar Workshop");
  });

  it("never replaces locked fields on refresh", () => {
    const state = createInheritanceState(approved, { useBrandKit: true });
    const next = refreshFromApproved(state, {
      ...approved,
      businessName: "Changed",
      primaryColor: "#000000",
    }, { lockedKeys: ["businessName"] });
    assert.equal(next.fields.businessName?.localValue, "Northstar Workshop");
    assert.equal(next.fields.primaryColor?.localValue, "#000000");
  });

  it("stop automatic prefill does not erase values", () => {
    const state = createInheritanceState(approved, { useBrandKit: true });
    const policy = stopAutomaticPrefill({
      enabled: true,
      autoFillBlanks: true,
      lastRefreshAt: null,
    });
    assert.equal(policy.enabled, false);
    assert.equal(state.fields.businessName?.localValue, "Northstar Workshop");
  });

  it("reset to saved information restores a single field", () => {
    let state = createInheritanceState(approved, { useBrandKit: true });
    state = overrideField(state, "phone", "custom-phone");
    const next = resetToSavedInformation(state, approved, {
      onlyKeys: ["phone"],
    });
    assert.equal(next.fields.phone?.localValue, "+1 555 0100");
    assert.equal(next.fields.phone?.mode, "linked");
  });

  it("stop using source marks field ignored", () => {
    const state = createInheritanceState(approved, { useBrandKit: true });
    const next = stopUsingSource(state, "logoUrl");
    assert.equal(next.fields.logoUrl?.mode, "ignored");
  });

  it("exposes Owner-facing source labels", () => {
    assert.equal(sourceLabel("business"), "From Business");
    assert.equal(sourceLabel("brand"), "From Brand");
    assert.equal(sourceLabel("website"), "From website");
    assert.equal(sourceLabel("custom"), "Custom here");
  });

  it("round-trips the persisted opt-in policy without enabling an explicit off state", () => {
    const parsed = parsePrefillPolicy(
      JSON.parse(
        JSON.stringify({
          enabled: false,
          autoFillBlanks: false,
          lastRefreshAt: "2026-07-30T12:00:00.000Z",
        })
      )
    );
    assert.deepEqual(parsed, {
      enabled: false,
      autoFillBlanks: false,
      lastRefreshAt: "2026-07-30T12:00:00.000Z",
    });
  });
});
