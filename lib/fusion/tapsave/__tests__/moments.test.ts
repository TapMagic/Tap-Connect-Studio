import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createMoment,
  defaultTapSavePreferences,
  parseTapSavePreferences,
  TAPSAVE_MOMENT_LABELS,
} from "../moments";

describe("TapSave moments + preferences", () => {
  it("creates moments with kinds", () => {
    const moment = createMoment({
      businessId: "b1",
      visitorRef: "tok",
      kind: "first_save",
    });
    assert.equal(moment.kind, "first_save");
    assert.ok(moment.id);
    assert.ok(TAPSAVE_MOMENT_LABELS.first_save);
  });

  it("merges preference defaults from metadata", () => {
    const prefs = parseTapSavePreferences({
      emailOptIn: false,
      frequency: "monthly",
    });
    assert.equal(prefs.emailOptIn, false);
    assert.equal(prefs.frequency, "monthly");
    assert.equal(prefs.smsOptIn, defaultTapSavePreferences().smsOptIn);
  });
});
