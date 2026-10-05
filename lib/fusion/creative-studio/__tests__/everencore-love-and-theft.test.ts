import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import type { CreativeCompositionNode } from "../composition";
import { CANONICAL_NATIVE_SEMANTIC_ICON_ASSETS, CANONICAL_PLATFORM_ICON_ASSETS, CANONICAL_SEMANTIC_ICON_ASSETS } from "../icon-asset";
import { familyAppearanceContract } from "../platform/family-appearance-registry";
import { getMaterialRecipe } from "../material-engine";
import {
  compileSignatureAuthoringState,
  createSignatureAssemblyAuthoringState,
  applySignatureAssemblyMutation,
  readSignatureAssemblyAuthoringState,
  setSignatureAppearanceOption,
  updateSignatureAction,
} from "../signature-assets/authoring";
import { selectedStructuredAssembly } from "../reconstitution/signature-assembly-entry";
import { createCuratedAuthoringCapability, curatedCommandPayloadToMutation, CURATED_AUTHORING_COMMANDS } from "../reconstitution/curated-authoring-adapter";
import {
  EVERENCORE_LOVE_AND_THEFT_APPEARANCE_CONTRACT,
  LOVE_AND_THEFT_APPEARANCE_OPTION_IDS,
} from "../signature-assets/everencore-love-and-theft-appearance";
import {
  EVERENCORE_LOVE_AND_THEFT_ASSEMBLY_RECIPES,
  EVERENCORE_LOVE_AND_THEFT_FAMILY,
  EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,
  EVERENCORE_LOVE_AND_THEFT_VISUAL_ACCEPTANCE,
} from "../signature-assets/everencore-love-and-theft";
import { validateCuratedFamilyVisualAcceptance } from "../signature-assets/visual-acceptance";
import { CURATED_VISUAL_ACCEPTANCE_CONTRACTS, SIGNATURE_ASSEMBLY_RECIPES, SIGNATURE_ASSETS, SIGNATURE_FAMILIES } from "../signature-assets/registry";
import { isStudioHex, normalizeStudioHex, studioColorPalette } from "../platform/color-authority";

test("Love & Theft is an active reusable EverEncore artist family with seven governed presentations", () => {
  const family=SIGNATURE_FAMILIES.find((candidate)=>candidate.id===EVERENCORE_LOVE_AND_THEFT_FAMILY_ID);
  assert.equal(family,EVERENCORE_LOVE_AND_THEFT_FAMILY);
  assert.deepEqual(family?.artistCollection,{programId:"everencore",programLabel:"EverEncore",artistId:"love-and-theft",artistLabel:"Love & Theft"});
  assert.equal(family?.discovery?.exposure,"active");
  assert.equal(family?.discovery?.category,"Curated / Artist / EverEncore");
  assert.deepEqual(EVERENCORE_LOVE_AND_THEFT_ASSEMBLY_RECIPES.map((recipe)=>recipe.presentation?.label),[
    "Hero Action","Standard Action · Left Pick","Standard Action · Right Pick","Utility Bar · Compact Brass Insert","Standard Action · Body Only","Bound Single Stack","Twin Rail",
  ]);
  assert.deepEqual(EVERENCORE_LOVE_AND_THEFT_ASSEMBLY_RECIPES.map((recipe)=>recipe.presentationMode),[
    "standalone","standalone","standalone","standalone","standalone","single-stack","twin-rail",
  ]);
  assert.deepEqual(EVERENCORE_LOVE_AND_THEFT_ASSEMBLY_RECIPES.map((recipe)=>recipe.presentation?.density?.mode),[
    "full","medium","medium","compact","medium","medium","compact",
  ]);
  for (const recipe of EVERENCORE_LOVE_AND_THEFT_ASSEMBLY_RECIPES) {
    const density=recipe.presentation?.density;
    assert.ok(density,`${recipe.recipeId} must own semantic density`);
    assert.ok(density.minimumFlowWidthPercent<=density.preferredFlowWidthPercent);
    assert.ok(density.preferredFlowWidthPercent<=density.maximumFlowWidthPercent);
    assert.ok(density.minimumTouchTargetPx>=44);
  }
});

