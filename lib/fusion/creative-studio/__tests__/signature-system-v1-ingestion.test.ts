import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { PNG } from "pngjs";
import {
  SIGNATURE_ASSETS,
  SIGNATURE_FAMILIES,
  SIGNATURE_SUBGROUPS,
  SIGNATURE_SYSTEM_V1_FAMILY_ID,
  getSignatureAsset,
  listSignatureAssets,
  signatureAssetInsert,
  signatureAssetInsertionFrame,
} from "../signature-assets/registry";
import { SIGNATURE_LAYOUT_RECIPES } from "../signature-assets/layout-recipes";

const root = process.cwd();
const publicRoot = path.join(root, "public");
const manifestPath = path.join(publicRoot, "visual-parts/signature/signature-system-v1/reference/manifest.json");

function diskPath(publicPath: string) {
  return path.join(publicRoot, publicPath.replace(/^\//, ""));
}

function sha256(file: string) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

test("Signature System v1 registers the permanent family and five cabinet subgroups", () => {
  const family = SIGNATURE_FAMILIES.find((item) => item.id === SIGNATURE_SYSTEM_V1_FAMILY_ID);
  assert.equal(family?.label, "Signature System v1");
  assert.equal(family?.lifecycle, "production");
  assert.deepEqual(SIGNATURE_SUBGROUPS.map((item) => item.id), ["actions", "identity", "frames-stages", "dividers", "micro-parts"]);
});

test("all 27 immutable sources match manifest provenance byte-for-byte", () => {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    assetCount: number;
    assets: Array<{ packagedPath: string; sha256: string; width: number; height: number }>;
  };
  const all = listSignatureAssets({ familyId: SIGNATURE_SYSTEM_V1_FAMILY_ID, includeReference: true });
  assert.equal(manifest.assetCount, 27);
  assert.equal(all.length, 27);
  assert.equal(new Set(all.map((item) => item.id)).size, 27);
  for (const source of manifest.assets) {
    const publicPath = `/visual-parts/signature/signature-system-v1/source/${source.packagedPath}`;
    const file = diskPath(publicPath);
    assert.equal(existsSync(file), true, publicPath);
    assert.equal(sha256(file), source.sha256, publicPath);
    const png = PNG.sync.read(readFileSync(file));
    assert.equal(png.width, source.width, publicPath);
    assert.equal(png.height, source.height, publicPath);
    assert.ok(png.data.some((value, index) => index % 4 === 3 && value < 255), `${publicPath} retains alpha`);
    const record = all.find((item) => item.sourceSha256 === source.sha256);
    assert.equal(record?.sourceAsset, publicPath);
    assert.equal(record?.provenanceManifest, "/visual-parts/signature/signature-system-v1/reference/manifest.json");
  }
});

test("only the 22 manifest-approved production assets are selectable", () => {
  const selectable = listSignatureAssets({ familyId: SIGNATURE_SYSTEM_V1_FAMILY_ID });
  const all = listSignatureAssets({ familyId: SIGNATURE_SYSTEM_V1_FAMILY_ID, includeReference: true });
  const blocked = all.filter((item) => item.referenceOnly);
  assert.equal(selectable.length, 22);
  assert.deepEqual(Object.fromEntries(SIGNATURE_SUBGROUPS.map((group) => [group.id, selectable.filter((item) => item.subgroup === group.id).length])), {
    actions: 3,
    identity: 3,
    "frames-stages": 6,
    dividers: 6,
    "micro-parts": 4,
  });
  assert.equal(blocked.length, 5);
  assert.equal(blocked.filter((item) => item.sourceReadiness === "visual-authority-needs-blank-shell").length, 4);
  assert.equal(blocked.filter((item) => item.sourceReadiness === "visual-authority-needs-state-implementation").length, 1);
  assert.ok(blocked.every((item) => item.lifecycle === "reference" && item.blockerNote));
  assert.ok(selectable.every((item) => item.referenceOnly === false && item.lifecycle === "production"));
});

test("safe capability declarations fail closed for tint and energy", () => {
  const production = listSignatureAssets({ familyId: SIGNATURE_SYSTEM_V1_FAMILY_ID });
  assert.ok(production.every((item) => item.tintMode === "none"));
  assert.ok(production.every((item) => item.energyMode === "fixed"));
  for (const id of ["master/signature-system-v1/stage/electric-rift/v1", "master/signature-system-v1/divider/electric-energy/v1"]) {
    const item = getSignatureAsset(id)!;
    assert.equal(item.sourceReadiness, "production-ready-with-derived-control-needed");
    assert.ok(item.tags.includes("energy-control-pending"));
  }
});

test("live sockets use canonical Studio objects and independent layout recipes", () => {
  const circle = getSignatureAsset("master/signature-system-v1/action/circle-icon/v1")!;
  const portrait = getSignatureAsset("master/signature-system-v1/action/portrait-team/v1")!;
  const status = getSignatureAsset("master/signature-system-v1/micro-part/status-chip/v1")!;
  const star = getSignatureAsset("master/signature-system-v1/micro-part/rating-star/v1")!;
  const icon = getSignatureAsset("master/signature-system-v1/micro-part/icon-row-token/v1")!;
  assert.equal(signatureAssetInsert(circle).kind, "button");
  assert.equal(signatureAssetInsert(portrait).initialProps.actionType, "website");
  assert.equal(signatureAssetInsert(status).kind, "button");
  assert.equal(signatureAssetInsert(status).initialProps.statusText, "Available");
  assert.equal(signatureAssetInsert(star).kind, "image");
  assert.equal(signatureAssetInsert(icon).initialProps.imageUrl, "/tap-connect-mark.png");
  assert.ok(circle.socketContract.identity && circle.socketContract.action);
  assert.ok(portrait.socketContract.identity && portrait.socketContract.title && portrait.socketContract.action);
  assert.ok(SIGNATURE_LAYOUT_RECIPES.some((recipe) => recipe.id === "ICON-ROW" && recipe.maxItems === 6));
  assert.equal(SIGNATURE_ASSETS.some((item) => item.id.includes("five-stars") || item.id.includes("icon-row-set")), false);
});

test("stages accept live children without exposing unsupported source transforms", () => {
  const stages = listSignatureAssets({ familyId: SIGNATURE_SYSTEM_V1_FAMILY_ID, subgroup: "frames-stages" });
  assert.equal(stages.length, 6);
  for (const stage of stages) {
    assert.equal(stage.assetKind, "stage");
    assert.equal(stage.nestingCapabilities.canContainChildren, true);
    assert.deepEqual(stage.nestingCapabilities.acceptedChildKinds, ["action", "identity", "divider", "micro-part"]);
    assert.equal(stage.responsiveContract.proportional, true);
    assert.equal(stage.expansionContract, undefined);
    const insert = signatureAssetInsert(stage);
    assert.equal(insert.kind, "composition");
    assert.equal(insert.initialProps.resizePolicy, "fixed");
  }
});

test("drawer insertion preserves source aspect at realistic Card-root scale", () => {
  for (const asset of listSignatureAssets({ familyId: SIGNATURE_SYSTEM_V1_FAMILY_ID })) {
    const frame = signatureAssetInsertionFrame(asset, 2400);
    assert.ok(frame.width > 0 && frame.width <= .88, asset.id);
    assert.equal(Number((frame.width * 390 / frame.height / 2400).toFixed(4)), Number(asset.aspectRatio.toFixed(4)), asset.id);
  }
});

test("shared bridge exposes family, role, socket, and safe capability hooks", () => {
  const bridge = readFileSync(path.join(root, "lib/fusion/creative-studio/signature-assets/SignatureMasterBridge.tsx"), "utf8");
  const css = readFileSync(path.join(root, "lib/fusion/creative-studio/signature-assets/signature-master.css"), "utf8");
  assert.match(bridge, /data-signature-family/);
  assert.match(bridge, /asset\.socketContract\.statusText/);
  assert.match(bridge, /asset\.socketContract\.icon/);
  assert.match(css, /family_signature_system_v1/);
  assert.doesNotMatch(css, /hue-rotate/);
});
