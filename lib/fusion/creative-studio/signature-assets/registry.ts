import type { CardElementKind } from "@/lib/fusion/card/composer-model";
import type { SignatureAssetDefinition, SignatureAssetKind, SignatureFamilyDefinition, SignatureSubgroup } from "./types";
import { CABINET_NOIR_ASSEMBLY_RECIPES, CABINET_NOIR_ASSETS, CABINET_NOIR_FAMILY, CABINET_NOIR_VISUAL_ACCEPTANCE } from "./cabinet-noir";
import type { SignatureAssemblyRecipe } from "./layout-recipes";
import type { CuratedFamilyVisualAcceptanceContract } from "./visual-acceptance";

export const ARC_EMBER_SIGNATURE_FAMILY_ID = "family_arc_ember_signature";
export const SIGNATURE_SYSTEM_V1_FAMILY_ID = "family_signature_system_v1";
const ARC_ROOT = "/visual-parts/signature/arc-ember/source";
const SIGNATURE_V1_ROOT = "/visual-parts/signature/signature-system-v1/source";
const SIGNATURE_V1_MANIFEST = "/visual-parts/signature/signature-system-v1/reference/manifest.json";
const LIVE_SHELL = `${ARC_ROOT}/actions/00_pristine-blank-shell.png`;
const full = { top: 0, right: 0, bottom: 0, left: 0 } as const;
const actionInsets = { top: 0.16, right: 0.09, bottom: 0.17, left: 0.13 } as const;
const actionSockets = { identity: true, eyebrow: true, title: true, description: true, cue: true, action: true } as const;
const states = ["default", "hover", "pressed", "disabled"] as const;
const arcEmberStageExpansion = {
  mode: "protected-cap-inset",
  cornerCaps: { top: .202, right: .105, bottom: .223, left: .105 },
  contentSafeArea: { top: .19, right: .108, bottom: .205, left: .108 },
  glowSafeArea: { top: .025, right: .025, bottom: .045, left: .025 },
  plinthSafeRegion: { top: .78, bottom: 1 },
  minimumWidthPx: 300,
  minimumHeightPx: 230,
  innerPadding: { top: .15, right: .115, bottom: .17, left: .115 },
  childGapPx: 14,
  flow: "vertical",
} as const;

export const SIGNATURE_FAMILIES: readonly SignatureFamilyDefinition[] = [
  { id: ARC_EMBER_SIGNATURE_FAMILY_ID, slug: "arc-ember", label: "Arc Ember", lifecycle: "candidate", sortOrder: 10 },
  { id: SIGNATURE_SYSTEM_V1_FAMILY_ID, slug: "signature-system-v1", label: "Signature System v1", lifecycle: "production", sortOrder: 20 },
  CABINET_NOIR_FAMILY,
] as const;

export const SIGNATURE_ASSEMBLY_RECIPES: readonly SignatureAssemblyRecipe[] = [
  ...CABINET_NOIR_ASSEMBLY_RECIPES,
] as const;

export const CURATED_VISUAL_ACCEPTANCE_CONTRACTS: readonly CuratedFamilyVisualAcceptanceContract[] = [
  CABINET_NOIR_VISUAL_ACCEPTANCE,
] as const;

export function getSignatureAssemblyRecipe(recipeId: unknown, recipeVersion?: unknown) {
  if (typeof recipeId !== "string") return undefined;
  return SIGNATURE_ASSEMBLY_RECIPES.find((recipe)=>(recipe.recipeId===recipeId) && (recipeVersion === undefined || recipe.recipeVersion === recipeVersion));
}

function asset(input: Omit<SignatureAssetDefinition, "aspectRatio" | "expressionTier" | "referenceOnly" | "tintCapabilities" | "tintMode" | "energyMode" | "sourceReadiness"> & {
  referenceOnly?: boolean;
  tintCapabilities?: readonly string[];
  tintMode?: SignatureAssetDefinition["tintMode"];
  energyMode?: SignatureAssetDefinition["energyMode"];
  sourceReadiness?: SignatureAssetDefinition["sourceReadiness"];
}): SignatureAssetDefinition {
  return {
    ...input,
    aspectRatio: input.width / input.height,
    expressionTier: "signature",
    referenceOnly: input.referenceOnly ?? false,
    tintCapabilities: input.tintCapabilities ?? [],
    tintMode: input.tintMode ?? "none",
    energyMode: input.energyMode ?? "fixed",
    sourceReadiness: input.sourceReadiness ?? "production-ready",
  };
}