test("runtime vectors are immutable hash-matched sources and visual references stay runtime-ineligible", () => {
  const assets=SIGNATURE_ASSETS.filter((asset)=>asset.familyId===EVERENCORE_LOVE_AND_THEFT_FAMILY_ID);
  assert.equal(assets.length,23);
  for (const asset of assets) {
    const file=path.join(process.cwd(),"public",asset.sourceAsset);
    const hash=createHash("sha256").update(readFileSync(file)).digest("hex");
    assert.equal(hash,asset.sourceSha256,asset.id);
    assert.equal(asset.referenceOnly,asset.normalizedContract?.runtimeEligibility==="runtime-ineligible");
    for (const variant of Object.values(asset.materialSourceVariants??{})) {
      const variantFile=path.join(process.cwd(),"public",variant.sourceAsset);
      assert.equal(createHash("sha256").update(readFileSync(variantFile)).digest("hex"),variant.sourceSha256,variant.sourceAsset);
    }
    for (const variant of Object.values(asset.semanticSourceVariants??{})) {
      const variantFile=path.join(process.cwd(),"public",variant.sourceAsset);
      assert.equal(createHash("sha256").update(readFileSync(variantFile)).digest("hex"),variant.sourceSha256,variant.sourceAsset);
    }
    if (asset.ambientReflection) {
      const reflectionFile=path.join(process.cwd(),"public",asset.ambientReflection.sourceAsset);
      assert.equal(createHash("sha256").update(readFileSync(reflectionFile)).digest("hex"),asset.ambientReflection.sourceSha256,asset.ambientReflection.sourceAsset);
    }
  }
});

test("four certified glass treatments project through shared Materials while brass and engraving remain fixed", () => {
  assert.equal(familyAppearanceContract(EVERENCORE_LOVE_AND_THEFT_FAMILY_ID),EVERENCORE_LOVE_AND_THEFT_APPEARANCE_CONTRACT);
  const surface=EVERENCORE_LOVE_AND_THEFT_APPEARANCE_CONTRACT.roles.find((role)=>role.id==="text-bar-surface")!;
  assert.deepEqual(surface.options.map((option)=>option.label),["Smoky Black Glass","Burgundy Plum","Frosted Charcoal","Deep Blue Glass"]);
  assert.equal(EVERENCORE_LOVE_AND_THEFT_APPEARANCE_CONTRACT.defaults["text-bar-surface"],LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.smokyBlack);
  for (const option of EVERENCORE_LOVE_AND_THEFT_APPEARANCE_CONTRACT.roles.flatMap((role)=>role.options)) {
    assert.ok(option.materialProjection);
    assert.ok(getMaterialRecipe(option.materialProjection!.materialId),option.id);
  }
  assert.equal(EVERENCORE_LOVE_AND_THEFT_APPEARANCE_CONTRACT.certifiedCombinations.length,4);
  const actionAsset=SIGNATURE_ASSETS.find((asset)=>asset.familyId===EVERENCORE_LOVE_AND_THEFT_FAMILY_ID&&asset.assetKind==="action")!;
  assert.deepEqual(Object.keys(actionAsset.materialSourceVariants??{}),["smoky_black_glass","burgundy_plum_glass","frosted_charcoal","deep_blue_glass"]);
  assert.equal(actionAsset.ambientReflection?.defaultIntensity,48);
});

test("the shared semantic catalog combines approved Lucide semantics with all six platform marks", () => {
  assert.equal(CANONICAL_PLATFORM_ICON_ASSETS.length,6);
  assert.ok(CANONICAL_NATIVE_SEMANTIC_ICON_ASSETS.some((asset)=>asset.canonicalId==="lucide:shirt"));
  assert.ok(CANONICAL_NATIVE_SEMANTIC_ICON_ASSETS.some((asset)=>asset.canonicalId==="lucide:calendar-days"));
  assert.equal(CANONICAL_SEMANTIC_ICON_ASSETS.length,CANONICAL_NATIVE_SEMANTIC_ICON_ASSETS.length+6);
});

