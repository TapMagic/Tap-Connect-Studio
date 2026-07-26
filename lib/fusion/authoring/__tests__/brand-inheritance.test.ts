import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyInheritanceToDraft,
  copyOnce,
  createInheritanceState,
  overrideField,
  resolveInheritedValue,
  restoreInherited,
  syncFromBrandKit,
} from "../brand-inheritance";

describe("brand kit inheritance", () => {
  const kit = {
    logoUrl: "https://cdn.example/logo.png",
    primaryColor: "#22c55e",
    businessName: "Harbor Tap",
    phone: "555-0100",
    tone: "warm",
  };

  it("creates linked fields from Brand Kit snapshot", () => {
    const state = createInheritanceState(kit);
    assert.equal(state.useBrandKit, true);
    assert.equal(resolveInheritedValue(state, "primaryColor"), "#22c55e");
    assert.equal(state.fields.primaryColor?.mode, "linked");
  });

  it("override then restore Brand Kit values", () => {
    let state = createInheritanceState(kit);
    state = overrideField(state, "primaryColor", "#ff0000");
    assert.equal(resolveInheritedValue(state, "primaryColor"), "#ff0000");
    assert.equal(state.fields.primaryColor?.mode, "overridden");
    state = restoreInherited(state, "primaryColor");
    assert.equal(resolveInheritedValue(state, "primaryColor"), "#22c55e");
    // Default is copy/restore (not durable sync) — restore lands on copied
    assert.equal(state.fields.primaryColor?.mode, "copied");
  });

  it("copy once freezes values from later kit sync", () => {
    let state = createInheritanceState(kit);
    state = copyOnce(state);
    assert.equal(state.staySynchronized, false);
    assert.equal(state.fields.primaryColor?.mode, "copied");
    const synced = syncFromBrandKit(state, { ...kit, primaryColor: "#0000ff" });
    assert.equal(synced.changedKeys.length, 0);
    assert.equal(resolveInheritedValue(synced.state, "primaryColor"), "#22c55e");
  });

  it("optional session re-apply reports impact keys when enabled", () => {
    const state = createInheritanceState(kit, { staySynchronized: true });
    const synced = syncFromBrandKit(state, { ...kit, primaryColor: "#111111", tone: "bold" });
    assert.ok(synced.changedKeys.includes("primaryColor"));
    assert.ok(synced.changedKeys.includes("tone"));
    assert.equal(resolveInheritedValue(synced.state, "primaryColor"), "#111111");
  });

  it("defaults to non-durable session copy (staySynchronized false)", () => {
    const state = createInheritanceState(kit);
    assert.equal(state.staySynchronized, false);
  });

  it("applies inheritance into draft records", () => {
    const state = createInheritanceState(kit);
    const draft = applyInheritanceToDraft(
      { title: "", accent: "" },
      state,
      { businessName: "title", primaryColor: "accent" }
    );
    assert.equal(draft.title, "Harbor Tap");
    assert.equal(draft.accent, "#22c55e");
  });
});