function arcAsset(input: Omit<Parameters<typeof asset>[0], "familyId">): SignatureAssetDefinition {
  return asset({ ...input, familyId: ARC_EMBER_SIGNATURE_FAMILY_ID });
}

function signatureV1Asset(input: Omit<Parameters<typeof asset>[0], "familyId" | "provenanceManifest">): SignatureAssetDefinition {
  return asset({ ...input, familyId: SIGNATURE_SYSTEM_V1_FAMILY_ID, provenanceManifest: SIGNATURE_V1_MANIFEST });
}

export const SIGNATURE_ASSETS: readonly SignatureAssetDefinition[] = [
  arcAsset({ id:"master/arc-ember/action/hero/v1", label:"Hero / Primary", subgroup:"actions", assetKind:"action", role:"hero-primary", variant:"hero", sourceAsset:"/visual-parts/arc-ember/pristine-master-button.png", sourceSha256:"b9e0d71d02bcb77460d29fbdbad9390bf493a96bd67d8c2350096ef52669df48", width:2172,height:724,glowPadding:actionInsets,safeInsets:actionInsets,socketContract:actionSockets,layoutCapabilities:["SINGLE"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:280},stateContract:states,nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},lifecycle:"candidate",sortOrder:10,tags:["hero","primary","identity","phone-safe"] }),
  arcAsset({ id:"master/arc-ember/action/social/v1", label:"Social", subgroup:"actions", assetKind:"action", role:"social", variant:"standard", sourceAsset:"/visual-parts/arc-ember/pristine-master-button.png", sourceSha256:"b9e0d71d02bcb77460d29fbdbad9390bf493a96bd67d8c2350096ef52669df48", width:2172,height:724,glowPadding:actionInsets,safeInsets:actionInsets,socketContract:actionSockets,layoutCapabilities:["SINGLE","GRID-2"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:280},stateContract:states,nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},lifecycle:"candidate",sortOrder:20,tags:["social","identity","phone-safe"] }),
  arcAsset({ id:"master/arc-ember/action/utility/v1", label:"Utility", subgroup:"actions", assetKind:"action", role:"utility", variant:"save-contact", sourceAsset:`${ARC_ROOT}/actions/03_utility-save-contact.png`, liveShellAsset:LIVE_SHELL, sourceSha256:"c052bf5529540a84c6b188ee5df57f2c8c09d6e1a0c6c8339b5e5dbb9018c74a", width:2172,height:724,glowPadding:actionInsets,safeInsets:actionInsets,socketContract:actionSockets,layoutCapabilities:["SINGLE","GRID-2"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:280},stateContract:states,nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},lifecycle:"candidate",sortOrder:30,tags:["utility","contact","identity","phone-safe"] }),
  arcAsset({ id:"master/arc-ember/action/team-about/v1", label:"Team / About", subgroup:"actions", assetKind:"action", role:"team-about", variant:"wide", sourceAsset:`${ARC_ROOT}/actions/04_team-about.png`, liveShellAsset:LIVE_SHELL, sourceSha256:"12a28d0cf658540df57207fe2a14d3c488f0966e53c776e21e6d89015e70459a", width:1672,height:941,glowPadding:actionInsets,safeInsets:actionInsets,socketContract:actionSockets,layoutCapabilities:["SINGLE"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:280},stateContract:states,nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},lifecycle:"candidate",sortOrder:40,tags:["team","about","identity","phone-safe"] }),
  arcAsset({ id:"master/arc-ember/action/compact/v1", label:"Compact", subgroup:"actions", assetKind:"action", role:"compact", variant:"condensed", sourceAsset:`${ARC_ROOT}/actions/05_compact-condensed.png`, liveShellAsset:LIVE_SHELL, sourceSha256:"059f562f2ed389e9c572e3c54ed3cf1a1592bc2422e481d912ee99bf85671e2f", width:2172,height:724,glowPadding:actionInsets,safeInsets:actionInsets,socketContract:actionSockets,layoutCapabilities:["SINGLE","GROUPED-COMPACT"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:240},stateContract:states,nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},lifecycle:"candidate",sortOrder:50,tags:["compact","condensed","phone-safe"] }),
  arcAsset({ id:"master/arc-ember/action/stack-row/v1", label:"Stack Row", subgroup:"actions", assetKind:"action", role:"stack-row", variant:"call", sourceAsset:`${ARC_ROOT}/actions/06_double-stack-row_call.png`, liveShellAsset:LIVE_SHELL, sourceSha256:"c2ce8ae359d2de55c9e5a9cb468b2a074f291d145c0e302865c21ba4938b2d9e", width:2048,height:768,glowPadding:actionInsets,safeInsets:actionInsets,socketContract:actionSockets,layoutCapabilities:["STACK-2","STACK-3"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:260},stateContract:states,nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},lifecycle:"candidate",sortOrder:60,tags:["stack-compatible","independent-action","phone-safe"] }),
  ...[
    ["logo-medallion","Logo Medallion","01_logo-medallion.png","19ebde77d0fa532e8d16bfffa5888f88f45fcb14b7213594862df5d44dae3edd"],
    ["open-lens","Open Lens","02_open-lens.png","8cb5e9fc86a8fea32b4358f58b94daac6d4494cfc30f9ebd80545729803272a8"],
    ["inset-plate","Inset Plate","03_inset-plate.png","1207ddb3f919870909e2c8607d389aa714c863f77fba2fd2e58c8cb53069ee15"],
    ["framed-icon","Framed Icon Insert","04_framed-icon-insert_blank.png","fc71157a492b844d410f5d423701a894d38a1dff523d64a7182ecae896f82c84"],
  ].map(([role,label,file,sha],index)=>arcAsset({id:`master/arc-ember/identity/${role}/v1`,label,subgroup:"identity",assetKind:"identity",role,variant:"standard",sourceAsset:`${ARC_ROOT}/identity/${file}`,sourceSha256:sha,width:1254,height:1254,glowPadding:full,safeInsets:{top:.2,right:.2,bottom:.2,left:.2},socketContract:{identity:true},layoutCapabilities:["SINGLE"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:72},stateContract:["default","disabled"],nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},lifecycle:"candidate",sortOrder:100+index,tags:["identity","logo","icon","portrait","phone-safe"]})),
  ...[
    ["diamond","Diamond Center","01_diamond-center.png","f3d20fffe31d5056a5a35ede0be33e8c42f24825256f55840fa66add35c8943c",false],
    ["logo-center","Logo / Medallion Center","02_logo-medallion-center.png","7b64d21229f679be65a6fc910fa2479d505c709173df755e2941270760efd34a",true],
    ["plain","Plain / No Center","03_plain-no-center.png","3b3f87f5ee44c1562c043891930918174a1bb241f829397529859eafd8e3ad85",false],
    ["single-rod","Single Electric Rod","04_single-electric-rod.png","f5308026129f7f44c00a42e8e0082ffe21beae05071adad8766c8f7271bc18d4",false],
    ["paired-rods","Paired Rods","05-double-electic-rod.png","f1467a49addf1453fee647b3b48b2da199d65e97d00689ebd6780dd9fb0b7c73",false],
  ].map(([role,label,file,sha,center],index)=>arcAsset({id:`master/arc-ember/divider/${role}/v1`,label:String(label),subgroup:"dividers",assetKind:"divider",role:String(role),variant:"transparent-exterior",sourceAsset:`${ARC_ROOT}/dividers/${file}`,sourceSha256:String(sha),width:2172,height:724,glowPadding:full,safeInsets:full,socketContract:{dividerCenter:Boolean(center)},layoutCapabilities:["SINGLE"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:260},stateContract:["default","disabled"],nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},lifecycle:"production",sortOrder:200+index,tags:["divider","electric-blue","transparent-exterior","phone-safe",center?"live-center":"no-center"]})),
  arcAsset({id:"master/arc-ember/frame/container-wide/v1",label:"Container / Section Frame",subgroup:"frames-stages",assetKind:"frame",role:"container-wide",variant:"wide",sourceAsset:`${ARC_ROOT}/frames-stages/01_container-section-frame_wide.png`,sourceSha256:"ee6a18e01586decbd490065a8cb83b2dfe3fe38066b7e33e10a6aaf2adfcf2e0",width:1672,height:941,glowPadding:full,safeInsets:{top:.12,right:.1,bottom:.14,left:.1},socketContract:{childContent:true},layoutCapabilities:["SINGLE","STACK-2","STACK-3","GRID-2"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:300},stateContract:["default","disabled"],nestingCapabilities:{canContainChildren:true,acceptedChildKinds:["action","identity","divider","footer"]},lifecycle:"candidate",sortOrder:300,tags:["container-capable","section","background","phone-safe"]}),
  arcAsset({id:"master/arc-ember/stage/surface/v1",label:"Surface / Stage",subgroup:"frames-stages",assetKind:"stage",role:"surface",variant:"expandable",sourceAsset:`${ARC_ROOT}/frames-stages/02_surface-stage-frame.png`,sourceSha256:"8bc4dfa4d7c8a69bede0ad03dae8bd88e84301f695892b3acc143a28d1b64c29",width:1672,height:941,glowPadding:full,safeInsets:{top:.19,right:.108,bottom:.205,left:.108},socketContract:{childContent:true},layoutCapabilities:["SINGLE","STACK-2","STACK-3","GRID-2"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:300},stateContract:["default","disabled"],nestingCapabilities:{canContainChildren:true,acceptedChildKinds:["action","identity","divider","footer"]},expansionContract:arcEmberStageExpansion,lifecycle:"production",sortOrder:310,tags:["container-capable","stage","background","phone-safe","edge-preserving","content-driven"]}),
  arcAsset({id:"master/arc-ember/footer/bottom-stop/v1",label:"Bottom Stop / Footer",subgroup:"frames-stages",assetKind:"footer",role:"bottom-stop",variant:"plate",sourceAsset:`${ARC_ROOT}/footer/01_bottom-stop-footer-plate.png`,sourceSha256:"d078e11205bb3645c60a1b4e119718c03d41d57d24359dce992de0f732c30255",width:1928,height:816,glowPadding:full,safeInsets:full,socketContract:{},layoutCapabilities:["SINGLE"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:280},stateContract:["default","disabled"],nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},lifecycle:"candidate",sortOrder:400,tags:["footer","bottom-stop","non-action","phone-safe"]}),

  signatureV1Asset({id:"master/signature-system-v1/action/circle-icon/v1",sourceNumber:4,label:"Circle Icon Action",subgroup:"actions",assetKind:"action",role:"circle-icon",variant:"round",sourceAsset:`${SIGNATURE_V1_ROOT}/01_actions/production/04_circle-icon-action.png`,sourceSha256:"aa1fe68e54d94318e58bbccbdbb61233ff5bc374774b592608c9c3fd9794fe49",width:1254,height:1254,glowPadding:full,safeInsets:{top:.27,right:.27,bottom:.27,left:.27},socketContract:{identity:true,action:true},layoutCapabilities:["SINGLE","GRID-2","ICON-ROW"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:88},stateContract:states,nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},lifecycle:"production",sortOrder:1010,tags:["action","circle","icon","phone-safe"]}),
  signatureV1Asset({id:"master/signature-system-v1/action/badge-shield/v1",sourceNumber:6,label:"Badge / Shield Action",subgroup:"actions",assetKind:"action",role:"badge-shield",variant:"wide",sourceAsset:`${SIGNATURE_V1_ROOT}/01_actions/production/06_badge-shield-action.png`,sourceSha256:"5698875ae3c17e1aae41ed63e69294b8ba2d166d1abc8424c947569fda831eb8",width:1536,height:1024,glowPadding:full,safeInsets:{top:.28,right:.14,bottom:.28,left:.38},socketContract:{identity:true,title:true,description:true,action:true},layoutCapabilities:["SINGLE","STACK-2","STACK-3","GRID-2"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:260},stateContract:states,nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},lifecycle:"production",sortOrder:1020,tags:["action","badge","shield","identity","phone-safe"]}),
  signatureV1Asset({id:"master/signature-system-v1/action/portrait-team/v1",sourceNumber:10,label:"Portrait Anchor / Extended Team Action",subgroup:"actions",assetKind:"action",role:"portrait-team",variant:"wide",sourceAsset:`${SIGNATURE_V1_ROOT}/01_actions/production/10_portrait-anchor-extended-team-action.png`,sourceSha256:"4bc9d8d8e57270b18ad828590eb34e584c512588eb6a8f0c7cebe401839e2d39",width:1942,height:809,glowPadding:full,safeInsets:{top:.25,right:.16,bottom:.24,left:.43},socketContract:{identity:true,title:true,description:true,action:true},layoutCapabilities:["SINGLE","STACK-2","STACK-3"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:280},stateContract:states,nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},lifecycle:"production",sortOrder:1030,tags:["action","portrait","team","identity","phone-safe"]}),

  ...[
    ["standard-medallion","Standard Medallion","07_standard-medallion.png","838bc61447da6c294b5e8a16de3b7ce3af9ae0c3e573bb8ef0f4012065bfc9e9",1536,1024,7],
    ["brand-logo-medallion","Brand / Logo Medallion","08_brand-logo-medallion.png","bc8ceebb62156f327af19967fa1c05b301f924c7e5dc9d0dd7a36605e653f923",1254,1254,8],
    ["round-photo-team","Round Photo / Team Anchor","09_round-photo-team-anchor.png","53ec9ae82734f8c82ee4655dfad775f337b73066fda4ccbfc9e1987204d78d65",1254,1254,9],
  ].map(([role,label,file,sha,width,height,number],index)=>signatureV1Asset({id:`master/signature-system-v1/identity/${role}/v1`,sourceNumber:Number(number),label:String(label),subgroup:"identity",assetKind:"identity",role:String(role),variant:"standard",sourceAsset:`${SIGNATURE_V1_ROOT}/02_identity/production/${file}`,sourceSha256:String(sha),width:Number(width),height:Number(height),glowPadding:full,safeInsets:{top:.2,right:.2,bottom:.2,left:.2},socketContract:{identity:true},layoutCapabilities:["SINGLE","GRID-2","ICON-ROW"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:72},stateContract:["default","disabled"],nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},lifecycle:"production",sortOrder:1100+index,tags:["identity","logo","icon","portrait","phone-safe"]})),

  ...[
    ["dark-plaque","Dark Plaque Stage","11_dark-plaque-stage.png","7e2756d98de5f08ed096117c51e6b2f77366d6049b546198fbf91c319ff5bfe0",1672,941,11,"production-ready"],
    ["recessed-well","Recessed Well Stage","12_recessed-well-stage.png","f1ef377fcceafcf3ada012455720fb82eb9d4fa8143a5981816af6976f085683",1881,836,12,"production-ready"],
    ["smoked-glass","Smoked Glass Stage","13_smoked-glass-stage.png","02db50e8daafd40674f8fbf312202ab0047c8a72306cc086193cd4bc487c3a4d",2048,768,13,"production-ready"],
    ["electric-rift","Electric Rift Field Stage","14_electric-rift-field-stage.png","acf9dd13d1856518d1b58ffda4624a8c641af3310452e31628a994ca28bdb136",2048,682,14,"production-ready-with-derived-control-needed"],
    ["copper-panel","Copper Panel Stage","15_copper-panel-stage.png","5d8a8d419bc3bfc55bba55a37b38756f1b92e55f602d71024c1bf25b140c3b6c",2048,682,15,"production-ready"],
    ["minimal-soft-field","Minimal Soft Field Stage","16_minimal-soft-field-stage.png","bf11f52312260b61e0d35ca67030633f65c73914cf92db7d7967a8c46d8c47f4",2048,682,16,"production-ready"],
  ].map(([role,label,file,sha,width,height,number,readiness],index)=>signatureV1Asset({id:`master/signature-system-v1/stage/${role}/v1`,sourceNumber:Number(number),label:String(label),subgroup:"frames-stages",assetKind:"stage",role:String(role),variant:"proportional-stage",sourceAsset:`${SIGNATURE_V1_ROOT}/03_frames-stages/production/${file}`,sourceSha256:String(sha),width:Number(width),height:Number(height),glowPadding:full,safeInsets:{top:.22,right:.12,bottom:.22,left:.12},socketContract:{childContent:true},layoutCapabilities:["SINGLE","STACK-2","STACK-3","GRID-2"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:280},stateContract:["default","disabled"],nestingCapabilities:{canContainChildren:true,acceptedChildKinds:["action","identity","divider","micro-part"]},lifecycle:"production",sourceReadiness:readiness as SignatureAssetDefinition["sourceReadiness"],sortOrder:1200+index,tags:["stage","container-capable","proportional-only","phone-safe",String(role)==="electric-rift"?"energy-control-pending":"fixed-energy"]})),

  ...[
    ["botanical-elegant","Botanical / Elegant","17_botanical-elegant-divider.png","4b4ee2753bf85e27338f3fa761103a1125e066432252f74815135e14309ef115",17,"production-ready"],
    ["geometric-clean","Geometric / Clean","18_geometric-clean-divider.png","43e3de91c5030cd42999c6395c650810ae17473bf78c4a27878b6643e4e5ab2d",18,"production-ready"],
    ["industrial-masculine","Industrial / Masculine","19_industrial-masculine-divider.png","d375c0c751a49c95f1e55e75be5aa0abeffa0273e49b59b08c1d6d2fefb809ab",19,"production-ready"],
    ["electric-energy","Electric / Energy","20_electric-energy-divider.png","0870c6073be55b0f6b81122fb0713d787923ef02c07f4fa329d6ffff08553ad5",20,"production-ready-with-derived-control-needed"],
    ["minimal-quiet","Minimal / Quiet","21_minimal-quiet-divider.png","6838a819aa46baa399bcc9fd514c74eb332827fb9c8763083d9bdd95454c576d",21,"production-ready"],
    ["heritage-classic","Heritage / Classic","22_heritage-classic-divider.png","d22b26a1feb66e5b869817d81eefb42b3ff1489ab160f69abc1a7402525c6498",22,"production-ready"],
  ].map(([role,label,file,sha,number,readiness],index)=>signatureV1Asset({id:`master/signature-system-v1/divider/${role}/v1`,sourceNumber:Number(number),label:String(label),subgroup:"dividers",assetKind:"divider",role:String(role),variant:"transparent-exterior",sourceAsset:`${SIGNATURE_V1_ROOT}/04_dividers/production/${file}`,sourceSha256:String(sha),width:2048,height:682,glowPadding:full,safeInsets:full,socketContract:{},layoutCapabilities:["SINGLE"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:260},stateContract:["default","disabled"],nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},lifecycle:"production",sourceReadiness:readiness as SignatureAssetDefinition["sourceReadiness"],sortOrder:1300+index,tags:["divider","transparent-exterior","phone-safe",String(role)==="electric-energy"?"energy-control-pending":"fixed-energy"]})),

  signatureV1Asset({id:"master/signature-system-v1/micro-part/status-chip/v1",sourceNumber:23,label:"Small Status Chip",subgroup:"micro-parts",assetKind:"micro-part",role:"status-chip",variant:"wide",sourceAsset:`${SIGNATURE_V1_ROOT}/05_micro-parts/production/23_small-status-chip.png`,sourceSha256:"cede366d5495412399cca4b3feb57a3bc46238439af8916e367cdf4481c7fd4a",width:2048,height:682,glowPadding:full,safeInsets:{top:.26,right:.2,bottom:.26,left:.2},socketContract:{statusText:true},layoutCapabilities:["SINGLE","GROUPED-COMPACT"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:120},stateContract:["default","disabled"],nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},lifecycle:"production",sortOrder:1400,tags:["micro-part","status","live-text","phone-safe"]}),
  signatureV1Asset({id:"master/signature-system-v1/micro-part/rating-star/v1",sourceNumber:25,label:"Rating / Star Utility",subgroup:"micro-parts",assetKind:"micro-part",role:"rating-star",variant:"single-token",sourceAsset:`${SIGNATURE_V1_ROOT}/05_micro-parts/production/25_rating-star-utility.png`,sourceSha256:"f152dd4e89226aad96904f42ccf67965797ae0c3f0b73a2a4996bc909620f082",width:1254,height:1254,glowPadding:full,safeInsets:full,socketContract:{rating:true},layoutCapabilities:["SINGLE","ICON-ROW"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:36},stateContract:["default","disabled"],nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},lifecycle:"production",sourceReadiness:"production-ready-with-state-treatment",sortOrder:1410,tags:["micro-part","rating","repeat-independent","phone-safe"]}),
  signatureV1Asset({id:"master/signature-system-v1/micro-part/alert-token/v1",sourceNumber:26,label:"Small Badge / Alert Token",subgroup:"micro-parts",assetKind:"micro-part",role:"alert-token",variant:"wide",sourceAsset:`${SIGNATURE_V1_ROOT}/05_micro-parts/production/26_small-badge-alert-token.png`,sourceSha256:"6546de40153eff2548c02b7442c0894e329b6950d2182fa0c4dc320434a6da5e",width:2048,height:682,glowPadding:full,safeInsets:{top:.25,right:.2,bottom:.25,left:.2},socketContract:{statusText:true,icon:true},layoutCapabilities:["SINGLE","GROUPED-COMPACT"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:120},stateContract:["default","disabled"],nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},lifecycle:"production",sortOrder:1420,tags:["micro-part","alert","live-text","live-icon","phone-safe"]}),
  signatureV1Asset({id:"master/signature-system-v1/micro-part/icon-row-token/v1",sourceNumber:27,label:"Small Icon Row Token",subgroup:"micro-parts",assetKind:"micro-part",role:"icon-row-token",variant:"single-token",sourceAsset:`${SIGNATURE_V1_ROOT}/05_micro-parts/production/27_small-icon-row-token.png`,sourceSha256:"c79902866821ba05de9766d68bb16df93000c1fc011b9baee70c9ec03d3ccefd",width:1289,height:1220,glowPadding:full,safeInsets:{top:.24,right:.24,bottom:.24,left:.24},socketContract:{icon:true},layoutCapabilities:["SINGLE","ICON-ROW"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:44},stateContract:["default","disabled"],nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},lifecycle:"production",sortOrder:1430,tags:["micro-part","icon","repeat-independent","phone-safe"]}),

  ...[
    ["primary-pill","Primary Action Pill / Capsule","01_primary-action-pill-capsule.png","06bf38792e2b4f9df000dfe2bfd65bf64f2d1941679e1bbf860e28e4e992559f",1],
    ["secondary-pill","Secondary Action Pill / Capsule","02_secondary-action-pill-capsule.png","d858944e32a8a40133e5de63e8cde2ffd2c3a255e71af769b7cf720db3900ec0",2],
    ["rounded-rectangle","Rounded Rectangle Action","03_rounded-rectangle-action.png","d9c5f1744e236aeba51b2a98aebd4da2b5e0d53b0354974d30588c500a24c973",3],
    ["plaque-panel","Plaque / Panel Action","05_plaque-panel-action.png","bd1fdf1091e5ad27922038d0ebf0b1e43c93775493e649d70f39a95554feb72e",5],
  ].map(([role,label,file,sha,number],index)=>signatureV1Asset({id:`reference/signature-system-v1/action/${role}/v1`,sourceNumber:Number(number),label:String(label),subgroup:"actions",assetKind:"action",role:String(role),variant:"visual-authority",sourceAsset:`${SIGNATURE_V1_ROOT}/01_actions/visual-authority/${file}`,sourceSha256:String(sha),width:2048,height:682,glowPadding:full,safeInsets:full,socketContract:{},layoutCapabilities:[],responsiveContract:{proportional:true,phoneSafe:false},stateContract:["default"],nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},lifecycle:"reference",referenceOnly:true,sourceReadiness:"visual-authority-needs-blank-shell",blockerNote:"Baked approval copy/identity requires a matching blank pristine shell before editable production use.",sortOrder:1900+index,tags:["visual-authority","blocked","needs-blank-shell"]})),
  signatureV1Asset({id:"reference/signature-system-v1/micro-part/toggle/v1",sourceNumber:24,label:"Small Toggle / On-Off",subgroup:"micro-parts",assetKind:"micro-part",role:"toggle",variant:"visual-authority",sourceAsset:`${SIGNATURE_V1_ROOT}/05_micro-parts/visual-authority/24_small-toggle-on-off.png`,sourceSha256:"e4b01b4b0270fb269491259ea5dee68c3e1247556384a7d7f339d4f95fac3043",width:2048,height:682,glowPadding:full,safeInsets:full,socketContract:{},layoutCapabilities:[],responsiveContract:{proportional:true,phoneSafe:false},stateContract:["default"],nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},lifecycle:"reference",referenceOnly:true,sourceReadiness:"visual-authority-needs-state-implementation",blockerNote:"Composite knob and shell require approved state masters or a certified non-destructive split.",sortOrder:1950,tags:["visual-authority","blocked","needs-state-implementation"]}),
  ...CABINET_NOIR_ASSETS,
] as const;

