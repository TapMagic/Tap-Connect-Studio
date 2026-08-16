import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { PNG } from "pngjs";
import { createCompositionNode } from "../composition";
import { layoutArcEmberStages, measureArcEmberStages, requiredArcEmberSurfaceHeightPx } from "../signature-assets/arc-ember-stage-layout";
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

test("paired rods replacement is approved, explicitly classified, and keeps its stable ID",()=>{
  const paired = getSignatureAsset("master/arc-ember/divider/paired-rods/v1")!;
  assert.equal(paired.lifecycle,"production");
  assert.equal(paired.role,"paired-rods");
  assert.match(paired.sourceAsset,/05-double-electic-rod\.png$/);
  assert.equal(paired.sourceSha256,"f1467a49addf1453fee647b3b48b2da199d65e97d00689ebd6780dd9fb0b7c73");
  const local = JSON.parse(readFileSync(path.join(root,"public/visual-parts/signature/arc-ember/reference/local-manifest-additions.json"),"utf8"));
  assert.equal(local.records.find((record:{stableId:string})=>record.stableId===paired.id).classification,"Paired Rod Divider");
});

test("all five divider replacements have real transparent exterior pixels and no duplicate registration",()=>{
  const dividers=listSignatureAssets({familyId:ARC_EMBER_SIGNATURE_FAMILY_ID,subgroup:"dividers"});
  assert.equal(dividers.length,5);
  assert.equal(new Set(dividers.map((item)=>item.id)).size,5);
  for (const divider of dividers) {
    const png=PNG.sync.read(readFileSync(diskPath(divider.sourceAsset)));
    let transparent=0;
    for(let offset=3;offset<png.data.length;offset+=4) if(png.data[offset]===0) transparent+=1;
    assert.ok(transparent>png.width*png.height*.6,`${divider.id} must float without an opaque backing canvas`);
  }
});

test("expandable Stage keeps protected caps and content-driven vertical child flow",()=>{
  const stageAsset=getSignatureAsset("master/arc-ember/stage/surface/v1")!;
  assert.equal(stageAsset.nestingCapabilities.canContainChildren,true);
  assert.equal(stageAsset.expansionContract?.mode,"protected-cap-inset");
  assert.deepEqual(stageAsset.nestingCapabilities.acceptedChildKinds,["action","identity","divider","footer"]);
  const stage=createCompositionNode("shape",{id:"stage",x:.04,y:.03,width:.92,height:.3,props:{...signatureAssetInsert(stageAsset).initialProps}});
  const actions=Array.from({length:5},(_,index)=>createCompositionNode("button",{id:`action-${index}`,props:{...signatureAssetInsert(getSignatureAsset("master/arc-ember/action/utility/v1")!).initialProps,containerId:"stage",actionType:"website",href:`https://example.com/${index}`}}));
  const expanded=[stage,...actions];
  const expandedMeasurement=measureArcEmberStages(expanded,390,680)[0]!;
  const contractedMeasurement=measureArcEmberStages([stage,...actions.slice(0,3)],390,680)[0]!;
  assert.ok(expandedMeasurement.heightPx>contractedMeasurement.heightPx);
  assert.equal(expandedMeasurement.childIds.length,5);
  assert.deepEqual(expandedMeasurement.childIds,actions.map((action)=>action.id));
  assert.equal(measureArcEmberStages(expanded,390,680)[0]!.heightPx,expandedMeasurement.heightPx,"reinserted children deterministically restore height");
  const required=requiredArcEmberSurfaceHeightPx(expanded,390,680);
  const laidOut=layoutArcEmberStages(expanded,390,required,680);
  const laidStage=laidOut.find((node)=>node.id==="stage")!;
  const laidChildren=actions.map((action)=>laidOut.find((node)=>node.id===action.id)!);
  assert.ok(laidStage.x>=0 && laidStage.x+laidStage.width<=1);
  assert.ok(laidChildren.every((child)=>child.x>=laidStage.x && child.x+child.width<=laidStage.x+laidStage.width+.0001));
  assert.ok(laidChildren.every((child,index)=>index===0 || child.y>laidChildren[index-1]!.y));
  assert.deepEqual(laidChildren.map((child)=>child.props.href),actions.map((action)=>action.props.href),"nested Action bindings remain independent through reflow/save serialization");
  assert.deepEqual(JSON.parse(JSON.stringify(expanded)).map((node:{id:string})=>node.id),["stage",...actions.map((action)=>action.id)],"save/reload preserves Stage and child order");
});

test("Stage source has transparent exterior while preserving its authored dark physical center",()=>{
  const stage=getSignatureAsset("master/arc-ember/stage/surface/v1")!;
  const png=PNG.sync.read(readFileSync(diskPath(stage.sourceAsset)));
  const alphaAt=(x:number,y:number)=>png.data[(y*png.width+x)*4+3];
  assert.equal(alphaAt(0,0),0);
  assert.ok(alphaAt(Math.floor(png.width/2),Math.floor(png.height/2))>0);
});

test("Signature sockets reuse canonical element kinds and keep actions independent",()=>{
  const stack = getSignatureAsset("master/arc-ember/action/stack-row/v1")!;
  const insert = signatureAssetInsert(stack);
  assert.equal(insert.kind,"button");
  assert.equal(insert.initialProps.signatureAssetId,stack.id);
  assert.equal(insert.initialProps.componentKind,undefined);
  assert.equal(stack.socketContract.action,true);
  assert.deepEqual(SIGNATURE_LAYOUT_RECIPES.map((recipe)=>recipe.id),["SINGLE","STACK-2","STACK-3","GRID-2","GROUPED-COMPACT","ICON-ROW"]);
  assert.equal(SIGNATURE_ASSETS.some((item)=>item.id.includes("double-stack")),false);
});

test("only frames and stages declare child containment",()=>{
  const containers=SIGNATURE_ASSETS.filter((item)=>item.nestingCapabilities.canContainChildren);
  assert.deepEqual([...new Set(containers.map((item)=>item.assetKind))].sort(),["frame","stage"]);
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
  for (const label of ["Actions","Identity","Frames & Stages","Dividers","Micro Parts"]) assert.ok(source.includes(`label:\"${label}\"`) || readFileSync(path.join(root,"lib/fusion/creative-studio/signature-assets/registry.ts"),"utf8").includes(`label:\"${label}\"`));
});

test("legacy pristine master remains unchanged",()=>{
  assert.equal(sha(path.join(root,"public/visual-parts/arc-ember/pristine-master-button.png")),"b9e0d71d02bcb77460d29fbdbad9390bf493a96bd67d8c2350096ef52669df48");
});
