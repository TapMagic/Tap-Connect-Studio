import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMPTY_STUDIO_CONTEXT,
  INITIAL_STUDIO_WORKSPACE_STATE,
  STUDIO_ADAPTIVE_WORKSPACE_CONTRACT,
  classifyStudioViewport,
  resolveStudioContextRestoreTarget,
  resolveStudioWorkspaceChoreography,
  studioWorkspaceReducer,
} from "../../platform/adaptive-workspace";
import {
  STUDIO_CATALOG_BROWSER_CONTRACT,
  registerStudioCatalogAdapters,
  searchStudioCatalog,
  visibleStudioCatalogChildren,
  type StudioCatalogConsumerAdapter,
} from "../../platform/catalog-browser";
import { STUDIO_SEMANTIC_UI } from "../../platform/studio-semantic-ui";
import { projectStudioInspectorGroups } from "../../platform/inspector-grouping";

const surfaceAdapter: StudioCatalogConsumerAdapter = {
  contractId: STUDIO_CATALOG_BROWSER_CONTRACT,
  id: "surface-treatments",
  domainLabel: "Surface",
  resultKind: "surface-treatment",
  categories: [
    { id: "surface", label: "Surface", parentId: null, readiness: "ready" },
    { id: "textures", label: "Textures", parentId: "surface", readiness: "ready", projection: "focused-gallery" },
    { id: "wood", label: "Wood", parentId: "textures", readiness: "ready", projection: "inline-drawer" },
    { id: "oak", label: "Oak", parentId: "wood", readiness: "ready" },
    { id: "stone", label: "Stone", parentId: "textures", readiness: "hidden" },
  ],
  results: [
    { id: "warm-oak", label: "Warm Quarter-Sawn Oak", categoryId: "oak", readiness: "ready", searchText: "warm wood natural", stableResourceId: "material:warm-quarter-sawn-oak@1", previewAuthority: "material-surface" },
    { id: "stone-placeholder", label: "Stone placeholder", categoryId: "stone", readiness: "ready", searchText: "stone", stableResourceId: "material:stone-placeholder@0", previewAuthority: "material-surface" },
  ],
  previewAdapterId: "material-surface",
  application: "apply",
  supports: { brand: true, recent: true, saved: true, favorites: true, pagination: true },
  returnBehavior: "restore-context",
};