test("all seven presentations compile with optional plug separation and canonical appearance", () => {
  const expectedPlugSizes:Record<string,number>={
    "everencore-love-and-theft-hero":400,
    "everencore-love-and-theft-standard-left":276,
    "everencore-love-and-theft-standard-right":276,
    "everencore-love-and-theft-standard-utility":120,
    "everencore-love-and-theft-single-stack":270,
    "everencore-love-and-theft-twin-rail":210,
  };
  for (const recipe of EVERENCORE_LOVE_AND_THEFT_ASSEMBLY_RECIPES) {
    const state=createSignatureAssemblyAuthoringState(EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,{presentationId:recipe.presentation!.id},{idFactory:(()=>{let index=0;return()=>`love-theft-action-${++index}`;})()});
    assert.ok(state,recipe.recipeId);
    assert.equal(state!.input.presentationId,recipe.presentation!.id);
    assert.ok(state!.input.actions.every((action)=>action.sublabel));
    const result=compileSignatureAuthoringState(state!);
    assert.equal(result.ok,true,recipe.recipeId);
    if (!result.ok) continue;
    assert.equal(result.composition.presentationId,recipe.presentation!.id);
    const nodes=result.composition.block.nodes;
    const expectedPlugCount=state!.input.actions.filter((action)=>action.plugEnabled!==false&&recipe.presentation!.capabilities?.plug?.supported!==false).length;
    const plugs=nodes.filter((node)=>node.props.signatureRole==="semantic-plug");
    assert.equal(plugs.length,expectedPlugCount);
    for (const plug of plugs) {
      assert.equal(plug.props.signaturePlugVisualMode,"mastered-chassis");
      assert.equal((plug.props.signatureNativePlacement as {widthPx:number}).widthPx,expectedPlugSizes[recipe.presentation!.id]);
      assert.equal(plug.props.signatureDepthTreatment,undefined);
    }
    assert.ok(nodes.some((node)=>node.props.signatureMaterialRoles&&typeof node.props.signatureMaterialRoles==="object"));
    assert.ok(nodes.filter((node)=>node.props.signatureClassification==="live-action").every((node)=>node.props.signatureBackgroundReflectionIntensity===48));
    assert.ok(nodes.every((node)=>node.props.signatureFamilyId===EVERENCORE_LOVE_AND_THEFT_FAMILY_ID));
  }
});

test("governed responsive typography differs by Full, Medium, Compact, Single, and Twin density", () => {
  const policies=EVERENCORE_LOVE_AND_THEFT_ASSEMBLY_RECIPES.map((recipe)=>recipe.presentation?.capabilities?.responsiveTypography);
  assert.deepEqual(policies.map((policy)=>policy?.density),["full","medium","medium","compact","medium","single-stack","twin-rail"]);
  assert.ok(policies[0]!.title.maxPx>policies[1]!.title.maxPx);
  assert.ok(policies[1]!.title.maxPx>policies[3]!.title.maxPx);
  assert.equal(policies.at(-1)?.sublabel,undefined);
  for (const recipe of EVERENCORE_LOVE_AND_THEFT_ASSEMBLY_RECIPES) {
    const state=createSignatureAssemblyAuthoringState(EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,{presentationId:recipe.presentation!.id})!;
    const compiled=compileSignatureAuthoringState(state);
    assert.equal(compiled.ok,true);
    if (!compiled.ok) continue;
    const actions=compiled.composition.block.nodes.filter((node)=>node.props.signatureClassification==="live-action");
    assert.ok(actions.every((node)=>node.props.signatureResponsiveTypography&&typeof node.props.signatureResponsiveTypography==="object"));
    const descriptor=selectedStructuredAssembly([compiled.composition.block],actions[0]);
    assert.equal(descriptor?.textPrecision?.minPx,recipe.presentation!.capabilities!.responsiveTypography!.title.minPx);
    assert.equal(descriptor?.textPrecision?.maxPx,recipe.presentation!.capabilities!.responsiveTypography!.title.maxPx);
  }
});

