import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { CARD_STUDIO_AUTHORING_PATH } from "@/lib/fusion/card/authoring-route";

const productionEditorRoute = readFileSync(
  "app/dashboard/card/edit/page.tsx",
  "utf8",
);

function sourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

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

  it("keeps the legacy editor out of every production route", () => {
    for (const path of sourceFiles("app")) {
      const source = readFileSync(path, "utf8");
      assert.doesNotMatch(
        source,
        /(?:<CardAuthoringWorkspace\b|card-authoring-workspace)/,
        `${path} must not mount or import the legacy Card authoring workspace`,
      );
    }
  });

  it("routes every operator-facing Open/Edit/Builder alias to the canonical cockpit", () => {
    const relationship = readFileSync(
      "lib/fusion/studio/card-relationship.ts",
      "utf8",
    );
    assert.equal(CARD_STUDIO_AUTHORING_PATH, "/dashboard/card/edit");
    assert.match(relationship, /const openHref = CARD_STUDIO_AUTHORING_PATH/);
    assert.match(relationship, /const editHref = CARD_STUDIO_AUTHORING_PATH/);

    const labeledEntrySources = [
      "app/dashboard/experiences/page.tsx",
      "app/admin/page.tsx",
      "components/admin/landing-demos-editor.tsx",
      "components/brand/brand-kit-form.tsx",
      "components/onboarding/card-first-onboarding-workspace.tsx",
      "app/api/card/draft/route.ts",
      "lib/fusion/studio/create-recipes.ts",
      "lib/fusion/studio/ia.ts",
      "lib/fusion/parity/v1-surfaces.ts",
    ];
    for (const path of labeledEntrySources) {
      const source = readFileSync(path, "utf8");
      assert.match(
        source,
        /CARD_STUDIO_AUTHORING_PATH/,
        `${path} must use the canonical authoring route authority`,
      );
    }
  });

  it("preserves the assembly route as an explicitly non-editor surface", () => {
    const assemblyRoute = readFileSync("app/dashboard/card/page.tsx", "utf8");
    assert.match(assemblyRoute, /CardAssemblyWorkspace/);
    assert.match(assemblyRoute, /Full editing lives at \/dashboard\/card\/edit/);
    assert.doesNotMatch(assemblyRoute, /CardAuthoringWorkspace/);
    assert.doesNotMatch(assemblyRoute, /CardStudioReconstitutionWorkspace/);
  });

  it("returns an Experience draft preview to the same canonical document", () => {
    const experiencePreview = readFileSync(
      "app/dashboard/experiences/[id]/preview/page.tsx",
      "utf8",
    );
    assert.match(
      experiencePreview,
      /\/dashboard\/card\/edit\?experience=\$\{encodeURIComponent\(document\.id\)\}/,
    );
  });
});
