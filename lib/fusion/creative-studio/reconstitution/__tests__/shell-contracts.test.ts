import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  INITIAL_STUDIO_DRAWER_STATE,
  studioDrawerReducer,
} from "../drawer-controller";
import {
  resolveStudioRail,
  STUDIO_RAIL_DESTINATIONS,
} from "../studio-rail-registry";
import { loadStudioShellSession, saveStudioShellSession, STUDIO_RECONSTITUTION_SESSION_KEY } from "../studio-shell-state";

describe("Studio reconstitution rail", () => {
  it("keeps the approved seven destinations in stable order", () => {
    assert.deepEqual(
      STUDIO_RAIL_DESTINATIONS.map((item) => item.label),
      ["Templates", "Add", "Text", "Design", "Brand", "Assets", "Outline"]
    );
  });

  it("keeps disabled destinations visible and preview internal-only", () => {
    const customer = resolveStudioRail({ brand: "preview" }, false);
    assert.equal(customer.length, 7);
    assert.equal(customer.find((item) => item.id === "brand")?.interactive, false);
    assert.equal(customer.find((item) => item.id === "templates")?.readiness, "disabled");
    assert.equal(resolveStudioRail({ brand: "preview" }, true).find((item) => item.id === "brand")?.interactive, true);
  });
});

describe("Studio drawer controller", () => {
  it("provides one drawer with predictable navigate, back, and close behavior", () => {
    let state = studioDrawerReducer(INITIAL_STUDIO_DRAWER_STATE, { type: "OPEN_RAIL", railId: "add" });
    state = studioDrawerReducer(state, { type: "NAVIGATE", path: ["buttons", "standard"] });
    assert.equal(state.mode, "standard");
    assert.deepEqual(state.path, ["buttons", "standard"]);
    state = studioDrawerReducer(state, { type: "BACK" });
    assert.deepEqual(state.path, ["buttons"]);
    state = studioDrawerReducer(state, { type: "CLOSE" });
    assert.equal(state.mode, "closed");
  });

  it("restores query and scroll for each discovery path", () => {
    let state = studioDrawerReducer(INITIAL_STUDIO_DRAWER_STATE, { type: "OPEN_RAIL", railId: "add" });
    state = studioDrawerReducer(state, { type: "NAVIGATE", path: ["buttons", "standard"] });
    state = studioDrawerReducer(state, { type: "SET_QUERY", query: "outline" });
    state = studioDrawerReducer(state, { type: "SET_SCROLL", scrollOffset: 240 });
    state = studioDrawerReducer(state, { type: "NAVIGATE", path: ["buttons"] });
    state = studioDrawerReducer(state, { type: "NAVIGATE", path: ["buttons", "standard"] });
    assert.equal(state.query, "outline");
    assert.equal(state.scrollOffset, 240);
  });

  it("returns from a governed family to the customer-visible Buttons gallery", () => {
    let state = studioDrawerReducer(INITIAL_STUDIO_DRAWER_STATE, { type: "OPEN_RAIL", railId: "add" });
    state = studioDrawerReducer(state, {
      type: "NAVIGATE",
      path: ["buttons", "family", "cabinet-noir"],
    });
    state = studioDrawerReducer(state, { type: "BACK" });
    assert.deepEqual(state.path, ["buttons"]);
    assert.equal(state.mode, "standard");
  });

  it("reuses the same governed-family route from Curated discovery", () => {
    let state = studioDrawerReducer(INITIAL_STUDIO_DRAWER_STATE, { type: "OPEN_RAIL", railId: "add" });
    state = studioDrawerReducer(state, { type: "NAVIGATE", path: ["curated", "family", "cabinet-noir"] });
    state = studioDrawerReducer(state, { type: "BACK" });
    assert.deepEqual(state.path, ["curated"]);
  });
});

describe("Studio shell session state", () => {
  it("keeps preferences but rejects stale transient task furniture on reload", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const drawer = studioDrawerReducer(INITIAL_STUDIO_DRAWER_STATE, { type: "OPEN_RAIL", railId: "layers" });
    saveStudioShellSession(storage, { version: 2, drawer, inspectorOpen: true, inspectorSection: "layout", viewport: "phone" });
    assert.ok(values.has(STUDIO_RECONSTITUTION_SESSION_KEY));
    const restored = loadStudioShellSession(storage);
    assert.equal(restored.drawer.mode, "closed");
    assert.equal(restored.inspectorOpen, false);
    assert.equal(restored.adaptiveWorkspace?.activeTaskId, "compose-card");
    assert.equal(restored.inspectorSection, "layout");
    assert.equal(restored.viewport, "phone");
  });
});