export const SIGNATURE_SUBGROUPS: readonly { id: SignatureSubgroup; label: string }[] = [
  { id:"actions",label:"Actions" },
  { id:"identity",label:"Identity" },
  { id:"frames-stages",label:"Frames & Stages" },
  { id:"dividers",label:"Dividers" },
  { id:"micro-parts",label:"Micro Parts" },
];

export function listSignatureAssets(filters: { familyId?: string; subgroup?: SignatureSubgroup; includeReference?: boolean } = {}) {
  return SIGNATURE_ASSETS.filter((item)=> (!filters.familyId || item.familyId===filters.familyId) && (!filters.subgroup || item.subgroup===filters.subgroup) && (filters.includeReference || !item.referenceOnly)).sort((a,b)=>a.sortOrder-b.sortOrder);
}
export function getSignatureAsset(id: unknown) { return typeof id === "string" ? SIGNATURE_ASSETS.find((item)=>item.id===id) : undefined; }
export function isSignatureAssetProps(props: Record<string, unknown>) { return Boolean(getSignatureAsset(props.signatureAssetId)); }

export function signatureAssetInsertionFrame(asset: SignatureAssetDefinition, pageHeightPx = 520) {
  const width = asset.assetKind === "divider" || asset.assetKind === "stage" || asset.assetKind === "frame" || asset.assetKind === "footer"
    ? .88
    : asset.assetKind === "action"
      ? asset.role === "circle-icon" ? .26 : .78
      : asset.assetKind === "identity"
        ? .24
        : asset.role === "status-chip" || asset.role === "alert-token" ? .38 : .13;
  return { width, height: Math.max(.018, width * 390 / asset.aspectRatio / Math.max(320, pageHeightPx)) };
}

