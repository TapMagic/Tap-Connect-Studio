import assert from "node:assert/strict";
import test from "node:test";
import {
  INITIAL_DEEP_LEFT_SESSION,
  closeDeepLeftEdit,
  currentDeepLeftRoute,
  deepLeftGoBack,
  deepLeftHeader,
  openDeepLeftEdit,
  pushDeepLeftRoute,
  setDeepLeftNestedPage,
} from "../deep-left-editor";
import { createSelectionRef } from "../selection-ref";

const sampleRef = createSelectionRef({
  documentId: "doc-1",
  pageId: "card-page",
  revision: 1,
  objectKind: "element",
  objectId: "text-1",
  parentId: "card-page",
  childPath: ["text-1"],
  selectionGeneration: 3,
  targetLevel: "text-content",
});

test("openDeepLeftEdit replaces library with exact section and root route", () => {
  const next = openDeepLeftEdit(INITIAL_DEEP_LEFT_SESSION, {
    section: "color",
    targetLabel: "Text",
    capabilityLabel: "Color",
    previousLibraryTool: "text",
    selectionGeneration: 3,
    selectionRef: sampleRef,
  });
  assert.equal(next.mode, "edit");
  assert.equal(next.section, "color");
  assert.equal(next.previousLibraryTool, "text");
  assert.equal(next.routeStack.length, 1);
  assert.equal(deepLeftHeader(next), "Text / Color");
  assert.equal(currentDeepLeftRoute(next)?.page, "home");
});

test("nested solid colors push a real route and Back pops one level", () => {
  const edit = openDeepLeftEdit(INITIAL_DEEP_LEFT_SESSION, {
    section: "color",
    targetLabel: "Text",
    capabilityLabel: "Color",
    previousLibraryTool: "templates",
    selectionGeneration: 1,
    selectionRef: sampleRef,
  });
  const nested = setDeepLeftNestedPage(edit, "solid-colors");
  assert.equal(nested.mode, "edit");
  assert.equal(nested.nestedPage, "solid-colors");
  assert.equal(nested.routeStack.length, 2);
  assert.equal(currentDeepLeftRoute(nested)?.title, "Default solid colors");
  const home = deepLeftGoBack(nested);
  assert.equal(home.mode, "edit");
  assert.equal(home.nestedPage, "home");
  assert.equal(home.routeStack.length, 1);
  const library = deepLeftGoBack(home);
  assert.equal(library.mode, "library");
  assert.equal(library.previousLibraryTool, "templates");
  assert.equal(library.routeStack.length, 0);
});

test("gradient and photo color pages are distinct routes", () => {
  const edit = openDeepLeftEdit(INITIAL_DEEP_LEFT_SESSION, {
    section: "color",
    targetLabel: "Text",
    capabilityLabel: "Color",
    previousLibraryTool: "text",
    selectionGeneration: 2,
    selectionRef: sampleRef,
  });
  const gradient = setDeepLeftNestedPage(edit, "gradient-colors");
  assert.equal(gradient.nestedPage, "gradient-colors");
  assert.match(deepLeftHeader(gradient), /Gradient/i);
  const back = deepLeftGoBack(gradient);
  const photo = setDeepLeftNestedPage(back, "photo-colors");
  assert.equal(photo.nestedPage, "photo-colors");
  assert.equal(currentDeepLeftRoute(photo)?.dataSource, "photo-colors");
});

test("pushDeepLeftRoute preserves SelectionRef on the stack", () => {
  const edit = openDeepLeftEdit(INITIAL_DEEP_LEFT_SESSION, {
    section: "material",
    targetLabel: "Button",
    capabilityLabel: "Material",
    previousLibraryTool: "buttons",
    selectionGeneration: 4,
    selectionRef: sampleRef,
  });
  const metallic = pushDeepLeftRoute(edit, { page: "metallic", title: "Metallic", dataSource: "material-metallic" });
  assert.equal(metallic.routeStack.length, 2);
  assert.equal(metallic.routeStack[1]?.target?.objectId, "text-1");
});

test("reopening the same section preserves nested route stack", () => {
  const edit = openDeepLeftEdit(INITIAL_DEEP_LEFT_SESSION, {
    section: "color",
    targetLabel: "Text",
    capabilityLabel: "Color",
    previousLibraryTool: "text",
    selectionGeneration: 1,
    selectionRef: sampleRef,
  });
  const nested = setDeepLeftNestedPage(edit, "solid-colors");
  const retarget = openDeepLeftEdit(nested, {
    section: "color",
    targetLabel: "Text",
    capabilityLabel: "Color",
    previousLibraryTool: "text",
    selectionGeneration: 1,
    selectionRef: sampleRef,
  });
  assert.equal(retarget.nestedPage, "solid-colors");
  assert.equal(retarget.routeStack.length, 2);
});

test("closeDeepLeftEdit restores library mode", () => {
  const edit = openDeepLeftEdit(INITIAL_DEEP_LEFT_SESSION, {
    section: "button-surface",
    targetLabel: "Button",
    capabilityLabel: "Surface",
    previousLibraryTool: "buttons",
    selectionGeneration: 2,
  });
  const closed = closeDeepLeftEdit(edit);
  assert.equal(closed.mode, "library");
  assert.equal(closed.section, null);
  assert.equal(closed.previousLibraryTool, "buttons");
  assert.equal(closed.routeStack.length, 0);
});
