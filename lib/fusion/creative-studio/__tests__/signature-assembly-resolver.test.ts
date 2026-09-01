import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  resolveSignatureAssembly,
  type SignatureAssemblyActionSelection,
  type SignatureAssemblyInput,
  type SignatureAssemblyPlan,
  type SignatureAssemblyRegistry,
} from "../signature-assets/assembly";
import { SIGNATURE_ASSEMBLY_RECIPES, SIGNATURE_ASSETS, SIGNATURE_FAMILIES } from "../signature-assets/registry";
import { CABINET_NOIR_ROW_SEAM_CONTRACT, CABINET_NOIR_TWIN_RAIL_RECIPE } from "../signature-assets/cabinet-noir";

const singleRecipe = SIGNATURE_ASSEMBLY_RECIPES.find((recipe)=>recipe.recipeId==="cabinet-noir-single-stack")!;
const singleStride = singleRecipe.geometry.unitStridePx;
const singleOrigin = singleRecipe.geometry.contentOriginOffsetPx??0;
const singleContinuationOverlap = 724-singleStride;

const action = (index:number): SignatureAssemblyActionSelection => ({
  id:`action-${index+1}`,
  label:`Action ${index+1}`,
  destination:`https://example.com/${index+1}`,
  plugComponentId:`CN-${String(13+(index%24)).padStart(3,"0")}`,
  accessibilityLabel:`Open action ${index+1}`,
  state:"default",
  analyticsId:`analytics-action-${index+1}`,
});

const input = (layoutMode:"single-stack"|"twin-rail",count:number,overrides:Partial<SignatureAssemblyInput>={}): SignatureAssemblyInput => ({
  familyId:"cabinet-noir",
  familyVersion:"1.0.0",
  recipeId:layoutMode==="single-stack"?"cabinet-noir-single-stack":"cabinet-noir-twin-rail",
  recipeVersion:"1.0.0",
  requestedActionCount:count,
  layoutMode,
  actions:Array.from({length:count},(_,index)=>action(index)),
  ...overrides,
});

function planFor(layout:"single-stack"|"twin-rail",count:number,overrides:Partial<SignatureAssemblyInput>={}): SignatureAssemblyPlan {
  const result=resolveSignatureAssembly(input(layout,count,overrides));
  assert.equal(result.ok,true,JSON.stringify(result));
  return result.plan;
}

const instances = (plan:SignatureAssemblyPlan,role:string) => plan.instances.filter((instance)=>instance.semanticRole===role);

test("Single-Stack proofs resolve 1/2/4/6 actions with a continuous rail chassis behind every row",()=>{
  for (const count of [1,2,4,6]) {
    const plan=planFor("single-stack",count);
    assert.equal(instances(plan,"standard-action").length,count);
    assert.equal(instances(plan,"single-stack-repeat-rails").length,count);
    assert.deepEqual(instances(plan,"single-stack-repeat-rails").map((instance)=>instance.placement.native.yPx),Array.from({length:count},(_,index)=>singleOrigin+index*singleStride));
    assert.equal(instances(plan,"single-stack-termination").length,1);
    assert.equal(instances(plan,"single-stack-termination")[0].placement.native.yPx,singleOrigin+Math.max(0,(count-1)*singleStride)-136*1.350278091);
    assert.equal(plan.preferredOverlapPx,0);
    assert.equal(plan.unitStridePx,singleStride);
    assert.equal(plan.visualContinuationOverlapPx,singleContinuationOverlap);
  }
});

