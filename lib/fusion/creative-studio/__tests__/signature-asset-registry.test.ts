import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { SIGNATURE_LAYOUT_RECIPES } from "../signature-assets/layout-recipes";
import { ARC_EMBER_SIGNATURE_FAMILY_ID, getSignatureAsset, listSignatureAssets, signatureAssetInsert, SIGNATURE_ASSETS } from "../signature-assets/registry";

const root = process.cwd();
function diskPath(publicPath: string) { return path.join(root,"public",publicPath.replace(/^\//,"")); }
function sha(file: string) { return createHash("sha256").update(readFileSync(file)).digest("hex"); }

test("Arc Ember production inventory has stable family-neutral ids and byte-identical sources",()=>{
  const production = listSignatureAssets({familyId:ARC_EMBER_SIGNATURE_FAMILY_ID});
  assert.equal(production.length,18);
  assert.equal(new Set(production.map((item)=>item.id)).size,18);
  for (const item of production) {
    assert.match(item.id,/^master\/arc-ember\/(action|identity|divider|frame|stage|footer)\//);
    assert.equal(item.referenceOnly,false);
    assert.equal(item.aspectRatio,item.width/item.height);
    assert.equal(existsSync(diskPath(item.sourceAsset)),true,item.sourceAsset);
    assert.equal(sha(diskPath(item.sourceAsset)),item.sourceSha256,item.id);
  }
});

test("paired rods clarification is approved, classified, and preserved under its original filename",()=>{
  const paired = getSignatureAsset("master/arc-ember/divider/paired-rods/v1")!;
  assert.equal(paired.lifecycle,"production");
  assert.equal(paired.role,"paired-rods");
  assert.match(paired.sourceAsset,/a6ebc5dd-c542-44ae-a78b-0d183f0c6794\.png$/);
  assert.equal(paired.sourceSha256,"65c2f7be29ac2f5e504458fbc13c0dbd8c68b47c41e8bf66c891258558cc132d");
  const local = JSON.parse(readFileSync(path.join(root,"public/visual-parts/signature/arc-ember/reference/local-manifest-additions.json"),"utf8"));
  assert.equal(local.records[0].stableId,paired.id);
});

test("Signature sockets reuse canonical element kinds and keep actions independent",()=>{
  const stack = getSignatureAsset("master/arc-ember/action/stack-row/v1")!;
  const insert = signatureAssetInsert(stack);
  assert.equal(insert.kind,"button");
  assert.equal(insert.initialProps.signatureAssetId,stack.id);
  assert.equal(insert.initialProps.componentKind,undefined);
  assert.equal(stack.socketContract.action,true);
  assert.deepEqual(SIGNATURE_LAYOUT_RECIPES.map((recipe)=>recipe.id),["SINGLE","STACK-2","STACK-3","GRID-2","GROUPED-COMPACT"]);
  assert.equal(SIGNATURE_ASSETS.some((item)=>item.id.includes("double-stack")),false);
});

test("only frames and stages declare child containment",()=>{
  const containers=SIGNATURE_ASSETS.filter((item)=>item.nestingCapabilities.canContainChildren);
  assert.deepEqual(containers.map((item)=>item.assetKind).sort(),["frame","stage"]);
  assert.ok(SIGNATURE_ASSETS.filter((item)=>["action","divider","footer"].includes(item.assetKind)).every((item)=>!item.nestingCapabilities.canContainChildren));
});

test("identity inserts retain the canonical image src required by Preview/Public filtering",()=>{
  const identity=getSignatureAsset("master/arc-ember/identity/open-lens/v1")!;
  const insert=signatureAssetInsert(identity);
  assert.equal(insert.kind,"image");
  assert.equal(insert.initialProps.src,"/tap-connect-mark.png");
  assert.equal(insert.initialProps.imageUrl,"/tap-connect-mark.png");
});

test("customer drawer is locked to Buttons and Signature family subgroups",()=>{
  const source=readFileSync(path.join(root,"components/fusion/creative-studio/visual-parts-cabinet-panel.tsx"),"utf8");
  assert.match(source,/\? "Buttons" : "Signature"/);
  for (const label of ["Actions","Identity","Dividers","Frames & Stages","Footer"]) assert.ok(source.includes(`label:\"${label}\"`) || readFileSync(path.join(root,"lib/fusion/creative-studio/signature-assets/registry.ts"),"utf8").includes(`label:\"${label}\"`));
});

test("legacy pristine master remains unchanged",()=>{
  assert.equal(sha(path.join(root,"public/visual-parts/arc-ember/pristine-master-button.png")),"b9e0d71d02bcb77460d29fbdbad9390bf493a96bd67d8c2350096ef52669df48");
});