test("Single Stack and Twin Rail persist independent action glass while the mastered pick stays fixed", () => {
  const optionIds=[LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.burgundyPlum,LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.deepBlue,LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.frostedCharcoal,LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.smokyBlack];
  let state=createSignatureAssemblyAuthoringState(EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,{presentationId:"everencore-love-and-theft-single-stack"})!;
  state={...state,input:{...state.input,actions:state.input.actions.map((action,index)=>({...action,appearanceOptionIds:{"text-bar-surface":optionIds[index%optionIds.length]}}))}};
  const compiled=compileSignatureAuthoringState(state);
  assert.equal(compiled.ok,true);
  if (!compiled.ok) return;
  const saved=structuredClone(compiled.composition.block);
  const reloaded=readSignatureAssemblyAuthoringState(saved)!;
  assert.deepEqual(reloaded.input.actions.map((action)=>action.appearanceOptionIds?.["text-bar-surface"]),optionIds.slice(0,reloaded.input.actions.length));
  for (const action of reloaded.input.actions) {
    const renderedAction: CreativeCompositionNode=compiled.composition.block.nodes.find((candidate)=>candidate.props.signatureClassification==="live-action"&&candidate.props.signatureActionId===action.id)!;
    assert.equal((renderedAction.props.signatureAppearanceOptionIds as Record<string,string>)["text-bar-surface"],action.appearanceOptionIds?.["text-bar-surface"]);
  }
  assert.ok(compiled.composition.block.nodes.filter((node)=>node.props.signatureRole==="semantic-plug").every((node)=>(node.props.signatureAppearanceOptionIds as Record<string,string>)["plug-surface"]===LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.agedBrass));
  const descriptor=selectedStructuredAssembly([saved],saved.nodes.find((node)=>node.props.signatureClassification==="live-action"))!;
  const capability=createCuratedAuthoringCapability(descriptor,descriptor.slots[0].id);
  const perAction=capability.groups.flatMap((group)=>group.controls).find((control)=>control.id==="action-appearance:text-bar-surface");
  assert.ok(perAction);
  const reset=curatedCommandPayloadToMutation(CURATED_AUTHORING_COMMANDS.updateAction,{actionId:descriptor.slots[0].id,controlId:"action-appearance:text-bar-surface",value:"__inherit__"},descriptor);
  assert.deepEqual(reset,{type:"update-action",actionId:descriptor.slots[0].id,patch:{appearanceOptionIds:undefined}});

  const twin=createSignatureAssemblyAuthoringState(EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,{presentationId:"everencore-love-and-theft-twin-rail"})!;
  assert.deepEqual(EVERENCORE_LOVE_AND_THEFT_ASSEMBLY_RECIPES.find((recipe)=>recipe.presentation?.id==="everencore-love-and-theft-twin-rail")?.certificationLimits.launchCertifiedActionCounts,[2,4,6]);
  const twinEdited={...twin,input:{...twin.input,actions:twin.input.actions.map((action,index)=>({...action,appearanceOptionIds:{"text-bar-surface":optionIds[index]}}))}};
  const twinCompiled=compileSignatureAuthoringState(twinEdited);
  assert.equal(twinCompiled.ok,true);
});

test("shared color authority validates, normalizes, and deduplicates editable hex values", () => {
  assert.equal(normalizeStudioHex("#abc"),"#AABBCC");
  assert.equal(isStudioHex("#123456"),true);
  assert.equal(isStudioHex("not-a-color"),false);
  assert.deepEqual(studioColorPalette(["#abc","#AABBCC","bad","#000000"]),["#AABBCC","#000000"]);
});

test("mastered pick overlap determines the live text safe area instead of a hidden plug box", () => {
  for (const presentationId of ["everencore-love-and-theft-standard-left","everencore-love-and-theft-standard-right"] as const) {
    const state=createSignatureAssemblyAuthoringState(EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,{presentationId})!;
    const compiled=compileSignatureAuthoringState(state);
    assert.equal(compiled.ok,true);
    if (!compiled.ok) continue;
    const action=compiled.composition.block.nodes.find((node)=>node.props.signatureClassification==="live-action")!;
    const safe=action.props.signatureTextSafeArea as {x:number;width:number};
    if (presentationId.endsWith("left")) {
      assert.ok(safe.x>.30&&safe.x<.32,`left safe edge ${safe.x}`);
      assert.ok(safe.width>.62);
    } else {
      assert.equal(safe.x,.06);
      assert.ok(safe.x+safe.width>.68&&safe.x+safe.width<.70,`right safe edge ${safe.x+safe.width}`);
    }
  }
});