test("Single-Stack visible action bodies preserve the phone-scale pi seam independently of plug geometry",()=>{
  const scale=CABINET_NOIR_ROW_SEAM_CONTRACT.authoritativeWidthCssPx/CABINET_NOIR_ROW_SEAM_CONTRACT.projectionWidthPx;
  for (const count of [2,3,4,5,6]) {
    for (const plan of [planFor("single-stack",count),planFor("single-stack",count,{actions:[...input("single-stack",count).actions].reverse()})]) {
      const actions=instances(plan,"standard-action");
      for (let index=0;index<actions.length-1;index++) {
        const current=actions[index];
        const next=actions[index+1];
        const currentBounds=CABINET_NOIR_ROW_SEAM_CONTRACT.visibleBodyBoundsPx[current.sourceComponentId as "CN-004"|"CN-005"];
        const nextBounds=CABINET_NOIR_ROW_SEAM_CONTRACT.visibleBodyBoundsPx[next.sourceComponentId as "CN-004"|"CN-005"];
        const renderedGap=(next.placement.native.yPx+nextBounds.top*next.placement.sourceScale.y-current.placement.native.yPx-currentBounds.bottom*current.placement.sourceScale.y)*scale;
        assert.ok(Math.abs(renderedGap-CABINET_NOIR_ROW_SEAM_CONTRACT.targetCssPx)<.000001,`${count} actions · ${current.sourceComponentId} → ${next.sourceComponentId}: ${renderedGap}`);
      }
      const plugs=instances(plan,"semantic-plug");
      assert.equal(plugs.length,count);
      assert.ok(plugs.every((plug)=>plug.zOrder>actions[0].zOrder));
      assert.equal(plan.actionPresentationMode,"compact-stacked");
      for (const plug of plugs) {
        const parent=actions.find((candidate)=>candidate.instanceId===plug.parentInstanceId)!;
        const component=SIGNATURE_ASSETS.find((asset)=>asset.normalizedContract?.componentId===parent.sourceComponentId)?.normalizedContract;
        assert.ok(component?.compactStackedGeometry);
        const rowTop=parent.placement.native.yPx+component!.compactStackedGeometry!.visibleBodyBounds.top*parent.placement.native.heightPx;
        const rowBottom=rowTop+plan.actionRowHeightPx;
        assert.ok(plug.placement.native.yPx>=rowTop-.000001,`${plug.sourceComponentId} starts outside its row`);
        assert.ok(plug.placement.native.yPx+plug.placement.native.heightPx<=rowBottom+.000001,`${plug.sourceComponentId} ends outside its row`);
        assert.ok(Math.abs(plug.placement.native.widthPx-plug.placement.native.heightPx)<.000001,"compact plugs must share one governed medallion envelope");
      }
    }
  }
});

test("Single-Stack alternates independent left and right masters without mirroring",()=>{
  const plan=planFor("single-stack",6);
  assert.deepEqual(instances(plan,"standard-action").map((instance)=>instance.sourceComponentId),["CN-004","CN-005","CN-004","CN-005","CN-004","CN-005"]);
  assert.deepEqual(instances(plan,"standard-action").map((instance)=>instance.layout.side),["left","right","left","right","left","right"]);
});

test("removing or reordering actions changes content only while structural cadence closes deterministically",()=>{
  const four=input("single-stack",4);
  const reordered={...four,actions:[...four.actions].reverse()};
  const originalPlan=planFor("single-stack",4);
  const reorderedResult=resolveSignatureAssembly(reordered);
  assert.equal(reorderedResult.ok,true);
  if (reorderedResult.ok) {
    const structure=(plan:SignatureAssemblyPlan)=>plan.instances.filter((instance)=>instance.structural).map(({semanticRole,placement,repeatIndex})=>({semanticRole,placement,repeatIndex}));
    assert.deepEqual(structure(reorderedResult.plan),structure(originalPlan));
  }
  const reduced=planFor("single-stack",2);
  assert.equal(instances(reduced,"single-stack-repeat-rails").length,2);
  assert.equal(instances(reduced,"single-stack-termination").length,1);
});

test("optional structural decoration never controls Single-Stack closure",()=>{
  const without=planFor("single-stack",2);
  const withFooter=planFor("single-stack",2,{decorativeFurniture:{"decorative-termination":true}});
  assert.equal(instances(without,"decorative-termination").length,0);
  assert.equal(instances(withFooter,"decorative-termination").length,1);
  assert.equal(instances(without,"single-stack-termination").length,1);
  assert.equal(instances(withFooter,"single-stack-termination").length,1);
});