const kindMap: Record<SignatureAssetKind, CardElementKind> = { action:"button", identity:"image", divider:"divider", frame:"composition", stage:"composition", footer:"decorative_graphic", "micro-part":"image" };
export function signatureAssetInsert(asset: SignatureAssetDefinition) {
  const common: Record<string, unknown> = { signatureAssetId:asset.id, signatureFamilyId:asset.familyId, aspectLocked:true, accessibleLabel:asset.label, opacity:1 };
  if (asset.assetKind === "action") Object.assign(common,{ elementKind:"button", label:asset.label, eyebrow:asset.socketContract.eyebrow?"SIGNATURE ACTION":"", description:asset.socketContract.description?"Edit live supporting text":"", showLabel:Boolean(asset.socketContract.title),showDescription:Boolean(asset.socketContract.description),showIcon:Boolean(asset.socketContract.identity),iconMediaUrl:asset.socketContract.identity?"/tap-connect-mark.png":"",vpArcEmberActionCue:asset.socketContract.cue?"arrow":"none",actionType:"website",href:"",disabled:false });
  if (asset.assetKind === "identity") Object.assign(common,{ elementKind:"image",src:"/tap-connect-mark.png",imageUrl:"/tap-connect-mark.png",fit:"contain",alt:asset.label });
  if (asset.assetKind === "divider") Object.assign(common,{ elementKind:"divider",dividerCenterMediaUrl:asset.socketContract.dividerCenter?"/tap-connect-mark.png":"" });
  if (asset.assetKind === "frame" || asset.assetKind === "stage") Object.assign(common,{ elementKind:"composition",componentKind:"container",layout:asset.expansionContract?"stack":"free",resizePolicy:asset.expansionContract?"fit-content":"fixed",canContainChildren:true,childIds:[],gap:asset.expansionContract?.childGapPx ?? 12,signatureStageFlow:asset.expansionContract?.flow });
  if (asset.assetKind === "footer") Object.assign(common,{ elementKind:"decorative_graphic",decorative:true,actionType:"none" });
  if (asset.normalizedContract?.liveContentContract?.startsWith("informationalLine@")) Object.assign(common,{ informationalText:"",decorative:false,actionType:"none",accessibleLabel:asset.label });
  if (asset.assetKind === "micro-part") {
    Object.assign(common,{ elementKind:"image",src:asset.sourceAsset,fit:"contain",alt:asset.label,disabled:false });
    if (asset.socketContract.statusText) Object.assign(common,{elementKind:"button",label:asset.role === "alert-token"?"Alert":"Available",statusText:asset.role === "alert-token"?"Alert":"Available",showLabel:true,showDescription:false,actionType:"none"});
    if (asset.socketContract.icon) Object.assign(common,{imageUrl:"/tap-connect-mark.png",iconMediaUrl:"/tap-connect-mark.png"});
  }
  const kind = asset.assetKind === "micro-part" && asset.socketContract.statusText ? "button" : kindMap[asset.assetKind];
  return { level:"element" as const, kind, initialProps:common };
}
