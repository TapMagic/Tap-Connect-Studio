import assert from "node:assert/strict";
import test from "node:test";
import {
  INITIAL_DEEP_LEFT_SESSION,
  closeDeepLeftEdit,
  deepLeftGoBack,
  deepLeftHeader,
  openDeepLeftEdit,
} from "../deep-left-editor";

test("openDeepLeftEdit replaces library with exact section", () => {
  const next = openDeepLeftEdit(INITIAL_DEEP_LEFT_SESSION, {
    section: "color",
    targetLabel: "Text",
    capabilityLabel: "Color",
    previousLibraryTool: "text",
    selectionGeneration: 3,
  });
  assert.equal(next.mode, "edit");
  assert.equal(next.section, "color");
  assert.equal(next.previousLibraryTool, "text");
  assert.equal(deepLeftHeader(next), "Text / Color");
});

test("nested back returns to edit home then library", () => {
  const edit = openDeepLeftEdit(INITIAL_DEEP_LEFT_SESSION, {
    section: "color",
    targetLabel: "Text",
    capabilityLabel: "Color",
    previousLibraryTool: "templates",
    selectionGeneration: 1,
  });
  const nested = { ...edit, nestedPage: "solid-colors" as const };
  const home = deepLeftGoBack(nested);
  assert.equal(home.mode, "edit");
  assert.equal(home.nestedPage, "home");
  const library = deepLeftGoBack(home);
  assert.equal(library.mode, "library");
  assert.equal(library.previousLibraryTool, "templates");
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
});