test("Twin-Rail even proofs resolve 2/4/6 actions with outer rails and spine behind every paired level",()=>{
  for (const count of [2,4,6]) {
    const plan=planFor("twin-rail",count);
    const levels=count/2;
    assert.equal(plan.actionUnitCount,levels);
    assert.equal(instances(plan,"standard-action").length,count);
    assert.equal(instances(plan,"twin-rail-repeat-outer").length,levels);
    assert.equal(instances(plan,"twin-rail-repeat-spine").length,levels);
    assert.deepEqual(instances(plan,"twin-rail-repeat-outer").map((instance)=>instance.placement.native.yPx),Array.from({length:levels},(_,index)=>-450+index*230));
    assert.equal(instances(plan,"twin-rail-termination").length,1);
    const lastSpine=instances(plan,"twin-rail-repeat-spine").at(-1)!;
    const termination=instances(plan,"twin-rail-termination")[0];
    assert.equal(termination.placement.native.yPx,lastSpine.placement.native.yPx,"bottom-cap center socket and final spine use the declared visible overlap plane, not transparent canvas edges");
    assert.ok(termination.zOrder>lastSpine.zOrder,"terminal cap masks the incoming seam instead of letting the spine die above it");
    assert.equal(plan.visualContinuationOverlapPx,132);
  }
});

test("Twin-Rail opts into complete structural endpoint coverage",()=>{
  assert.equal(CABINET_NOIR_TWIN_RAIL_RECIPE.structuralAttachmentPolicy,"complete");
  const structuralRules=[
    ...CABINET_NOIR_TWIN_RAIL_RECIPE.geometry.fixedTop,
    ...CABINET_NOIR_TWIN_RAIL_RECIPE.geometry.repeatComponents,
    CABINET_NOIR_TWIN_RAIL_RECIPE.geometry.structuralTermination!,
    CABINET_NOIR_TWIN_RAIL_RECIPE.geometry.oddAction!.transition,
  ];
  assert.ok(structuralRules.every((rule)=>rule.structuralAttachment));
});

test("Twin-Rail sides remain independent and repeat rails stay in exact 362px lockstep",()=>{
  const plan=planFor("twin-rail",6);
  assert.deepEqual(instances(plan,"standard-action").map((instance)=>instance.sourceComponentId),["CN-004","CN-005","CN-004","CN-005","CN-004","CN-005"]);
  const outer=instances(plan,"twin-rail-repeat-outer");
  const spine=instances(plan,"twin-rail-repeat-spine");
  assert.equal(outer.length,3);
  for (let index=0;index<outer.length;index++) {
    assert.equal(outer[index].placement.native.yPx,spine[index].placement.native.yPx);
    assert.equal(outer[index].placement.native.heightPx,362);
    assert.equal(spine[index].placement.native.heightPx,362);
    assert.equal(outer[index].repeatStridePx,362);
    assert.equal(spine[index].repeatStridePx,362);
  }
});

test("odd Twin-Rail 3/5 plans terminate complete pairs before a legitimate full-width action",()=>{
  for (const count of [3,5]) {
    const plan=planFor("twin-rail",count);
    assert.equal(plan.certificationStatus,"launch-certified");
    assert.equal(instances(plan,"standard-action").length,count-1);
    assert.equal(instances(plan,"hero-action").length,1);
    assert.equal(instances(plan,"odd-action-finisher").length,1);
    const odd=instances(plan,"hero-action")[0];
    assert.equal(odd.action?.label,`Action ${count}`);
    assert.equal(odd.action?.destination,`https://example.com/${count}`);
    assert.equal(odd.action?.analyticsId,`analytics-action-${count}`);
    assert.equal(odd.placement.native.widthPx,2172);
    const transition=instances(plan,"odd-action-finisher")[0];
    const termination=instances(plan,"twin-rail-termination")[0];
    assert.equal(transition.placement.native.yPx,odd.placement.native.yPx+480);
    assert.equal(termination.placement.native.yPx,transition.placement.native.yPx);
  }
});

