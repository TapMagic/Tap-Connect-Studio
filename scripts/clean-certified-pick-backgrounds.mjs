import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.join(
  process.cwd(),
  "public/visual-parts/signature/everencore/love-and-theft/v2/03-pick-masters",
);
const outputRoot = path.join(root, "derived-transparent");
const proofRoot = path.join(
  process.cwd(),
  "public/visual-parts/signature/everencore/love-and-theft/v2/background-cleanup-proof",
);
const blankPath = path.join(root, "LT-PICK-BLANK_blank.png");

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function rawRgba(filePath) {
  return sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

function hasOpaqueBlackExterior(data, width, height) {
  let opaqueBlackBorder = 0;
  let borderPixels = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x !== 0 && y !== 0 && x !== width - 1 && y !== height - 1) continue;
      const index = (y * width + x) * 4;
      borderPixels += 1;
      if (
        data[index + 3] === 255 &&
        data[index] <= 8 &&
        data[index + 1] <= 8 &&
        data[index + 2] <= 8
      ) opaqueBlackBorder += 1;
    }
  }
  return opaqueBlackBorder / borderPixels > 0.98;
}

async function proofSheet(bytes) {
  const tile = 420;
  const image = await sharp(bytes)
    .resize({ width: tile, height: tile, fit: "contain" })
    .png()
    .toBuffer();
  const checkerSvg = Buffer.from(`<svg width="${tile}" height="${tile}" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="c" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="28" height="28" fill="#e5e7eb"/><rect width="14" height="14" fill="#aeb5bf"/><rect x="14" y="14" width="14" height="14" fill="#aeb5bf"/></pattern></defs><rect width="100%" height="100%" fill="url(#c)"/></svg>`);
  const canvases = await Promise.all([
    sharp(checkerSvg).composite([{ input: image }]).png().toBuffer(),
    sharp({ create: { width: tile, height: tile, channels: 4, background: "#f8fafc" } }).composite([{ input: image }]).png().toBuffer(),
    sharp({ create: { width: tile, height: tile, channels: 4, background: "#111827" } }).composite([{ input: image }]).png().toBuffer(),
  ]);
  return sharp({ create: { width: tile * 3, height: tile, channels: 4, background: "transparent" } })
    .composite(canvases.map((input, index) => ({ input, left: index * tile, top: 0 })))
    .png()
    .toBuffer();
}

await mkdir(outputRoot, { recursive: true });
await mkdir(proofRoot, { recursive: true });
const blank = await rawRgba(blankPath);
const report = [];

for (const filename of (await readdir(root)).filter((name) => name.endsWith(".png")).sort()) {
  const sourcePath = path.join(root, filename);
  const sourceBytes = await readFile(sourcePath);
  const source = await rawRgba(sourcePath);
  const affected = hasOpaqueBlackExterior(source.data, source.info.width, source.info.height);
  const item = {
    sourceFilename: filename,
    blackExteriorBackground: affected,
    originalSha256: sha256(sourceBytes),
    dimensionsBefore: { width: source.info.width, height: source.info.height },
  };
  if (!affected) {
    report.push({ ...item, action: "unchanged-already-transparent" });
    continue;
  }
  if (source.info.width !== blank.info.width || source.info.height !== blank.info.height) {
    throw new Error(`${filename} does not match the certified blank-pick canvas`);
  }
  const output = Buffer.from(source.data);
  let changedRgbPixels = 0;
  let changedAlphaPixels = 0;
  for (let pixel = 0; pixel < source.info.width * source.info.height; pixel += 1) {
    const offset = pixel * 4;
    const nextAlpha = blank.data[offset + 3];
    if (output[offset + 3] !== nextAlpha) changedAlphaPixels += 1;
    output[offset + 3] = nextAlpha;
    if (
      output[offset] !== source.data[offset] ||
      output[offset + 1] !== source.data[offset + 1] ||
      output[offset + 2] !== source.data[offset + 2]
    ) changedRgbPixels += 1;
  }
  const derivedFilename = filename.replace(/\.png$/, ".transparent.png");
  const derivedPath = path.join(outputRoot, derivedFilename);
  const derivedBytes = await sharp(output, {
    raw: { width: source.info.width, height: source.info.height, channels: 4 },
  }).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
  await writeFile(derivedPath, derivedBytes);
  await writeFile(
    path.join(proofRoot, derivedFilename.replace(/\.png$/, ".proof.png")),
    await proofSheet(derivedBytes),
  );
  const verified = await rawRgba(derivedPath);
  let verifiedRgbChanges = 0;
  for (let pixel = 0; pixel < source.info.width * source.info.height; pixel += 1) {
    const offset = pixel * 4;
    if (
      verified.data[offset] !== source.data[offset] ||
      verified.data[offset + 1] !== source.data[offset + 1] ||
      verified.data[offset + 2] !== source.data[offset + 2]
    ) verifiedRgbChanges += 1;
  }
  report.push({
    ...item,
    action: "transparent-cleaned-derivative-created",
    derivedFilename,
    derivedPath: `/visual-parts/signature/everencore/love-and-theft/v2/03-pick-masters/derived-transparent/${derivedFilename}`,
    derivedSha256: sha256(derivedBytes),
    dimensionsAfter: { width: verified.info.width, height: verified.info.height },
    changedAlphaPixels,
    changedRgbPixels: Math.max(changedRgbPixels, verifiedRgbChanges),
    alphaAuthority: "LT-PICK-BLANK_blank.png certified outer silhouette",
  });
}

await writeFile(
  path.join(proofRoot, "background-cleanup-audit.json"),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), report }, null, 2)}\n`,
);
