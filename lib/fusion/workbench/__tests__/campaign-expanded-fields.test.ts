import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Contract: Campaign/Workbench substantial copy uses ExpandedTextField.
 * Short labels (price, code, button labels, address) may remain Input.
 */
describe("campaign expanded text wiring", () => {
  const source = readFileSync(
    join(process.cwd(), "components/workbench/campaign-editor.tsx"),
    "utf8"
  );

  it("imports ExpandedTextField", () => {
    assert.match(source, /from "@\/components\/design\/expanded-text-field"/);
  });

  it("marks substantial campaign fields with expand: true", () => {
    for (const key of [
      "headline",
      "subheadline",
      "body",
      "description",
      "successMessage",
      "title",
      "text",
    ]) {
      assert.match(
        source,
        new RegExp(`key:\\s*"${key}"[\\s\\S]{0,80}expand:\\s*true`),
        `expected expand:true near key "${key}"`
      );
    }
  });

  it("keeps short identifiers as non-expand fields", () => {
    for (const key of ["price", "code", "buttonLabel", "ctaLabel", "address", "name"]) {
      assert.match(source, new RegExp(`key:\\s*"${key}"`));
      // price/code/etc. should not have expand:true on the same field entry line
      const fieldRe = new RegExp(
        `\\{\\s*key:\\s*"${key}"[^}]*\\}`,
        "g"
      );
      const matches = source.match(fieldRe) ?? [];
      assert.ok(matches.length >= 1, `missing field ${key}`);
      for (const m of matches) {
        assert.ok(!/expand:\s*true/.test(m), `${key} should remain single-line`);
      }
    }
  });
});