test("body-only and mixed single-stack rows use the complete body master without phantom plug content", () => {
  const body=createSignatureAssemblyAuthoringState(EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,{presentationId:"everencore-love-and-theft-standard-body"})!;
  assert.equal(body.input.actions[0].plugPresentationId,undefined);
  assert.equal(body.input.actions[0].semanticIconRef,undefined);
  const compiledBody=compileSignatureAuthoringState(body);
  assert.equal(compiledBody.ok,true);
  if (compiledBody.ok) {
    assert.equal(compiledBody.composition.block.nodes.some((node)=>node.props.signatureRole==="semantic-plug"),false);
    assert.ok(compiledBody.composition.block.nodes.some((node)=>node.props.signatureComponentId==="EELT-STANDARD-BODY"));
  }
  const stack=createSignatureAssemblyAuthoringState(EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,{presentationId:"everencore-love-and-theft-single-stack"})!;
  assert.equal(stack.input.actions[1].plugEnabled,false);
  const compiledStack=compileSignatureAuthoringState(stack);
  assert.equal(compiledStack.ok,true);
  if (compiledStack.ok) {
    assert.equal(compiledStack.composition.block.nodes.filter((node)=>node.props.signatureRole==="semantic-plug").length,stack.input.actions.length-1);
    assert.ok(compiledStack.composition.block.nodes.some((node)=>node.props.signatureComponentId==="EELT-STANDARD-BODY"));
  }
});

test("Bound Single Stack compiles one continuous governed chassis with crown and termination", () => {
  const state=createSignatureAssemblyAuthoringState(EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,{presentationId:"everencore-love-and-theft-single-stack"})!;
  const compiled=compileSignatureAuthoringState(state);
  assert.equal(compiled.ok,true);
  if (!compiled.ok) return;
  const nodes=compiled.composition.block.nodes;
  assert.equal(nodes.filter((node)=>node.props.signatureRole==="single-stack-crown").length,1);
  assert.equal(nodes.filter((node)=>node.props.signatureRole==="single-stack-chassis").length,state.input.actions.length);
  assert.equal(nodes.filter((node)=>node.props.signatureRole==="single-stack-termination").length,1);
  assert.equal(nodes.filter((node)=>node.props.signatureClassification==="live-action").length,state.input.actions.length);
  const chassisY=nodes.filter((node)=>node.props.signatureRole==="single-stack-chassis").map((node)=>Number((node.props.signatureNativePlacement as {yPx:number}).yPx));
  assert.deepEqual(chassisY,Array.from({length:state.input.actions.length},(_,index)=>64+index*280));
  assert.ok(nodes.filter((node)=>node.props.signatureRole==="single-stack-chassis").every((node)=>node.props.signatureComponentId==="EELT-SINGLE-CHASSIS"));
});

