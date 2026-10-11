import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const productionEditorRoute = readFileSync(
  "app/dashboard/card/edit/page.tsx",
  "utf8",
);

describe("production Experience editor authority", () => {
  it("mounts the accepted Studio cockpit without a legacy-shell feature fork", () => {
    assert.match(
      productionEditorRoute,
      /return \(\s*<CardStudioReconstitutionWorkspace/,
    );
    assert.doesNotMatch(productionEditorRoute, /CardAuthoringWorkspace/);
    assert.doesNotMatch(
      productionEditorRoute,
      /card\.studio\.reconstitution_v1/,
    );
  });
});
