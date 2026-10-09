import assert from "node:assert/strict";
import test from "node:test";
import {
  STUDIO_ADD_CATEGORIES,
  STUDIO_ORDINARY_MODULES,
  validateStudioAddRegistry,
  visibleStudioAddCategories,
} from "@/lib/fusion/creative-studio/platform/add-discover";

test("Map / Location Container is a first-class ready Add resource", () => {
  assert.deepEqual(validateStudioAddRegistry({}), []);
  const category = visibleStudioAddCategories().find((candidate) => candidate.id === "map");
  assert.equal(category?.label, "Map");
  const resource = STUDIO_ORDINARY_MODULES.find((candidate) => candidate.id === "map:location-container");
  assert.equal(resource?.moduleKind, "map");
  assert.equal(resource?.defaultCanonicalState.elementKind, "map");
  assert.equal(resource?.defaultCanonicalState.componentKind, "map");
  assert.equal(resource?.defaultCanonicalState.mapOpenAction, "directions");
  assert.deepEqual(resource?.allowedParents, ["card-surface", "container"]);
  assert.equal(STUDIO_ADD_CATEGORIES.some((candidate) => candidate.id === "map" && candidate.readiness === "ready"), true);
});