test("the shared authoring contract exposes optional plug mode and persists body-only selection", () => {
  const hero=createSignatureAssemblyAuthoringState(EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,{presentationId:"everencore-love-and-theft-hero"})!;
  const compiled=compileSignatureAuthoringState(hero);
  assert.equal(compiled.ok,true);
  if (!compiled.ok) return;
  const actionNode=compiled.composition.block.nodes.find((node)=>node.props.signatureActionId===hero.input.actions[0].id)!;
  const descriptor=selectedStructuredAssembly([compiled.composition.block],actionNode);
  assert.ok(descriptor);
  assert.equal(descriptor?.capabilities?.plugOptional,true);
  assert.equal(descriptor?.density?.mode,"full");
  assert.deepEqual(descriptor?.layouts.map((layout)=>layout.density?.mode),["full","medium","medium","compact","medium","medium","compact"]);
  const capability=createCuratedAuthoringCapability(descriptor!,hero.input.actions[0].id);
  assert.ok(capability.groups.flatMap((group)=>group.controls).some((control)=>control.id==="plug-mode"));
  assert.ok(capability.groups.flatMap((group)=>group.controls).some((control)=>control.id==="background-reflection"&&control.type==="precision"));
  const mutation=curatedCommandPayloadToMutation("curated.action.update",{actionId:hero.input.actions[0].id,controlId:"plug-mode",value:"body-only"},descriptor!);
  assert.ok(mutation);
  const result=applySignatureAssemblyMutation(compiled.composition.block,mutation!);
  assert.equal(result.ok,true);
  if (!result.ok) return;
  const reloaded=readSignatureAssemblyAuthoringState(result.block);
  assert.equal(reloaded?.input.actions[0].plugEnabled,false);
  assert.equal(result.block.nodes.some((node)=>node.props.signatureRole==="semantic-plug"),false);
  assert.ok(result.block.nodes.some((node)=>node.props.signatureComponentId==="EELT-HERO-BODY"));
  const reflected=curatedCommandPayloadToMutation("curated.action.update",{actionId:hero.input.actions[0].id,controlId:"background-reflection",value:82},descriptor!);
  assert.deepEqual(reflected,{type:"update-action",actionId:hero.input.actions[0].id,patch:{backgroundReflectionIntensity:82}});
  const reflectedResult=applySignatureAssemblyMutation(result.block,reflected!);
  assert.equal(reflectedResult.ok,true);
  if (reflectedResult.ok) assert.equal(readSignatureAssemblyAuthoringState(reflectedResult.block)?.input.actions[0].backgroundReflectionIntensity,82);
});

test("label, sublabel, accessible label, semantic icon, plug side, and treatment survive stored-state reload", () => {
  const created=createSignatureAssemblyAuthoringState(EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,{presentationId:"everencore-love-and-theft-hero"},{idFactory:()=>"hero-action"})!;
  const action=created.input.actions[0];
  const edited=updateSignatureAction(setSignatureAppearanceOption(created,"text-bar-surface",LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.burgundyPlum),action.id,{
    label:"Stream the new single",
    sublabel:"Love & Theft · official release",
    accessibilityLabel:"Stream the new Love & Theft single",
    semanticIconRef:CANONICAL_PLATFORM_ICON_ASSETS.find((icon)=>icon.canonicalId==="simple-icons:apple-music"),
    semanticLabel:"Apple Music",
    plugSide:"left",
  });
  const compiled=compileSignatureAuthoringState(edited);
  assert.equal(compiled.ok,true);
  if (!compiled.ok) return;
  const reloaded=readSignatureAssemblyAuthoringState(structuredClone(compiled.composition.block));
  assert.ok(reloaded);
  assert.deepEqual(reloaded?.input.actions[0],edited.input.actions[0]);
  assert.equal(reloaded?.appearance?.semanticOptionIds["text-bar-surface"],LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.burgundyPlum);
  const recompiled=compileSignatureAuthoringState(reloaded!);
  assert.equal(recompiled.ok,true);
  if (!recompiled.ok) return;
  assert.equal(recompiled.composition.block.nodes.find((node)=>node.props.signatureActionId===action.id)?.props.description,"Love & Theft · official release");
});

test("every Love & Theft presentation is covered by the family-neutral 390px whole-object gate", () => {
  assert.ok(CURATED_VISUAL_ACCEPTANCE_CONTRACTS.includes(EVERENCORE_LOVE_AND_THEFT_VISUAL_ACCEPTANCE));
  assert.deepEqual(validateCuratedFamilyVisualAcceptance(EVERENCORE_LOVE_AND_THEFT_VISUAL_ACCEPTANCE,SIGNATURE_ASSEMBLY_RECIPES,SIGNATURE_ASSETS),[]);
  assert.equal(EVERENCORE_LOVE_AND_THEFT_VISUAL_ACCEPTANCE.viewport.widthPx,390);
  assert.equal(EVERENCORE_LOVE_AND_THEFT_VISUAL_ACCEPTANCE.presentations.length,7);
  assert.deepEqual(EVERENCORE_LOVE_AND_THEFT_VISUAL_ACCEPTANCE.presentations.map((presentation)=>presentation.referenceAssetIds[0]),[
    "EELT-REF-HERO","EELT-REF-STANDARD-L","EELT-REF-STANDARD-R","EELT-REF-UTILITY","EELT-REF-BODY","EELT-REF-SINGLE","EELT-REF-TWIN",
  ]);
});
