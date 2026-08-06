import test from "node:test";
import assert from "node:assert/strict";
import { EDITOR_COMMAND_REGISTRY, dispatchEditorCommand, getEditorCommand } from "../editor-command-registry";
import { OBJECT_CAPABILITY_REGISTRY } from "../capabilities";

test("every visible capability toolbar command has an executable registration", () => {
  for (const definition of Object.values(OBJECT_CAPABILITY_REGISTRY)) {
    for (const id of definition.toolbarCommands) assert.ok(EDITOR_COMMAND_REGISTRY.has(id), `${definition.objectKind}: ${id}`);
  }
});

test("dispatcher preserves target support and exact drawer section", () => {
  let opened = "";
  const command = dispatchEditorCommand("map.setup", "map", (section) => { opened = section; });
  assert.equal(command.id, "map.setup");
  assert.equal(opened, "setup");
  assert.throws(() => dispatchEditorCommand("map.setup", "text", () => undefined), /does not support/);
  assert.throws(() => getEditorCommand("effects.generic"), /Unregistered/);
});

test("divider and icon commands open distinct drawer sections", () => {
  const opened: string[] = [];
  dispatchEditorCommand("divider.style", "divider", (section) => opened.push(section));
  dispatchEditorCommand("divider.thickness", "divider", (section) => opened.push(section));
  dispatchEditorCommand("divider.color", "divider", (section) => opened.push(section));
  dispatchEditorCommand("divider.appearance", "divider", (section) => opened.push(section));
  dispatchEditorCommand("fill.open", "icon", (section) => opened.push(section));
  dispatchEditorCommand("stroke.open", "icon", (section) => opened.push(section));
  dispatchEditorCommand("icon.appearance", "icon", (section) => opened.push(section));
  dispatchEditorCommand("map.action", "map", (section) => opened.push(section));
  assert.deepEqual(opened, [
    "divider-style",
    "divider-thickness",
    "divider-color",
    "divider-appearance",
    "icon-fill",
    "icon-stroke",
    "icon-appearance",
    "map-action",
  ]);
  assert.equal(new Set(opened).size, opened.length);
});