test("7-action Twin-Rail remains explicit structural-proof-only output",()=>{
  const plan=planFor("twin-rail",7);
  assert.equal(plan.certificationStatus,"structural-proof-only");
  assert.equal(instances(plan,"standard-action").length,6);
  assert.equal(instances(plan,"hero-action").length,1);
});

test("odd transition furniture is never promoted into an action",()=>{
  const transition=instances(planFor("twin-rail",3),"odd-action-finisher")[0];
  assert.equal(transition.sourceComponentId,"CN-010");
  assert.equal(transition.classification,"decorative");
  assert.equal(transition.interactive,false);
  assert.equal(transition.action,undefined);
  assert.deepEqual(transition.socketOwnership,[]);
  assert.equal(transition.liveContentOwnership.actionText,false);
});

test("identity variants substitute through metadata and retain certified anchor placement",()=>{
  const variants=["CN-037","CN-037-ALT-A1","CN-037-ALT-A2","CN-037-ALT-A3"];
  const placements=variants.map((componentId)=>instances(planFor("single-stack",2,{componentVariants:{"identity-header":componentId}}),"identity-header")[0]);
  assert.deepEqual(placements.map((instance)=>instance.sourceComponentId),variants);
  for (const instance of placements) {
    assert.deepEqual(instance.attachmentAnchorsUsed,["bridge-attachment"]);
    assert.equal(instance.placement.native.widthPx,1536);
    assert.equal(instance.placement.native.heightPx,1024);
    assert.equal(instance.liveContentOwnership.identitySocket,true);
  }
  assert.equal(new Set(placements.map((instance)=>instance.placement.native.yPx)).size,4);
});

test("identical inputs return byte-identical deterministic plans",()=>{
  const request=input("twin-rail",5,{componentVariants:{"identity-header":"CN-037-ALT-A2"}});
  assert.deepEqual(resolveSignatureAssembly(request),resolveSignatureAssembly(request));
});

test("invalid family, recipe, layout, count, and action metadata fail explicitly",()=>{
  const cases: Array<[Partial<SignatureAssemblyInput>,string]> = [
    [{familyId:"missing-family"},"FAMILY_NOT_FOUND"],
    [{familyVersion:"2.0.0"},"INVALID_FAMILY_VERSION"],
    [{recipeId:"missing-recipe"},"RECIPE_NOT_FOUND"],
    [{layoutMode:"twin-rail"},"LAYOUT_MODE_MISMATCH"],
    [{requestedActionCount:0,actions:[]},"INVALID_ACTION_COUNT"],
    [{requestedActionCount:8,actions:Array.from({length:8},(_,index)=>action(index))},"UNSUPPORTED_ACTION_COUNT"],
    [{actions:[]},"MISSING_ACTION_DATA"],
  ];
  for (const [overrides,code] of cases) {
    const result=resolveSignatureAssembly(input("single-stack",2,overrides));
    assert.equal(result.ok,false);
    if (!result.ok) assert.ok(result.errors.some((error)=>error.code===code),JSON.stringify(result.errors));
  }
});

