import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import sharp from "sharp";

const masterRoot = path.join(
  process.cwd(),
  "public/visual-parts/signature/everencore/love-and-theft/v2/03-pick-masters",
);
const cleaned = [
  "LT-PICK-LOVE-THEFT_artist-identity.png",
  "LT-PICK-COWBOY-HAT_cowboy-hat.png",
  "LT-PICK-TICKET-CLASSIC_ticket-classic.png",
] as const;

test("certified black-background cleanup changes alpha only and preserves every RGB pixel", async () => {
  const blank = await sharp(path.join(masterRoot, "LT-PICK-BLANK_blank.png"))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (const filename of cleaned) {
    const sourcePath = path.join(masterRoot, filename);
    const derivedPath = path.join(
      masterRoot,
      "derived-transparent",
      filename.replace(/\.png$/, ".transparent.png"),
    );
    const sourceBytes = await readFile(sourcePath);
    const source = await sharp(sourceBytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const derived = await sharp(derivedPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.deepEqual(
      [derived.info.width, derived.info.height],
      [source.info.width, source.info.height],
      filename,
    );
    assert.equal(createHash("sha256").update(sourceBytes).digest("hex").length, 64);
    for (let offset = 0; offset < source.data.length; offset += 4) {
      assert.equal(derived.data[offset], source.data[offset], `${filename} red at ${offset}`);
      assert.equal(derived.data[offset + 1], source.data[offset + 1], `${filename} green at ${offset}`);
      assert.equal(derived.data[offset + 2], source.data[offset + 2], `${filename} blue at ${offset}`);
      assert.equal(derived.data[offset + 3], blank.data[offset + 3], `${filename} alpha at ${offset}`);
    }
  }
});
