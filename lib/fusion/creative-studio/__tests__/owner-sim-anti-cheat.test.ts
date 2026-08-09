import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const OWNER_SIM_DIR = path.join(process.cwd(), "e2e/owner-sim");

const PROHIBITED = [
  /\.click\(\s*\{\s*force\s*:\s*true/,
  /\.locator\([^)]+\)\.evaluate\([^)]*(\.open\s*=|remove\(\)|style\.display)/,
  /page\.evaluate\([^)]*localStorage\.setItem\([^)]*tapconnect\.card/,
];

describe("owner-sim anti-cheat contract", () => {
  it("rejects prohibited Host-bypass shortcuts in owner-sim harness sources", () => {
    const files = readdirSync(OWNER_SIM_DIR).filter((name) => name.endsWith(".ts"));
    assert.ok(files.length > 0);
    const violations: string[] = [];
    for (const file of files) {
      const source = readFileSync(path.join(OWNER_SIM_DIR, file), "utf8");
      for (const pattern of PROHIBITED) {
        if (pattern.test(source)) {
          violations.push(`${file} matches ${pattern}`);
        }
      }
    }
    assert.deepEqual(violations, []);
  });
});
