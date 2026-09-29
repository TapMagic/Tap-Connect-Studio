import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { CANONICAL_PLATFORM_ICON_ASSETS } from "../icon-asset";
import { curatedMaterialSurfaceStyle } from "../signature-assets/curated-material-projection";
import { resolveSignatureAssembly, type SignatureAssemblyActionSelection, type SignatureAssemblyInput, type SignatureAssemblyRegistry } from "../signature-assets/assembly";
import { adaptSignatureAssemblyResult } from "../signature-assets/composition-adapter";
import { CABINET_NOIR_ASSEMBLY_RECIPES, CABINET_NOIR_ASSETS } from "../signature-assets/cabinet-noir";
import type { SignatureAssemblyRecipe, SignaturePresentationContract } from "../signature-assets/layout-recipes";
import type { SignatureAssetDefinition, SignatureFamilyDefinition } from "../signature-assets/types";
import { buildStudioButtonFamilyCatalog } from "../reconstitution/button-family-provider.server";

const familyId="family-neutral-curated-fixture";
const family:SignatureFamilyDefinition={id:familyId,slug:"family-neutral-fixture",label:"Family Neutral Fixture",lifecycle:"production",sortOrder:999,version:"1.0.0",discovery:{exposure:"hidden",category:"Test",description:"Test-only; never discoverable."}};
const renameComponent=(value:string)=>`fixture-${value.toLowerCase()}`;
const assets:readonly SignatureAssetDefinition[]=CABINET_NOIR_ASSETS.filter((asset)=>asset.normalizedContract).map((asset)=>({
  ...asset,
  id:`fixture/${asset.normalizedContract!.componentId.toLowerCase()}`,
  familyId,
  sourceAsset:`/fixtures/family-neutral/${asset.normalizedContract!.componentId.toLowerCase()}.svg`,
  normalizedContract:{...asset.normalizedContract!,familyId,componentId:renameComponent(asset.normalizedContract!.componentId)},
}));

function presentation(id:string,overrides:Partial<SignaturePresentationContract["capabilities"]>={}):SignaturePresentationContract {
  return {id,label:id.replaceAll("-"," "),description:`Fixture ${id}`,capabilities:{
    semanticIcon:{supported:true,defaultCanonicalIconId:"simple-icons:spotify",treatment:{mode:"engraved",safeInset:.22,materialId:"brushed_gold"}},
    sublabel:{supported:true,maxLength:48},plugSide:{mode:"authorable",allowed:["left","right"],defaultSide:"left"},...overrides,
  }};
}

function fixtureRecipe(base:SignatureAssemblyRecipe,id:string,definition:SignaturePresentationContract):SignatureAssemblyRecipe {
  const clone=structuredClone(base) as SignatureAssemblyRecipe;
  const visit=(value:unknown):void=>{
    if (!value||typeof value!=="object") return;
    for (const [key,current] of Object.entries(value as Record<string,unknown>)) {
      if (key==="componentId"&&typeof current==="string") (value as Record<string,unknown>)[key]=renameComponent(current);
      else visit(current);
    }
  };
  visit(clone);
  return {...clone,familyId,familyVersion:"1.0.0",recipeId:id,recipeVersion:"1.0.0",presentation:definition};
}

const standaloneBase=CABINET_NOIR_ASSEMBLY_RECIPES.find((recipe)=>recipe.presentationMode==="standalone")!;
const singleBase=CABINET_NOIR_ASSEMBLY_RECIPES.find((recipe)=>recipe.presentationMode==="single-stack")!;
const twinBase=CABINET_NOIR_ASSEMBLY_RECIPES.find((recipe)=>recipe.presentationMode==="twin-rail")!;
const recipes=[
  fixtureRecipe(standaloneBase,"fixture-standalone-hero",presentation("hero-action")),
  fixtureRecipe(standaloneBase,"fixture-standalone-standard",presentation("standard-right",{plugSide:{mode:"fixed",side:"right"}})),
  fixtureRecipe(singleBase,"fixture-single-stack",presentation("single-stack",{plugSide:{mode:"derived"}})),
  fixtureRecipe(twinBase,"fixture-twin-rail",presentation("twin-rail",{plugSide:{mode:"derived"}})),
] as const;
const registry:SignatureAssemblyRegistry={families:[family],assets,recipes};
const plugs=assets.filter((asset)=>asset.normalizedContract?.role==="semantic-plug");

