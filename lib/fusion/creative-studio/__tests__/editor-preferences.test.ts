import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_EDITOR_PREFERENCES,
  EDITOR_PREFERENCES_STORAGE_KEY,
  readEditorPreferences,
  writeEditorPreferences,
} from "../editor-preferences";

test("editor preferences persist independently from document content", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
  const next = { ...DEFAULT_EDITOR_PREFERENCES, appearance: "light" as const, pasteboard: "checkerboard" as const, density: "compact" as const };
  writeEditorPreferences(storage, next);
  assert.deepEqual(readEditorPreferences(storage), next);
  assert.equal(JSON.parse(values.get(EDITOR_PREFERENCES_STORAGE_KEY)!).surfaceColor, undefined);
});

test("invalid stored choices fall back safely", () => {
  const storage = { getItem: () => JSON.stringify({ appearance: "neon", density: "tiny", pasteboard: "space" }), setItem: () => undefined };
  assert.deepEqual(readEditorPreferences(storage), DEFAULT_EDITOR_PREFERENCES);
});

