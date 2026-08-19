import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  CABINET_NOIR_ASSEMBLY_RECIPES,
  CABINET_NOIR_ASSETS,
  CABINET_NOIR_AUDIT_RECORDS,
  CABINET_NOIR_ENTITLEMENT_KEY,
  CABINET_NOIR_FAMILY,
  CABINET_NOIR_FAMILY_ID,
  CABINET_NOIR_GEOMETRY,
} from "../signature-assets/cabinet-noir";
import { validateSignatureAssemblyRecipe } from "../signature-assets/layout-recipes";
import { SIGNATURE_ASSETS, SIGNATURE_FAMILIES, listSignatureAssets } from "../signature-assets/registry";
import { isSignatureComponentRuntimeEligible } from "../signature-assets/types";

const workspace = process.cwd();
const publicRoot = path.join(workspace, "public/visual-parts/signature/cabinet-noir");
const handoffRoot = path.join(workspace, "tmp/Cabinet Noir v1/Cabinet_Noir_Cody_Handoff");
const sha256 = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");

test("Cabinet Noir resolves as one production family through the canonical Signature registry", () => {
  assert.equal(SIGNATURE_FAMILIES.filter((family)=>family.id===CABINET_NOIR_FAMILY_ID).length, 1);
  assert.equal(CABINET_NOIR_FAMILY.version, "1.0.0");
  assert.equal(CABINET_NOIR_FAMILY.launchMode, "exact-asset");
  assert.equal(CABINET_NOIR_FAMILY.entitlement?.entitlementKey, CABINET_NOIR_ENTITLEMENT_KEY);
  assert.equal(SIGNATURE_ASSETS.filter((asset)=>asset.familyId===CABINET_NOIR_FAMILY_ID).length, 48);
});

test("all 44 canonical production assets are certified runtime authorities", () => {
  const production = CABINET_NOIR_ASSETS.filter((asset)=>!asset.referenceOnly);
  assert.equal(production.length, 44);
  for (const asset of production) {
    assert.ok(asset.normalizedContract, asset.id);
    assert.equal(isSignatureComponentRuntimeEligible(asset.normalizedContract!), true, asset.id);
    assert.equal(asset.normalizedContract?.provenance?.sourceMode, "exact-asset");
    assert.equal(asset.normalizedContract?.provenance?.immutable, true);
  }
  assert.equal(listSignatureAssets({familyId:CABINET_NOIR_FAMILY_ID}).length, 44);
});

test("immutable public assets match the refreshed manifest and handoff bytes", () => {
  for (const asset of CABINET_NOIR_ASSETS) {
    const publicFile = path.join(workspace, "public", asset.sourceAsset);
    const sourcePath = asset.normalizedContract?.provenance?.sourceAssetPath;
    assert.ok(sourcePath, asset.id);
    const handoffFile = path.join(handoffRoot, sourcePath!);
    assert.equal(sha256(publicFile), asset.sourceSha256, `${asset.id} public checksum`);
    assert.equal(sha256(handoffFile), asset.sourceSha256, `${asset.id} handoff checksum`);
    assert.deepEqual(readFileSync(publicFile), readFileSync(handoffFile), `${asset.id} bytes`);
  }
  assert.equal(sha256(path.join(publicRoot,"source/02-structural-system/CN-043_twin-rail-repeatable-center-spine-segment.png")),"45272b4d5b3e2676eeb4fc28a692771a6dc083527b7f2beb1c29d541d90bbdea");
});

test("reference presets and Folder 99 audit records cannot become runtime authorities", () => {
  const references = CABINET_NOIR_ASSETS.filter((asset)=>asset.referenceOnly);
  assert.deepEqual(references.map((asset)=>asset.normalizedContract?.componentId),["CN-006","CN-007","CN-008","CN-009"]);
  for (const asset of references) assert.equal(isSignatureComponentRuntimeEligible(asset.normalizedContract!),false);
  for (const record of CABINET_NOIR_AUDIT_RECORDS) {
    assert.equal(record.authority,"audit-only");
    assert.equal(record.runtimeEligibility,"runtime-ineligible");
    assert.equal(isSignatureComponentRuntimeEligible(record),false);
  }
  assert.equal(CABINET_NOIR_AUDIT_RECORDS.some((record)=>record.sourceSha256==="598d98007b9a85ae3266a24e0b1066353f7ea7f52c8c8f5727dfa54df197046b"),false);
});

test("approved sockets, live text, repeat geometry, and phone metadata are registry data", () => {
  const byComponent = new Map(CABINET_NOIR_ASSETS.map((asset)=>[asset.normalizedContract?.componentId,asset.normalizedContract]));
  for (const id of ["CN-002","CN-003","CN-004","CN-005"]) {
    assert.equal(byComponent.get(id)?.sockets[0]?.contractId,"semanticPlugSocket@1.0.0");
    assert.ok(byComponent.get(id)?.liveContentGeometry?.safeArea.width);
  }
  assert.equal(byComponent.get("CN-012")?.sockets[0]?.contractId,"semanticPlugSocket@1.0.0");
  for (const id of ["CN-037","CN-037-ALT-A1","CN-037-ALT-A2","CN-037-ALT-A3"]) {
    assert.equal(byComponent.get(id)?.sockets[0]?.contractId,"identityHeaderSocket@1.0.0");
  }
  assert.equal(byComponent.get("CN-011")?.liveContentContract,"informationalLine@1.0.0");
  assert.equal(byComponent.get("CN-039")?.repeatability?.preferredOverlapPx,0);
  assert.equal(byComponent.get("CN-042")?.repeatability?.nativeStridePx,362);
  assert.equal(byComponent.get("CN-043")?.sourceGeometry?.runtimeScale,362/1536);
  assert.equal(byComponent.get("CN-038")?.attachmentAnchors.length,3);
  assert.equal(byComponent.get("CN-044")?.attachmentAnchors.length,4);
  assert.equal(byComponent.get("CN-045")?.attachmentAnchors.length,3);
  assert.deepEqual(CABINET_NOIR_GEOMETRY.twinRailClearance.transparentCenterCorridorPx,[181,1989]);
  assert.equal(CABINET_NOIR_GEOMETRY.stockPlugFit.componentIds.length,24);
  assert.equal(CABINET_NOIR_GEOMETRY.phone390.certified,true);
});

test("Single-Stack and Twin-Rail recipe instances validate without one-off runtime behavior", () => {
  assert.equal(CABINET_NOIR_ASSEMBLY_RECIPES.length,2);
  for (const recipe of CABINET_NOIR_ASSEMBLY_RECIPES) assert.deepEqual(validateSignatureAssemblyRecipe(recipe),[],recipe.recipeId);
  assert.equal(CABINET_NOIR_ASSEMBLY_RECIPES[0].repeatInterval?.nativeStridePx,724);
  assert.equal(CABINET_NOIR_ASSEMBLY_RECIPES[1].repeatInterval?.nativeStridePx,362);
  assert.equal(CABINET_NOIR_ASSEMBLY_RECIPES[1].oddActionTreatment.mode,"full-width-after-complete-pairs");
});

test("entitlement states remain independent and do not name marketing plans", () => {
  assert.deepEqual(CABINET_NOIR_FAMILY.entitlement?.entitled,{visible:true,selectable:true,publishable:true});
  assert.deepEqual(CABINET_NOIR_FAMILY.entitlement?.nonEntitled,{visible:true,selectable:false,publishable:false});
  assert.doesNotMatch(JSON.stringify(CABINET_NOIR_FAMILY.entitlement),/free|pro|business|enterprise/i);
});
