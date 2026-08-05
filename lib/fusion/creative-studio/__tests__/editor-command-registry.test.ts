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