function action(index:number,overrides:Partial<SignatureAssemblyActionSelection>={}):SignatureAssemblyActionSelection {
  return {id:`action-${index}`,label:`Action ${index}`,sublabel:"Secondary copy",destination:"https://example.test",actionType:"website",plugComponentId:plugs[1].normalizedContract!.componentId,plugPresentationId:plugs[0].normalizedContract!.componentId,semanticIconRef:CANONICAL_PLATFORM_ICON_ASSETS[0],semanticLabel:"Listen on Spotify",accessibilityLabel:`Open action ${index}`,state:"default",analyticsId:`fixture-${index}`,plugSide:"left",...overrides};
}

function input(recipe:SignatureAssemblyRecipe,count:number,actions=Array.from({length:count},(_,index)=>action(index))):SignatureAssemblyInput {
  return {familyId,familyVersion:"1.0.0",recipeId:recipe.recipeId,recipeVersion:recipe.recipeVersion,presentationId:recipe.presentation!.id,layoutMode:recipe.presentationMode,requestedActionCount:count,actions};
}

test("semantic plug chassis, canonical icon, accessible label, and sublabel persist independently",()=>{
  const result=resolveSignatureAssembly(input(recipes[0],1),registry);
  assert.equal(result.ok,true);
  if (!result.ok) return;
  const plug=result.plan.instances.find((instance)=>instance.semanticRole==="semantic-plug")!;
  assert.equal(plug.sourceComponentId,plugs[0].normalizedContract!.componentId);
  assert.equal(plug.semanticIconRef?.canonicalId,"simple-icons:spotify");
  assert.equal(result.plan.canonicalInputs.actions[0].plugComponentId,plugs[1].normalizedContract!.componentId,"legacy composed plug remains preserved");
  assert.equal(result.plan.canonicalInputs.actions[0].semanticLabel,"Listen on Spotify");
  assert.equal(JSON.parse(JSON.stringify(result.plan.canonicalInputs)).actions[0].sublabel,"Secondary copy");
});

test("new separated presentations do not require the legacy composed plug field",()=>{
  const separated=action(0,{plugComponentId:undefined});
  const result=resolveSignatureAssembly(input(recipes[0],1,[separated]),registry);
  assert.equal(result.ok,true);
});

test("multiple standalone presentation IDs remain distinct from layout mode through projection and reload",()=>{
  for (const recipe of recipes.slice(0,2)) {
    const nextAction=action(0,{plugSide:recipe.presentation!.capabilities?.plugSide?.mode==="authorable"?"left":undefined});
    const result=resolveSignatureAssembly(input(recipe,1,[nextAction]),registry);
    assert.equal(result.ok,true);
    if (!result.ok) continue;
    const adapted=adaptSignatureAssemblyResult(result);
    assert.equal(adapted.ok,true);
    if (!adapted.ok) continue;
    assert.equal(result.plan.layoutMode,"standalone");
    assert.equal(result.plan.presentationId,recipe.presentation!.id);
    assert.equal(adapted.composition.presentationId,recipe.presentation!.id);
    assert.equal(adapted.composition.block.nodes[0].props.signaturePresentationId,recipe.presentation!.id);
    assert.equal(JSON.parse(JSON.stringify(result.plan.canonicalInputs)).presentationId,recipe.presentation!.id);
  }
});

test("fixed, authorable, and presentation-derived plug-side policies fail closed",()=>{
  assert.equal(resolveSignatureAssembly(input(recipes[1],1,[action(0,{plugSide:"left"})]),registry).ok,false);
  assert.equal(resolveSignatureAssembly(input(recipes[0],1,[action(0,{plugSide:"right"})]),registry).ok,true);
  assert.equal(resolveSignatureAssembly(input(recipes[2],2,[action(0,{plugSide:undefined}),action(1,{plugSide:undefined})]),registry).ok,true);
  assert.equal(resolveSignatureAssembly(input(recipes[2],2,[action(0,{plugSide:"left"}),action(1,{plugSide:undefined})]),registry).ok,false);
});

