import type { CardElementKind } from "@/lib/fusion/card/composer-model";
import type { SignatureAssetDefinition, SignatureAssetKind, SignatureFamilyDefinition, SignatureSubgroup } from "./types";

export const ARC_EMBER_SIGNATURE_FAMILY_ID = "family_arc_ember_signature";
const ROOT = "/visual-parts/signature/arc-ember/source";
const LIVE_SHELL = `${ROOT}/actions/00_pristine-blank-shell.png`;
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
] as const;

function asset(input: Omit<SignatureAssetDefinition, "familyId" | "aspectRatio" | "expressionTier" | "referenceOnly" | "tintCapabilities"> & { referenceOnly?: boolean; tintCapabilities?: readonly string[] }): SignatureAssetDefinition {
  return {
    ...input,
    familyId: ARC_EMBER_SIGNATURE_FAMILY_ID,
    aspectRatio: input.width / input.height,
    expressionTier: "signature",
    referenceOnly: input.referenceOnly ?? false,
    tintCapabilities: input.tintCapabilities ?? [],
  };
}

export const SIGNATURE_ASSETS: readonly SignatureAssetDefinition[] = [
  asset({ id:"master/arc-ember/action/hero/v1", label:"Hero / Primary", subgroup:"actions", assetKind:"action", role:"hero-primary", variant:"hero", sourceAsset:"/visual-parts/arc-ember/pristine-master-button.png", sourceSha256:"b9e0d71d02bcb77460d29fbdbad9390bf493a96bd67d8c2350096ef52669df48", width:2172,height:724,glowPadding:actionInsets,safeInsets:actionInsets,socketContract:actionSockets,layoutCapabilities:["SINGLE"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:280},stateContract:states,nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},lifecycle:"candidate",sortOrder:10,tags:["hero","primary","identity","phone-safe"] }),
  asset({ id:"master/arc-ember/action/social/v1", label:"Social", subgroup:"actions", assetKind:"action", role:"social", variant:"standard", sourceAsset:"/visual-parts/arc-ember/pristine-master-button.png", sourceSha256:"b9e0d71d02bcb77460d29fbdbad9390bf493a96bd67d8c2350096ef52669df48", width:2172,height:724,glowPadding:actionInsets,safeInsets:actionInsets,socketContract:actionSockets,layoutCapabilities:["SINGLE","GRID-2"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:280},stateContract:states,nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},lifecycle:"candidate",sortOrder:20,tags:["social","identity","phone-safe"] }),
  asset({ id:"master/arc-ember/action/utility/v1", label:"Utility", subgroup:"actions", assetKind:"action", role:"utility", variant:"save-contact", sourceAsset:`${ROOT}/actions/03_utility-save-contact.png`, liveShellAsset:LIVE_SHELL, sourceSha256:"c052bf5529540a84c6b188ee5df57f2c8c09d6e1a0c6c8339b5e5dbb9018c74a", width:2172,height:724,glowPadding:actionInsets,safeInsets:actionInsets,socketContract:actionSockets,layoutCapabilities:["SINGLE","GRID-2"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:280},stateContract:states,nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},lifecycle:"candidate",sortOrder:30,tags:["utility","contact","identity","phone-safe"] }),
  asset({ id:"master/arc-ember/action/team-about/v1", label:"Team / About", subgroup:"actions", assetKind:"action", role:"team-about", variant:"wide", sourceAsset:`${ROOT}/actions/04_team-about.png`, liveShellAsset:LIVE_SHELL, sourceSha256:"12a28d0cf658540df57207fe2a14d3c488f0966e53c776e21e6d89015e70459a", width:1672,height:941,glowPadding:actionInsets,safeInsets:actionInsets,socketContract:actionSockets,layoutCapabilities:["SINGLE"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:280},stateContract:states,nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},lifecycle:"candidate",sortOrder:40,tags:["team","about","identity","phone-safe"] }),
  asset({ id:"master/arc-ember/action/compact/v1", label:"Compact", subgroup:"actions", assetKind:"action", role:"compact", variant:"condensed", sourceAsset:`${ROOT}/actions/05_compact-condensed.png`, liveShellAsset:LIVE_SHELL, sourceSha256:"059f562f2ed389e9c572e3c54ed3cf1a1592bc2422e481d912ee99bf85671e2f", width:2172,height:724,glowPadding:actionInsets,safeInsets:actionInsets,socketContract:actionSockets,layoutCapabilities:["SINGLE","GROUPED-COMPACT"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:240},stateContract:states,nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},lifecycle:"candidate",sortOrder:50,tags:["compact","condensed","phone-safe"] }),
  asset({ id:"master/arc-ember/action/stack-row/v1", label:"Stack Row", subgroup:"actions", assetKind:"action", role:"stack-row", variant:"call", sourceAsset:`${ROOT}/actions/06_double-stack-row_call.png`, liveShellAsset:LIVE_SHELL, sourceSha256:"c2ce8ae359d2de55c9e5a9cb468b2a074f291d145c0e302865c21ba4938b2d9e", width:2048,height:768,glowPadding:actionInsets,safeInsets:actionInsets,socketContract:actionSockets,layoutCapabilities:["STACK-2","STACK-3"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:260},stateContract:states,nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},lifecycle:"candidate",sortOrder:60,tags:["stack-compatible","independent-action","phone-safe"] }),
  ...[
    ["logo-medallion","Logo Medallion","01_logo-medallion.png","19ebde77d0fa532e8d16bfffa5888f88f45fcb14b7213594862df5d44dae3edd"],
    ["open-lens","Open Lens","02_open-lens.png","8cb5e9fc86a8fea32b4358f58b94daac6d4494cfc30f9ebd80545729803272a8"],
    ["inset-plate","Inset Plate","03_inset-plate.png","1207ddb3f919870909e2c8607d389aa714c863f77fba2fd2e58c8cb53069ee15"],
    ["framed-icon","Framed Icon Insert","04_framed-icon-insert_blank.png","fc71157a492b844d410f5d423701a894d38a1dff523d64a7182ecae896f82c84"],
  ].map(([role,label,file,sha],index)=>asset({id:`master/arc-ember/identity/${role}/v1`,label,subgroup:"identity",assetKind:"identity",role,variant:"standard",sourceAsset:`${ROOT}/identity/${file}`,sourceSha256:sha,width:1254,height:1254,glowPadding:full,safeInsets:{top:.2,right:.2,bottom:.2,left:.2},socketContract:{identity:true},layoutCapabilities:["SINGLE"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:72},stateContract:["default","disabled"],nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},lifecycle:"candidate",sortOrder:100+index,tags:["identity","logo","icon","portrait","phone-safe"]})),
  ...[
    ["diamond","Diamond Center","01_diamond-center.png","f3d20fffe31d5056a5a35ede0be33e8c42f24825256f55840fa66add35c8943c",false],
    ["logo-center","Logo / Medallion Center","02_logo-medallion-center.png","7b64d21229f679be65a6fc910fa2479d505c709173df755e2941270760efd34a",true],
    ["plain","Plain / No Center","03_plain-no-center.png","3b3f87f5ee44c1562c043891930918174a1bb241f829397529859eafd8e3ad85",false],
    ["single-rod","Single Electric Rod","04_single-electric-rod.png","f5308026129f7f44c00a42e8e0082ffe21beae05071adad8766c8f7271bc18d4",false],
    ["paired-rods","Paired Rods","05-double-electic-rod.png","f1467a49addf1453fee647b3b48b2da199d65e97d00689ebd6780dd9fb0b7c73",false],
  ].map(([role,label,file,sha,center],index)=>asset({id:`master/arc-ember/divider/${role}/v1`,label:String(label),subgroup:"dividers",assetKind:"divider",role:String(role),variant:"transparent-exterior",sourceAsset:`${ROOT}/dividers/${file}`,sourceSha256:String(sha),width:2172,height:724,glowPadding:full,safeInsets:full,socketContract:{dividerCenter:Boolean(center)},layoutCapabilities:["SINGLE"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:260},stateContract:["default","disabled"],nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},lifecycle:"production",sortOrder:200+index,tags:["divider","electric-blue","transparent-exterior","phone-safe",center?"live-center":"no-center"]})),
  asset({id:"master/arc-ember/frame/container-wide/v1",label:"Container / Section Frame",subgroup:"frames-stages",assetKind:"frame",role:"container-wide",variant:"wide",sourceAsset:`${ROOT}/frames-stages/01_container-section-frame_wide.png`,sourceSha256:"ee6a18e01586decbd490065a8cb83b2dfe3fe38066b7e33e10a6aaf2adfcf2e0",width:1672,height:941,glowPadding:full,safeInsets:{top:.12,right:.1,bottom:.14,left:.1},socketContract:{childContent:true},layoutCapabilities:["SINGLE","STACK-2","STACK-3","GRID-2"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:300},stateContract:["default","disabled"],nestingCapabilities:{canContainChildren:true,acceptedChildKinds:["action","identity","divider","footer"]},lifecycle:"candidate",sortOrder:300,tags:["container-capable","section","background","phone-safe"]}),
  asset({id:"master/arc-ember/stage/surface/v1",label:"Surface / Stage",subgroup:"frames-stages",assetKind:"stage",role:"surface",variant:"expandable",sourceAsset:`${ROOT}/frames-stages/02_surface-stage-frame.png`,sourceSha256:"8bc4dfa4d7c8a69bede0ad03dae8bd88e84301f695892b3acc143a28d1b64c29",width:1672,height:941,glowPadding:full,safeInsets:{top:.19,right:.108,bottom:.205,left:.108},socketContract:{childContent:true},layoutCapabilities:["SINGLE","STACK-2","STACK-3","GRID-2"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:300},stateContract:["default","disabled"],nestingCapabilities:{canContainChildren:true,acceptedChildKinds:["action","identity","divider","footer"]},expansionContract:arcEmberStageExpansion,lifecycle:"production",sortOrder:310,tags:["container-capable","stage","background","phone-safe","edge-preserving","content-driven"]}),
  asset({id:"master/arc-ember/footer/bottom-stop/v1",label:"Bottom Stop / Footer",subgroup:"footer",assetKind:"footer",role:"bottom-stop",variant:"plate",sourceAsset:`${ROOT}/footer/01_bottom-stop-footer-plate.png`,sourceSha256:"d078e11205bb3645c60a1b4e119718c03d41d57d24359dce992de0f732c30255",width:1928,height:816,glowPadding:full,safeInsets:full,socketContract:{},layoutCapabilities:["SINGLE"],responsiveContract:{proportional:true,phoneSafe:true,minRenderedWidthPx:280},stateContract:["default","disabled"],nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},lifecycle:"candidate",sortOrder:400,tags:["footer","bottom-stop","non-action","phone-safe"]}),
] as const;