describe("Adaptive Workspace authority", () => {
  it("moves only for explicit task intent and leaves incidental selection stable", () => {
    const incidental = studioWorkspaceReducer(INITIAL_STUDIO_WORKSPACE_STATE, { type: "INCIDENTAL_SELECTION", selectedObjectId: "button-1" });
    assert.equal(incidental, INITIAL_STUDIO_WORKSPACE_STATE);
    const discover = studioWorkspaceReducer(INITIAL_STUDIO_WORKSPACE_STATE, { type: "BEGIN_EXPLICIT_TASK", taskId: "browse-buttons", context: EMPTY_STUDIO_CONTEXT });
    assert.equal(discover.contractId, STUDIO_ADAPTIVE_WORKSPACE_CONTRACT);
    assert.equal(discover.composition, "discover");
    assert.equal(discover.returnStack.length, 1);
    const restored = studioWorkspaceReducer(discover, { type: "COMPLETE_TRANSIENT_TASK" });
    assert.equal(restored.composition, "compose");
    assert.equal(restored.activeTaskId, "compose-card");
  });

  it("allocates one substantial secondary surface on small laptops and phone", () => {
    const discover = studioWorkspaceReducer(INITIAL_STUDIO_WORKSPACE_STATE, { type: "BEGIN_EXPLICIT_TASK", taskId: "browse-assets", context: EMPTY_STUDIO_CONTEXT });
    assert.equal(resolveStudioWorkspaceChoreography(discover, 1024).singleSecondarySurface, true);
    assert.equal(resolveStudioWorkspaceChoreography(discover, 1024).contextualSurface, "hidden");
    assert.equal(resolveStudioWorkspaceChoreography(discover, 1800).taskSurface, "broad");
    assert.equal(classifyStudioViewport(390), "phone");
  });

  it("preserves one return point across browser-to-editor handoffs and exits Apply or Cancel", () => {
    const editContext = { ...EMPTY_STUDIO_CONTEXT, taskId: "edit-contents" as const, selectedObjectId: "cabinet-1", selectedInternalItemId: "identity" };
    const editing = studioWorkspaceReducer(INITIAL_STUDIO_WORKSPACE_STATE, { type: "BEGIN_EXPLICIT_TASK", taskId: "edit-contents", context: EMPTY_STUDIO_CONTEXT });
    const browser = studioWorkspaceReducer(editing, { type: "BEGIN_NESTED_TASK", taskId: "browse-assets", context: editContext });
    const crop = studioWorkspaceReducer(browser, { type: "HANDOFF_TRANSIENT_TASK", taskId: "adjust-resource" });
    assert.equal(crop.returnStack.length, 2);
    assert.equal(crop.activeTaskId, "adjust-resource");
    for (const event of ["COMPLETE_TRANSIENT_TASK", "CANCEL_TRANSIENT_TASK"] as const) {
      const restored = studioWorkspaceReducer(crop, { type: event });
      assert.equal(restored.activeTaskId, "edit-contents");
      assert.equal(restored.composition, "deep-edit");
      assert.equal(restored.returnStack.length, 1);
    }
  });

  it("treats direct crop as a nested transaction even within Deep Edit", () => {
    const editing = studioWorkspaceReducer(INITIAL_STUDIO_WORKSPACE_STATE, { type: "BEGIN_EXPLICIT_TASK", taskId: "edit-contents", context: EMPTY_STUDIO_CONTEXT });
    const context = { ...EMPTY_STUDIO_CONTEXT, taskId: "edit-contents" as const, selectedObjectId: "cabinet-1" };
    const crop = studioWorkspaceReducer(editing, { type: "BEGIN_NESTED_TASK", taskId: "adjust-resource", context });
    assert.equal(crop.returnStack.length, 2);
    assert.equal(studioWorkspaceReducer(crop, { type: "COMPLETE_TRANSIENT_TASK" }).activeTaskId, "edit-contents");
  });

  it("makes Outline yield to Discover, Tune, and Deep Edit while Organize owns it", () => {
    for (const taskId of ["browse-assets", "browse-curated-plugs", "browse-surface", "tune-selection", "edit-contents"] as const) {
      const state = studioWorkspaceReducer(INITIAL_STUDIO_WORKSPACE_STATE, { type:"BEGIN_EXPLICIT_TASK", taskId, context:EMPTY_STUDIO_CONTEXT });
      assert.equal(resolveStudioWorkspaceChoreography(state, 1440).outlineVisible, false, `${taskId} must own the secondary surface`);
    }
    const organize = studioWorkspaceReducer(INITIAL_STUDIO_WORKSPACE_STATE, { type:"BEGIN_EXPLICIT_TASK", taskId:"arrange-card", context:EMPTY_STUDIO_CONTEXT });
    assert.equal(resolveStudioWorkspaceChoreography(organize, 1024).outlineVisible, true);
  });

  it("restores exact targets, then semantic parents, then Card Surface", () => {
    const exact = resolveStudioContextRestoreTarget({ ...EMPTY_STUDIO_CONTEXT, selectedObjectId: "action-1", semanticAncestors: ["cabinet-1", "container-1"] }, { existingObjectIds: new Set(["action-1", "cabinet-1", "container-1"]), parentByObjectId: {}, cardSurfaceId: "card" });
    assert.deepEqual(exact, { objectId: "action-1", reason: "exact" });
    const parent = resolveStudioContextRestoreTarget({ ...EMPTY_STUDIO_CONTEXT, selectedObjectId: "deleted-action", semanticAncestors: ["cabinet-1", "container-1"] }, { existingObjectIds: new Set(["container-1"]), parentByObjectId: {}, cardSurfaceId: "card" });
    assert.deepEqual(parent, { objectId: "container-1", reason: "semantic-parent" });
    const card = resolveStudioContextRestoreTarget({ ...EMPTY_STUDIO_CONTEXT, selectedObjectId: "deleted" }, { existingObjectIds: new Set(), parentByObjectId: {}, cardSurfaceId: "card" });
    assert.deepEqual(card, { objectId: "card", reason: "card-surface" });
  });
});

describe("Catalog Browser authority", () => {
  it("registers consumers once and rejects consumer-specific duplicate authorities", () => {
    const registry = registerStudioCatalogAdapters([surfaceAdapter]);
    assert.equal(registry.get("surface-treatments"), surfaceAdapter);
    assert.throws(() => registerStudioCatalogAdapters([surfaceAdapter, surfaceAdapter]), /Duplicate Studio Catalog adapter/);
  });

  it("supports arbitrary governed depth, descendant search, and path-aware results", () => {
    const hits = searchStudioCatalog(surfaceAdapter, "oak");
    assert.equal(hits.length, 1);
    assert.equal(hits[0].pathLabel, "Surface / Textures / Wood / Oak");
    assert.equal(hits[0].result.stableResourceId, "material:warm-quarter-sawn-oak@1");
    assert.deepEqual(visibleStudioCatalogChildren(surfaceAdapter, "textures").map((category) => category.id), ["wood"]);
  });

  it("suppresses hidden and placeholder categories even when a result record exists", () => {
    assert.equal(searchStudioCatalog(surfaceAdapter, "stone").length, 0);
  });
});

describe("Inspector and semantic UI foundations", () => {
  it("projects only relevant mental-operation groups", () => {
    assert.deepEqual(projectStudioInspectorGroups(["edit-content", "edit-surface", "position"]).map((group) => group.id), ["content", "surface", "position"]);
  });

  it("pairs every semantic color with a non-color cue", () => {
    assert.ok(Object.values(STUDIO_SEMANTIC_UI).every((entry) => entry.color && entry.nonColorCue));
    assert.notEqual(STUDIO_SEMANTIC_UI.governance.color, "#d4af37");
  });
});