test("reference-only, quarantined, incompatible variants, and invalid plugs are rejected",()=>{
  const reference=resolveSignatureAssembly(input("single-stack",2,{componentVariants:{"identity-header":"CN-006"}}));
  assert.equal(reference.ok,false);
  if(!reference.ok)assert.ok(reference.errors.some((error)=>error.code==="INVALID_COMPONENT_VARIANT"||error.code==="COMPONENT_RUNTIME_INELIGIBLE"));
  const invalidPlug=resolveSignatureAssembly(input("single-stack",2,{actions:[{...action(0),plugComponentId:"CN-006"},action(1)]}));
  assert.equal(invalidPlug.ok,false);
  if(!invalidPlug.ok)assert.ok(invalidPlug.errors.some((error)=>error.code==="INVALID_PLUG_SELECTION"));
  const quarantinedAssets=SIGNATURE_ASSETS.map((asset)=>asset.normalizedContract?.componentId==="CN-037"?{...asset,normalizedContract:{...asset.normalizedContract,lifecycle:"quarantined" as const,runtimeEligibility:"runtime-ineligible" as const}}:asset);
  const registry:SignatureAssemblyRegistry={families:SIGNATURE_FAMILIES,assets:quarantinedAssets,recipes:SIGNATURE_ASSEMBLY_RECIPES};
  const quarantined=resolveSignatureAssembly(input("single-stack",2),registry);
  assert.equal(quarantined.ok,false);
  if(!quarantined.ok)assert.ok(quarantined.errors.some((error)=>error.code==="COMPONENT_RUNTIME_INELIGIBLE"));
});

test("missing anchors, cadence drift, stride drift, and overlap hacks fail closed",()=>{
  const baseRecipe=SIGNATURE_ASSEMBLY_RECIPES.find((recipe)=>recipe.recipeId==="cabinet-noir-single-stack")!;
  const run=(assets:typeof SIGNATURE_ASSETS,recipe:typeof baseRecipe)=>resolveSignatureAssembly(input("single-stack",2),{families:SIGNATURE_FAMILIES,assets,recipes:[recipe]});
  const noAnchor=SIGNATURE_ASSETS.map((asset)=>asset.normalizedContract?.componentId==="CN-038"?{...asset,normalizedContract:{...asset.normalizedContract,attachmentAnchors:[]}}:asset) as typeof SIGNATURE_ASSETS;
  const missing=run(noAnchor,baseRecipe);
  assert.equal(missing.ok,false); if(!missing.ok)assert.ok(missing.errors.some((error)=>error.code==="MISSING_ATTACHMENT_GEOMETRY"));
  const cadenceAssets=SIGNATURE_ASSETS.map((asset)=>asset.normalizedContract?.componentId==="CN-039"?{...asset,normalizedContract:{...asset.normalizedContract,repeatability:{...asset.normalizedContract.repeatability!,cadence:"wrong"}}}:asset) as typeof SIGNATURE_ASSETS;
  const cadence=run(cadenceAssets,baseRecipe);
  assert.equal(cadence.ok,false); if(!cadence.ok)assert.ok(cadence.errors.some((error)=>error.code==="REPEAT_CADENCE_MISMATCH"));
  const strideRecipe={...baseRecipe,repeatInterval:{...baseRecipe.repeatInterval!,nativeStridePx:700},geometry:{...baseRecipe.geometry,unitStridePx:700,actionPresentation:baseRecipe.geometry.actionPresentation?{...baseRecipe.geometry.actionPresentation,rowHeightPx:700}:undefined}};
  const stride=run(SIGNATURE_ASSETS,strideRecipe);
  assert.equal(stride.ok,false); if(!stride.ok)assert.ok(stride.errors.some((error)=>error.code==="REPEAT_STRIDE_MISMATCH"));
  const overlapRecipe={...baseRecipe,repeatInterval:{...baseRecipe.repeatInterval!,preferredOverlapPx:1}};
  const overlap=run(SIGNATURE_ASSETS,overlapRecipe);
  assert.equal(overlap.ok,false); if(!overlap.ok)assert.ok(overlap.errors.some((error)=>error.code==="NONZERO_COMPENSATING_OVERLAP"));
});

test("the family-neutral resolver contains no family or component conditional",()=>{
  const source=readFileSync(path.join(process.cwd(),"lib/fusion/creative-studio/signature-assets/assembly.ts"),"utf8");
  assert.doesNotMatch(source,/cabinet[_ -]?noir/i);
  assert.doesNotMatch(source,/CN-\d{3}/);
});