export const SIGNATURE_SUBGROUPS: readonly { id: SignatureSubgroup; label: string }[] = [
  { id:"actions",label:"Actions" }, { id:"identity",label:"Identity" }, { id:"dividers",label:"Dividers" }, { id:"frames-stages",label:"Frames & Stages" }, { id:"footer",label:"Footer" },
];

export function listSignatureAssets(filters: { familyId?: string; subgroup?: SignatureSubgroup; includeReference?: boolean } = {}) {
  return SIGNATURE_ASSETS.filter((item)=> (!filters.familyId || item.familyId===filters.familyId) && (!filters.subgroup || item.subgroup===filters.subgroup) && (filters.includeReference || !item.referenceOnly)).sort((a,b)=>a.sortOrder-b.sortOrder);
}
export function getSignatureAsset(id: unknown) { return typeof id === "string" ? SIGNATURE_ASSETS.find((item)=>item.id===id) : undefined; }
export function isSignatureAssetProps(props: Record<string, unknown>) { return Boolean(getSignatureAsset(props.signatureAssetId)); }

const kindMap: Record<SignatureAssetKind, CardElementKind> = { action:"button", identity:"image", divider:"divider", frame:"composition", stage:"composition", footer:"decorative_graphic" };
export function signatureAssetInsert(asset: SignatureAssetDefinition) {
  const common: Record<string, unknown> = { signatureAssetId:asset.id, signatureFamilyId:asset.familyId, aspectLocked:true, accessibleLabel:asset.label, opacity:1 };
  if (asset.assetKind === "action") Object.assign(common,{ elementKind:"button", label:asset.label, eyebrow:"SIGNATURE ACTION", description:"Edit live supporting text", showLabel:true,showDescription:true,showIcon:true,iconMediaUrl:"/tap-connect-mark.png",vpArcEmberActionCue:"arrow",actionType:"website",href:"",disabled:false });
  if (asset.assetKind === "identity") Object.assign(common,{ elementKind:"image",src:"/tap-connect-mark.png",imageUrl:"/tap-connect-mark.png",fit:"contain",alt:asset.label });
  if (asset.assetKind === "divider") Object.assign(common,{ elementKind:"divider",dividerCenterMediaUrl:asset.socketContract.dividerCenter?"/tap-connect-mark.png":"" });
  if (asset.assetKind === "frame" || asset.assetKind === "stage") Object.assign(common,{ elementKind:"composition",componentKind:"container",layout:asset.assetKind === "stage"?"stack":"free",resizePolicy:asset.assetKind === "stage"?"fit-content":"reflow",canContainChildren:true,childIds:[],gap:asset.expansionContract?.childGapPx ?? 12,signatureStageFlow:asset.expansionContract?.flow });
  if (asset.assetKind === "footer") Object.assign(common,{ elementKind:"decorative_graphic",decorative:true,actionType:"none" });
  return { level:"element" as const, kind:kindMap[asset.assetKind], initialProps:common };
}