test("optional sublabels are accepted only when the presentation declares support",()=>{
  assert.equal(resolveSignatureAssembly(input(recipes[0],1),registry).ok,true);
  const unsupported=fixtureRecipe(standaloneBase,"fixture-no-sublabel",presentation("no-sublabel",{sublabel:{supported:false}}));
  assert.equal(resolveSignatureAssembly(input(unsupported,1),{...registry,recipes:[unsupported]}).ok,false);
});

test("family-neutral Single Stack and Twin Rail compile with fixture-owned sources",()=>{
  for (const [recipe,count] of [[recipes[2],2],[recipes[3],4]] as const) {
    const actions=Array.from({length:count},(_,index)=>action(index,{plugSide:undefined}));
    const result=resolveSignatureAssembly(input(recipe,count,actions),registry);
    assert.equal(result.ok,true);
    if (!result.ok) continue;
    assert.ok(result.plan.instances.every((instance)=>instance.sourceAsset.startsWith("/fixtures/family-neutral/")));
    assert.equal(result.plan.familyId,familyId);
  }
});

test("Curated material roles project through the shared Material engine and canonical renderer path",()=>{
  const style=curatedMaterialSurfaceStyle("smoked_glass");
  assert.match(String(style?.background),/rgba|gradient|#/);
  assert.equal(style?.borderStyle,"solid");
  const renderer=readFileSync(path.join(process.cwd(),"lib/fusion/creative-studio/signature-assets/SignatureMasterBridge.tsx"),"utf8");
  assert.match(renderer,/curatedMaterialSurfaceStyle\(surfaceRole\?\.materialId\)/);
  assert.match(renderer,/signature-master__material-surface/);
  assert.match(renderer,/signature-master__semantic-icon/);
});

test("six approved platform marks are canonical reusable IconAssets",()=>{
  assert.deepEqual(CANONICAL_PLATFORM_ICON_ASSETS.map((asset)=>asset.canonicalId),["simple-icons:spotify","simple-icons:apple-music","simple-icons:youtube","simple-icons:instagram","simple-icons:facebook","simple-icons:bandsintown"]);
  for (const icon of CANONICAL_PLATFORM_ICON_ASSETS) {
    assert.equal(icon.provider,"native");
    assert.match(icon.source,/^https:\/\//);
    assert.ok(icon.accessibleLabel&&icon.canonicalReference&&icon.compatibility?.includes("curated-semantic-icon")&&icon.attribution);
  }
});

test("registry metadata drives discovery while hidden and inactive families stay undiscoverable",()=>{
  const catalog=buildStudioButtonFamilyCatalog([]);
  const cabinet=catalog.entries.find((entry)=>entry.id==="cabinet-noir");
  assert.equal(cabinet?.description,"Certified champagne-gold and blackened-gunmetal governed actions.");
  const starts=cabinet?.sections.find((section)=>section.id==="assembly-starts")?.resources;
  assert.match(starts?.find((resource)=>resource.layoutMode==="single-stack")?.previewSrc??"",/CN-006/i);
  assert.match(starts?.find((resource)=>resource.layoutMode==="twin-rail")?.previewSrc??"",/CN-008/i);
  assert.equal(catalog.entries.find((entry)=>entry.id==="family_arc_ember_signature")?.exposure,"hidden");
  const visible=catalog.entries.filter((entry)=>entry.exposure==="visible").map((entry)=>entry.id);
  assert.ok(!visible.includes("family_arc_ember_signature"));
  const provider=readFileSync(path.join(process.cwd(),"lib/fusion/creative-studio/reconstitution/button-family-provider.server.ts"),"utf8");
  assert.doesNotMatch(provider,/slug\s*!==|slug\s*===/);
});
