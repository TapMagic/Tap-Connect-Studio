import {
  APPROVED_SIGNATURE_CONTRACT_IDS,
  type SignatureAssetDefinition,
  type SignatureComponentContract,
  type SignatureFamilyDefinition,
  type SignatureNormalizedRect,
  type SignatureSide,
} from "./types";
import { SIGNATURE_ASSEMBLY_CONTRACT_IDS, type SignatureAssemblyRecipe, type SignaturePresentationContract } from "./layout-recipes";
import type { CuratedFamilyVisualAcceptanceContract, CuratedWholeObjectCheck } from "./visual-acceptance";

export const EVERENCORE_LOVE_AND_THEFT_FAMILY_ID = "everencore-love-and-theft";
export const EVERENCORE_LOVE_AND_THEFT_VERSION = "1.0.0" as const;
export const EVERENCORE_LOVE_AND_THEFT_ROOT = "/visual-parts/signature/everencore/love-and-theft";
export const EVERENCORE_LOVE_AND_THEFT_V1_ROOT = `${EVERENCORE_LOVE_AND_THEFT_ROOT}/v1`;
export const EVERENCORE_LOVE_AND_THEFT_MANIFEST = `${EVERENCORE_LOVE_AND_THEFT_V1_ROOT}/asset-intake-manifest.json`;
export const EVERENCORE_LOVE_AND_THEFT_GEOMETRY = `${EVERENCORE_LOVE_AND_THEFT_V1_ROOT}/geometry.json`;
export const EVERENCORE_LOVE_AND_THEFT_FINISH = "everencore-aged-brass-dark-glass@1.0.0";
export const EVERENCORE_LOVE_AND_THEFT_ENTITLEMENT_KEY = "signature.family.everencore_love_and_theft" as const;

const BAR_MASTER_ROOT = `${EVERENCORE_LOVE_AND_THEFT_V1_ROOT}/02-action-bars`;
const BAR_MASTER_VARIANTS = {
  smoky_black_glass:{sourceAsset:`${BAR_MASTER_ROOT}/EE-LT-BAR-001_smoky-black-glass.png`,sourceSha256:"c201e43b7142e6b2bd043cba2684f2b8a87b29ddd1fc90338568c9e2c763b601"},
  burgundy_plum_glass:{sourceAsset:`${BAR_MASTER_ROOT}/EE-LT-BAR-002_burgundy-plum.png`,sourceSha256:"db85ea476b6d69c1202b904c9b175ec184e3c5aff7e970838db04c16acc5af51"},
  frosted_charcoal:{sourceAsset:`${BAR_MASTER_ROOT}/EE-LT-BAR-003_frosted-charcoal.png`,sourceSha256:"a17a7e04b7c736970378265fa03fdb8700c49384a9d44bf7b0792e6af28148ba"},
  deep_blue_glass:{sourceAsset:`${BAR_MASTER_ROOT}/EE-LT-BAR-004_deep-blue-glass.png`,sourceSha256:"fbf82e28a9c50766cfabc2037aaf1b0539198ca52133e2054b8c0d09be11fb85"},
} as const;
const PICK_MASTER_ROOT = `${EVERENCORE_LOVE_AND_THEFT_V1_ROOT}/03-pick-plugs`;
export const EVERENCORE_LOVE_AND_THEFT_BLANK_PICK_SOURCE = `${PICK_MASTER_ROOT}/EE-LT-PICK-000_blank.png`;
export const EVERENCORE_LOVE_AND_THEFT_PICK_SEMANTIC_VARIANTS = {
  "simple-icons:spotify":{sourceAsset:`${PICK_MASTER_ROOT}/EE-LT-PICK-002_spotify.png`,sourceSha256:"f0bcee3bd22e4658db0541d1896280262b6e12acb9b292775cb64cbf80831cfa"},
  "simple-icons:apple-music":{sourceAsset:`${PICK_MASTER_ROOT}/EE-LT-PICK-003_music-note.png`,sourceSha256:"bc7d0e4ed58bbd77dee5e47b4978b017c70e31c331210ab34a9c75ea3ccd7e50"},
  "simple-icons:youtube":{sourceAsset:`${PICK_MASTER_ROOT}/EE-LT-PICK-004_play.png`,sourceSha256:"2188d3052fa6c83441f8fba4869cb101f0c8a30105ebb107ab1e836223c20b69"},
  "simple-icons:instagram":{sourceAsset:`${PICK_MASTER_ROOT}/EE-LT-PICK-005_instagram.png`,sourceSha256:"c4af93f0a6d241cded5b369ea0aac9491a469eb41a757079d1db11fc8a75df0d"},
  "simple-icons:facebook":{sourceAsset:`${PICK_MASTER_ROOT}/EE-LT-PICK-006_facebook.png`,sourceSha256:"60b75ee4b25b743fb4d97453cee3d0c06beffae99484623acaaff81bed902be7"},
  "simple-icons:bandsintown":{sourceAsset:`${PICK_MASTER_ROOT}/EE-LT-PICK-007_bandsintown.png`,sourceSha256:"fcc5b7fa569706ff684bf346d837d2b15e110cb948d01a6b93e6ae7f067d7a5b"},
  "lucide:microphone":{sourceAsset:`${PICK_MASTER_ROOT}/EE-LT-PICK-008_microphone.png`,sourceSha256:"b480cf75d94a4107b09fa23b6b2cc9bfe1215a8abf94bc65fed64a7540d5f465"},
  "lucide:lock":{sourceAsset:`${PICK_MASTER_ROOT}/EE-LT-PICK-009_lock.png`,sourceSha256:"d56efb5fb5a310c4d7b836ae73fb02c67aca0625394bd30b746cd43f7bd1393f"},
  "lucide:calendar-days":{sourceAsset:`${PICK_MASTER_ROOT}/EE-LT-PICK-010_calendar.png`,sourceSha256:"b85c493ce0413e2acfacf2c2c9eb08d62160578088df8cdd525fd1de2fb85617"},
  "lucide:shirt":{sourceAsset:`${PICK_MASTER_ROOT}/EE-LT-PICK-011_merch.png`,sourceSha256:"5961ad223428a93a704dd04617fdec1e51cd1c8f9d4149a297a9905713fda4b1"},
  "lucide:ticket":{sourceAsset:`${PICK_MASTER_ROOT}/EE-LT-PICK-015_ticket.png`,sourceSha256:"d1878231e3eb2a582edcfdb6440709fb1d389c0c78790f594f53d9f6778c6e8f"},
  "lucide:play":{sourceAsset:`${PICK_MASTER_ROOT}/EE-LT-PICK-004_play.png`,sourceSha256:"2188d3052fa6c83441f8fba4869cb101f0c8a30105ebb107ab1e836223c20b69"},
} as const;

/** Artist-presentation adapter only. Generic Compact Action state stores IconAsset refs, never family artwork. */
export function loveAndTheftMasteredPickSource(iconAssetRef: string): string | null {
  const normalized = iconAssetRef.includes(":") ? iconAssetRef : `lucide:${iconAssetRef}`;
  return EVERENCORE_LOVE_AND_THEFT_PICK_SEMANTIC_VARIANTS[
    normalized as keyof typeof EVERENCORE_LOVE_AND_THEFT_PICK_SEMANTIC_VARIANTS
  ]?.sourceAsset ?? null;
}
const FAN_REFLECTION = {sourceAsset:`${EVERENCORE_LOVE_AND_THEFT_ROOT}/source/fan-reflection.svg`,sourceSha256:"1e6156471e4261d55678aef5f71b81dd18cec8f6ad5e2abf90e5489bbf13d621",defaultIntensity:48,minIntensity:0,maxIntensity:100} as const;

export const EVERENCORE_LOVE_AND_THEFT_FAMILY: SignatureFamilyDefinition = {
  id: EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,
  slug: "everencore-love-and-theft",
  label: "Love & Theft",
  lifecycle: "production",
  sortOrder: 40,
  version: EVERENCORE_LOVE_AND_THEFT_VERSION,
  finishId: EVERENCORE_LOVE_AND_THEFT_FINISH,
  launchMode: "styled-preserve",
  provenanceManifest: EVERENCORE_LOVE_AND_THEFT_MANIFEST,
  artistCollection: {
    programId: "everencore",
    programLabel: "EverEncore",
    artistId: "love-and-theft",
    artistLabel: "Love & Theft",
  },
  discovery: {
    exposure: "active",
    category: "Curated / Artist / EverEncore",
    description: "EverEncore artist collection · aged-brass guitar picks and premium dark glass.",
    previewAssetId: "reference/everencore/love-and-theft/eelt-ref-hero/v1",
    previewAlt: "Love & Theft premium guitar-pick action preview",
    sortOrder: 40,
  },
};

const full = { top: 0, right: 0, bottom: 0, left: 0 } as const;
const states = ["default", "hover", "pressed", "disabled"] as const;
const rect = ([x0,y0,x1,y1]: readonly [number,number,number,number]): SignatureNormalizedRect => ({ x:x0,y:y0,width:x1-x0,height:y1-y0 });
const semanticSocket = (bounds: readonly [number,number,number,number], safe: readonly [number,number,number,number], center: readonly [number,number], ownership: "component"|"live-action" = "live-action") => ({
  contractId: APPROVED_SIGNATURE_CONTRACT_IDS.semanticPlugSocket,
  geometry: { bounds:rect(bounds), safeArea:rect(safe), center:{x:center[0],y:center[1]} },
  ownership,
});

type AssetSpec = {
  componentId: string;
  label: string;
  role: string;
  path: string;
  hash: string;
  width: number;
  height: number;
  kind: SignatureAssetDefinition["assetKind"];
  subgroup: SignatureAssetDefinition["subgroup"];
  side?: SignatureSide;
  textSafeArea?: readonly [number,number,number,number];
  socketBounds?: readonly [number,number,number,number];
  socketSafeArea?: readonly [number,number,number,number];
  referenceOnly?: boolean;
};

const runtimeSpecs: readonly AssetSpec[] = [
  { componentId:"EELT-HERO-L",label:"Hero Action · Left Pick",role:"hero-action",path:"v1/02-action-bars/EE-LT-BAR-001_smoky-black-glass.png",hash:"c201e43b7142e6b2bd043cba2684f2b8a87b29ddd1fc90338568c9e2c763b601",width:1200,height:280,kind:"action",subgroup:"actions",side:"left",socketBounds:[0,-.214286,.333333,1.214286],socketSafeArea:[.078,.10,.255,.90],textSafeArea:[.34,.22,.92,.79] },
  { componentId:"EELT-HERO-R",label:"Hero Action · Right Pick",role:"hero-action",path:"v1/02-action-bars/EE-LT-BAR-001_smoky-black-glass.png",hash:"c201e43b7142e6b2bd043cba2684f2b8a87b29ddd1fc90338568c9e2c763b601",width:1200,height:280,kind:"action",subgroup:"actions",side:"right",socketBounds:[.666667,-.214286,1,1.214286],socketSafeArea:[.745,.10,.922,.90],textSafeArea:[.08,.22,.66,.79] },
  { componentId:"EELT-HERO-BODY",label:"Hero Action · Body Only",role:"hero-action",path:"v1/02-action-bars/EE-LT-BAR-001_smoky-black-glass.png",hash:"c201e43b7142e6b2bd043cba2684f2b8a87b29ddd1fc90338568c9e2c763b601",width:1200,height:280,kind:"action",subgroup:"actions",side:"center",textSafeArea:[.10,.22,.82,.79] },
  { componentId:"EELT-STANDARD-L",label:"Standard Action · Left Pick",role:"standard-action",path:"v1/02-action-bars/EE-LT-BAR-001_smoky-black-glass.png",hash:"c201e43b7142e6b2bd043cba2684f2b8a87b29ddd1fc90338568c9e2c763b601",width:1200,height:280,kind:"action",subgroup:"actions",side:"left",socketBounds:[0,-.214286,.333333,1.214286],socketSafeArea:[.078,.10,.255,.90],textSafeArea:[.34,.19,.94,.82] },
  { componentId:"EELT-STANDARD-R",label:"Standard Action · Right Pick",role:"standard-action",path:"v1/02-action-bars/EE-LT-BAR-001_smoky-black-glass.png",hash:"c201e43b7142e6b2bd043cba2684f2b8a87b29ddd1fc90338568c9e2c763b601",width:1200,height:280,kind:"action",subgroup:"actions",side:"right",socketBounds:[.666667,-.214286,1,1.214286],socketSafeArea:[.745,.10,.922,.90],textSafeArea:[.06,.19,.66,.82] },
  { componentId:"EELT-STANDARD-BODY",label:"Standard Action · Body Only",role:"standard-action",path:"v1/02-action-bars/EE-LT-BAR-001_smoky-black-glass.png",hash:"c201e43b7142e6b2bd043cba2684f2b8a87b29ddd1fc90338568c9e2c763b601",width:1200,height:280,kind:"action",subgroup:"actions",side:"center",textSafeArea:[.10,.19,.82,.82] },
  { componentId:"EELT-UTILITY-L",label:"Utility Action · Left Mini Insert",role:"utility-action",path:"v1/02-action-bars/EE-LT-BAR-001_smoky-black-glass.png",hash:"c201e43b7142e6b2bd043cba2684f2b8a87b29ddd1fc90338568c9e2c763b601",width:1200,height:280,kind:"action",subgroup:"actions",side:"left",socketBounds:[.025,.27,.16,.73],socketSafeArea:[.055,.34,.13,.66],textSafeArea:[.19,.20,.90,.81] },
  { componentId:"EELT-UTILITY-R",label:"Utility Action · Right Mini Insert",role:"utility-action",path:"v1/02-action-bars/EE-LT-BAR-001_smoky-black-glass.png",hash:"c201e43b7142e6b2bd043cba2684f2b8a87b29ddd1fc90338568c9e2c763b601",width:1200,height:280,kind:"action",subgroup:"actions",side:"right",socketBounds:[.84,.27,.975,.73],socketSafeArea:[.87,.34,.945,.66],textSafeArea:[.10,.20,.81,.81] },
  { componentId:"EELT-UTILITY-BODY",label:"Utility Action · Body Only",role:"utility-action",path:"v1/02-action-bars/EE-LT-BAR-001_smoky-black-glass.png",hash:"c201e43b7142e6b2bd043cba2684f2b8a87b29ddd1fc90338568c9e2c763b601",width:1200,height:280,kind:"action",subgroup:"actions",side:"center",textSafeArea:[.10,.20,.90,.81] },
  { componentId:"EELT-PICK-AGED-BRASS",label:"Aged Brass Guitar Pick",role:"semantic-plug",path:"v1/03-pick-plugs/EE-LT-PICK-000_blank.png",hash:"27c3d77589451c06b3b3e9ee64702ef810988f6aef0d3b7cb7f5c024182793c7",width:1254,height:1254,kind:"micro-part",subgroup:"micro-parts" },
  { componentId:"EELT-SINGLE-CROWN",label:"Bound Stack Crown",role:"single-stack-crown",path:"source/single-crown.svg",hash:"9bc32278f9838c8380a55a447fc7c739734e0f83c4a3af792f223afcdeaf3eac",width:1200,height:96,kind:"frame",subgroup:"frames-stages" },
  { componentId:"EELT-SINGLE-CHASSIS",label:"Bound Stack Repeat Chassis",role:"single-stack-chassis",path:"source/single-chassis.svg",hash:"169d034e4468960fb6a56473b83150d50e6a2010505f986e1fb003e4c9074b12",width:1200,height:280,kind:"frame",subgroup:"frames-stages" },
  { componentId:"EELT-SINGLE-CAP",label:"Bound Stack Finisher",role:"single-stack-termination",path:"source/single-cap.svg",hash:"f730179d9cbb899b15b0e59b526316513ee68f708afca4ce5c93553d97043762",width:1200,height:72,kind:"footer",subgroup:"frames-stages" },
  { componentId:"EELT-TWIN-CROWN",label:"Twin Rail Crown",role:"twin-rail-crown",path:"source/twin-crown.svg",hash:"a3cd6e498d9b4a47d2d3bde2a3201ed1f4b1f0a27b9938f2c9947357a668fbb2",width:1200,height:72,kind:"frame",subgroup:"frames-stages" },
  { componentId:"EELT-TWIN-CHASSIS",label:"Twin Rail Repeat Chassis",role:"twin-rail-chassis",path:"source/twin-chassis.svg",hash:"68bf31ebf534dabbc568084d3cb120f09884f3b07e92ca7ba6b0e354d83ab5be",width:1200,height:150,kind:"frame",subgroup:"frames-stages" },
  { componentId:"EELT-TWIN-CAP",label:"Twin Rail Finisher",role:"twin-rail-termination",path:"source/twin-cap.svg",hash:"b026ed5e15a71137f44622445f6387c4f87820cfb01003517b11a245d8cde70d",width:1200,height:64,kind:"footer",subgroup:"frames-stages" },
] as const;

const referenceSpecs: readonly AssetSpec[] = [
  {componentId:"EELT-REF-HERO",label:"Hero Action Reference",role:"assembly-preset",path:"v1/01-reference/EE-LT-REF-001_burgundy-left-listen.png",hash:"4ceaa6f056b05a09261d0a76dd185bec990658afd42a81fbf681d808fe1d6c16",width:2172,height:724,kind:"stage",subgroup:"frames-stages",referenceOnly:true},
  {componentId:"EELT-REF-STANDARD-L",label:"Standard Left Reference",role:"assembly-preset",path:"v1/01-reference/EE-LT-REF-002_blue-left-watch.png",hash:"1271addffc909dd6c4838abd02355fe316ec884a29113b2dfc3caee4d6123992",width:2172,height:724,kind:"stage",subgroup:"frames-stages",referenceOnly:true},
  {componentId:"EELT-REF-STANDARD-R",label:"Standard Right Reference",role:"assembly-preset",path:"v1/01-reference/EE-LT-REF-003_smoky-right-directions.png",hash:"262a13c028cfe680297b00c81264a91d2cb35f945a0f8e965c305bcd4911bb46",width:2172,height:724,kind:"stage",subgroup:"frames-stages",referenceOnly:true},
  {componentId:"EELT-REF-BODY",label:"Body Material Reference",role:"assembly-preset",path:"v1/01-reference/EE-LT-REF-004_frosted-right-tickets.png",hash:"212208af24c271cb98595d56080aac487ff2111da6d1605850fadae9005e945d",width:2172,height:724,kind:"stage",subgroup:"frames-stages",referenceOnly:true},
  {componentId:"EELT-REF-UTILITY",label:"Utility Mini Insert Reference",role:"assembly-preset",path:"v1/01-reference/EE-LT-REF-006_utility-website.png",hash:"c062d2ee2224f6fc1c111fb52016d4bb092e731fa0141b9a358c0997495a4c63",width:2172,height:724,kind:"stage",subgroup:"frames-stages",referenceOnly:true},
  {componentId:"EELT-REF-SINGLE",label:"Bound Single Stack Reference",role:"assembly-preset",path:"v1/01-reference/EE-LT-REF-005_bound-stack.png",hash:"e70e2bfa36d4b6c6d437de3d892d97b16b3f40ff182ca7f5ece8afb3176adab1",width:1122,height:1402,kind:"stage",subgroup:"frames-stages",referenceOnly:true},
  {componentId:"EELT-REF-TWIN",label:"Twin Rail Preview",role:"assembly-preset",path:"previews/twin-rail.svg",hash:"34d52ebc8ac039a5d3b520c0ae43e6fad2a22d052ec37988ce21e7ae8662ee75",width:600,height:300,kind:"stage",subgroup:"frames-stages",referenceOnly:true},
] as const;

const typography = {
  standalone:{minPx:12,maxPx:19,stepPx:.5,defaultPx:15,characterLimits:{atMin:28,atDefault:22,atMax:15}},
  "single-stack":{minPx:11,maxPx:17,stepPx:.5,defaultPx:14,characterLimits:{atMin:28,atDefault:21,atMax:15}},
  "twin-rail":{minPx:10,maxPx:14,stepPx:.5,defaultPx:12,characterLimits:{atMin:20,atDefault:16,atMax:12}},
} as const;

function normalized(spec: AssetSpec): SignatureComponentContract {
  const actionSocket=spec.socketBounds&&spec.socketSafeArea?semanticSocket(spec.socketBounds,spec.socketSafeArea,[(spec.socketBounds[0]+spec.socketBounds[2])/2,(spec.socketBounds[1]+spec.socketBounds[3])/2]):undefined;
  const plugSocket=spec.componentId==="EELT-PICK-AGED-BRASS"?semanticSocket([.09,.05,.91,.95],[.28,.24,.72,.68],[.5,.47],"component"):undefined;
  const anchors = spec.componentId==="EELT-SINGLE-CROWN"||spec.componentId==="EELT-TWIN-CROWN"
    ? [{id:"top",point:{x:.5,y:0},edge:"top" as const},{id:"bottom",point:{x:.5,y:1},edge:"bottom" as const}]
    : spec.componentId==="EELT-SINGLE-CHASSIS"||spec.componentId==="EELT-TWIN-CHASSIS"
      ? [{id:"top",point:{x:.5,y:0},edge:"top" as const},{id:"bottom",point:{x:.5,y:1},edge:"bottom" as const}]
      : spec.componentId==="EELT-SINGLE-CAP"||spec.componentId==="EELT-TWIN-CAP"
        ? [{id:"top",point:{x:.5,y:0},edge:"top" as const},{id:"bottom",point:{x:.5,y:1},edge:"bottom" as const}]
        : [];
  const repeatability=spec.componentId==="EELT-SINGLE-CHASSIS"
    ? {axis:"y" as const,cadence:"action-row",nativeStridePx:280,normalizedStride:1,preferredOverlapPx:0,maximumSeamOverlapPx:0}
    : spec.componentId==="EELT-TWIN-CHASSIS"
      ? {axis:"y" as const,cadence:"paired-level",nativeStridePx:150,normalizedStride:1,preferredOverlapPx:0,maximumSeamOverlapPx:0}
      : undefined;
  const reference=Boolean(spec.referenceOnly);
  return {
    familyId:EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,familyVersion:EVERENCORE_LOVE_AND_THEFT_VERSION,componentId:spec.componentId,componentVersion:"1.0.0",role:spec.role,side:spec.side??"none",
    layoutCompatibility:reference?[]:[SIGNATURE_ASSEMBLY_CONTRACT_IDS.singleStack,SIGNATURE_ASSEMBLY_CONTRACT_IDS.twinRail],
    sockets:[...(actionSocket?[actionSocket]:[]),...(plugSocket?[plugSocket]:[])],attachmentAnchors:anchors,repeatability,
    authority:reference?"reference-only":"canonical",lifecycle:reference?"reference":"production",runtimeEligibility:reference?"runtime-ineligible":"runtime-eligible",
    certification:{state:"certified",geometryVersion:"1.0.0",evidence:[EVERENCORE_LOVE_AND_THEFT_GEOMETRY]},sourceSha256:spec.hash,finishId:EVERENCORE_LOVE_AND_THEFT_FINISH,entitlementKey:EVERENCORE_LOVE_AND_THEFT_ENTITLEMENT_KEY,
    accessibility:{furniture:"decorative",ariaHidden:true,interactive:false,liveContent:actionSocket?"socket-content":"none",accessibleNameSource:actionSocket?"live-label":undefined},
    sourceGeometry:{widthPx:spec.width,heightPx:spec.height},
    liveContentGeometry:spec.textSafeArea?{safeArea:rect(spec.textSafeArea),alignment:"center",allowedAlignments:["left","center","right"],fontSizePxAt390:[10,19],lineHeightPxAt390:[13,23],textSizePresetsPxAt390:{small:11,medium:14,large:17},lineHeightPresetsPxAt390:{small:14,medium:18,large:21},recommendedCharacterCounts:{small:28,medium:21,large:15},opticalCenterOffsetEm:-.04,presentationTypography:typography,textTreatment:"raised-enamel"}:undefined,
    compactStackedGeometry:spec.role==="standard-action"?{visibleBodyBounds:{top:0,bottom:1}}:undefined,
    materialSurfaceGeometry:spec.kind==="action"?{inset:{top:.1,right:.026,bottom:.1,left:.026},borderRadiusPercent:50}:spec.componentId==="EELT-PICK-AGED-BRASS"?{inset:{top:.05,right:.08,bottom:.04,left:.08},clipPolygon:[{x:.5,y:0},{x:.79,y:.03},{x:.96,y:.19},{x:.98,y:.39},{x:.9,y:.61},{x:.72,y:.83},{x:.55,y:.98},{x:.45,y:.98},{x:.28,y:.83},{x:.1,y:.61},{x:.02,y:.39},{x:.04,y:.19},{x:.21,y:.03}]}:undefined,
    provenance:{sourceAssetPath:`public${EVERENCORE_LOVE_AND_THEFT_ROOT}/${spec.path}`,authorityManifest:EVERENCORE_LOVE_AND_THEFT_MANIFEST,geometryAuthority:EVERENCORE_LOVE_AND_THEFT_GEOMETRY,sourceMode:reference?"exact-asset":"styled-preserve",immutable:true},
  };
}

function asset(spec: AssetSpec, sortOrder: number): SignatureAssetDefinition {
  return {
    id:spec.referenceOnly?`reference/everencore/love-and-theft/${spec.componentId.toLowerCase()}/v1`:`master/everencore/love-and-theft/${spec.componentId.toLowerCase()}/v1`,
    familyId:EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,label:spec.label,subgroup:spec.subgroup,assetKind:spec.kind,role:spec.role,variant:spec.referenceOnly?"reference-only":"artist-certified",sourceAsset:`${EVERENCORE_LOVE_AND_THEFT_ROOT}/${spec.path}`,sourceSha256:spec.hash,width:spec.width,height:spec.height,aspectRatio:spec.width/spec.height,glowPadding:full,safeInsets:full,
    socketContract:spec.kind==="action"?{title:true,description:true,action:true,icon:true,cue:!spec.socketBounds||spec.side==="left"}:spec.componentId==="EELT-PICK-AGED-BRASS"?{icon:true}:{},layoutCapabilities:spec.referenceOnly?[]:["SINGLE","STACK-2","STACK-3","GRID-2"],responsiveContract:{proportional:true,phoneSafe:!spec.referenceOnly,minRenderedWidthPx:spec.kind==="micro-part"?44:spec.kind==="action"?190:280},stateContract:spec.kind==="action"?states:["default","disabled"],tintCapabilities:[],tintMode:"none",energyMode:"fixed",sourceReadiness:"production-ready",provenanceManifest:EVERENCORE_LOVE_AND_THEFT_MANIFEST,nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},lifecycle:spec.referenceOnly?"reference":"production",expressionTier:"signature",referenceOnly:spec.referenceOnly??false,sortOrder,tags:["everencore","artist","love-and-theft",spec.role,spec.referenceOnly?"reference-only":"runtime-eligible"],...(spec.kind==="action"&&!spec.referenceOnly?{materialSourceVariants:BAR_MASTER_VARIANTS,ambientReflection:FAN_REFLECTION}:{}),...(spec.componentId==="EELT-PICK-AGED-BRASS"?{semanticSourceVariants:EVERENCORE_LOVE_AND_THEFT_PICK_SEMANTIC_VARIANTS}:{}),normalizedContract:normalized(spec),
  };
}

export const EVERENCORE_LOVE_AND_THEFT_ASSETS: readonly SignatureAssetDefinition[] = [
  ...runtimeSpecs.map((spec,index)=>asset(spec,3000+index)),
  ...referenceSpecs.map((spec,index)=>asset(spec,3900+index)),
] as const;

const iconCapabilities = (
  plugSide: NonNullable<SignaturePresentationContract["capabilities"]>["plugSide"],
  plug: NonNullable<SignaturePresentationContract["capabilities"]>["plug"] = {supported:true,optional:false,defaultEnabled:true},
  renderedSizePx = 288,
): SignaturePresentationContract["capabilities"] => ({
  semanticIcon:{supported:true,defaultCanonicalIconId:"simple-icons:spotify",treatment:{mode:"engraved",safeInset:.27,scale:1,offsetY:-18,color:"#251207",materialId:"aged_brass"}},
  sublabel:{supported:true,maxLength:44},plugSide,plug:{...(plug??{supported:true,optional:false,defaultEnabled:true}),visualMode:"mastered-chassis",depthTreatment:"none",renderedSizePx},backgroundReflection:{supported:true,defaultIntensity:48,minIntensity:0,maxIntensity:100},
});
const musicDefaults = [
  {label:"Listen Now",sublabel:"New music & official releases",canonicalIconId:"simple-icons:spotify",semanticLabel:"Spotify",accessibilityLabel:"Listen to Love & Theft on Spotify",destination:"https://open.spotify.com/",actionType:"website",textAlign:"left"},
  {label:"Watch Now",sublabel:"Videos & live sessions",canonicalIconId:"simple-icons:youtube",semanticLabel:"YouTube",accessibilityLabel:"Watch Love & Theft on YouTube",destination:"https://youtube.com/",actionType:"website",textAlign:"left"},
  {label:"Tour & Tickets",sublabel:"Upcoming shows near you",canonicalIconId:"simple-icons:bandsintown",semanticLabel:"Bandsintown",accessibilityLabel:"View Love & Theft tour dates",destination:"https://bandsintown.com/",actionType:"website",textAlign:"left"},
  {label:"Merch",sublabel:"Official artist collection",canonicalIconId:"lucide:shirt",semanticLabel:"Merch",accessibilityLabel:"Shop Love & Theft merchandise",destination:"https://example.com/merch",actionType:"website",textAlign:"left"},
  {label:"Follow",sublabel:"Updates from the band",canonicalIconId:"simple-icons:instagram",semanticLabel:"Instagram",accessibilityLabel:"Follow Love & Theft on Instagram",destination:"https://instagram.com/",actionType:"website",textAlign:"left"},
  {label:"Exclusive",sublabel:"Members-only artist access",canonicalIconId:"lucide:lock",semanticLabel:"Exclusive access",accessibilityLabel:"Open exclusive Love & Theft access",destination:"https://example.com/exclusive",actionType:"website",textAlign:"left"},
] as const;

const fullDensity = {mode:"full",preferredFlowWidthPercent:100,minimumFlowWidthPercent:84,maximumFlowWidthPercent:100,defaultFlowAlignment:"stretch",minimumTouchTargetPx:52} as const;
const mediumDensity = {mode:"medium",preferredFlowWidthPercent:84,minimumFlowWidthPercent:64,maximumFlowWidthPercent:92,defaultFlowAlignment:"center",minimumTouchTargetPx:48} as const;
const quietMediumDensity = {mode:"medium",preferredFlowWidthPercent:80,minimumFlowWidthPercent:60,maximumFlowWidthPercent:90,defaultFlowAlignment:"center",minimumTouchTargetPx:48} as const;
const compactUtilityDensity = {mode:"compact",preferredFlowWidthPercent:70,minimumFlowWidthPercent:54,maximumFlowWidthPercent:80,defaultFlowAlignment:"center",minimumTouchTargetPx:44} as const;
const compactDensity = {mode:"compact",preferredFlowWidthPercent:94,minimumFlowWidthPercent:68,maximumFlowWidthPercent:100,defaultFlowAlignment:"center",minimumTouchTargetPx:44} as const;

const responsiveType = {
  hero:{density:"full",renderedWidthPx:{min:260,max:390},title:{minPx:14,maxPx:19,defaultPx:18,lineHeight:1.04,trackingEm:.018},sublabel:{minPx:9,maxPx:12,defaultPx:11,lineHeight:1.08,trackingEm:.035},safeAreaPaddingPx:8,affordanceReservePx:24},
  medium:{density:"medium",renderedWidthPx:{min:210,max:330},title:{minPx:12,maxPx:17,defaultPx:15,lineHeight:1.05,trackingEm:.008},sublabel:{minPx:8,maxPx:11,defaultPx:10,lineHeight:1.08,trackingEm:.12},safeAreaPaddingPx:7,affordanceReservePx:22},
  compact:{density:"compact",renderedWidthPx:{min:170,max:280},title:{minPx:11,maxPx:15,defaultPx:13,lineHeight:1.04,trackingEm:.006},sublabel:{minPx:8,maxPx:10,defaultPx:9,lineHeight:1.05,trackingEm:.1,hideBelowWidthPx:188},safeAreaPaddingPx:5,affordanceReservePx:18},
  single:{density:"single-stack",renderedWidthPx:{min:210,max:350},title:{minPx:11,maxPx:16,defaultPx:14,lineHeight:1.05,trackingEm:.006},sublabel:{minPx:8,maxPx:11,defaultPx:9.5,lineHeight:1.06,trackingEm:.12,hideBelowWidthPx:210},safeAreaPaddingPx:6,affordanceReservePx:20},
  twin:{density:"twin-rail",renderedWidthPx:{min:120,max:195},title:{minPx:10,maxPx:13,defaultPx:12,lineHeight:1.04,trackingEm:.004},safeAreaPaddingPx:4,affordanceReservePx:14},
} as const;
const withType = (capabilities: SignaturePresentationContract["capabilities"], policy: NonNullable<NonNullable<SignaturePresentationContract["capabilities"]>["responsiveTypography"]>) => ({...capabilities,responsiveTypography:policy});

const heroPresentation: SignaturePresentationContract = {id:"everencore-love-and-theft-hero",label:"Hero Action",description:"Featured music or major artist call to action.",previewAssetId:"reference/everencore/love-and-theft/eelt-ref-hero/v1",density:fullDensity,capabilities:withType(iconCapabilities({mode:"authorable",allowed:["left","right"],defaultSide:"left"},{supported:true,optional:true,defaultEnabled:true},400),responsiveType.hero),defaultActions:[{...musicDefaults[0],plugSide:"left"}]};
const leftPresentation: SignaturePresentationContract = {id:"everencore-love-and-theft-standard-left",label:"Standard Action · Left Pick",description:"Premium standard action with a left guitar-pick plug.",previewAssetId:"reference/everencore/love-and-theft/eelt-ref-standard-l/v1",density:mediumDensity,capabilities:withType(iconCapabilities({mode:"fixed",side:"left"},undefined,276),responsiveType.medium),defaultActions:[{label:"Event Details",sublabel:"Dates, venue & show info",canonicalIconId:"lucide:calendar-days",semanticLabel:"Event details",accessibilityLabel:"View Love & Theft event details",destination:"https://example.com/events",actionType:"website",textAlign:"left"}]};
const rightPresentation: SignaturePresentationContract = {id:"everencore-love-and-theft-standard-right",label:"Standard Action · Right Pick",description:"Premium standard action with a right guitar-pick plug.",previewAssetId:"reference/everencore/love-and-theft/eelt-ref-standard-r/v1",density:mediumDensity,capabilities:withType(iconCapabilities({mode:"fixed",side:"right"},undefined,276),responsiveType.medium),defaultActions:[musicDefaults[1]]};
const bodyPresentation: SignaturePresentationContract = {id:"everencore-love-and-theft-standard-body",label:"Standard Action · Body Only",description:"Complete premium glass action body without a signature plug.",previewAssetId:"reference/everencore/love-and-theft/eelt-ref-body/v1",density:quietMediumDensity,capabilities:withType({sublabel:{supported:true,maxLength:44},plugSide:{mode:"derived"},plug:{supported:false,optional:false,defaultEnabled:false},backgroundReflection:{supported:true,defaultIntensity:48,minIntensity:0,maxIntensity:100}},responsiveType.medium),defaultActions:[{label:"Website",sublabel:"Official artist home",accessibilityLabel:"Visit the official Love & Theft website",destination:"https://example.com/",actionType:"website",textAlign:"left"}]};
const utilityPresentation: SignaturePresentationContract = {id:"everencore-love-and-theft-standard-utility",label:"Utility Bar · Compact Brass Insert",description:"Quieter artist-family utility action with a compact semantic brass socket and no full-size pick.",previewAssetId:"reference/everencore/love-and-theft/eelt-ref-utility/v1",density:compactUtilityDensity,capabilities:withType(iconCapabilities({mode:"authorable",allowed:["left","right"],defaultSide:"left"},{supported:true,optional:true,defaultEnabled:true},120),responsiveType.compact),defaultActions:[{label:"Website",sublabel:"Official artist home",canonicalIconId:"lucide:globe",semanticLabel:"Website",accessibilityLabel:"Visit the official Love & Theft website",destination:"https://example.com/",actionType:"website",textAlign:"left",plugSide:"left"}]};
const singlePresentation: SignaturePresentationContract = {id:"everencore-love-and-theft-single-stack",label:"Bound Single Stack",description:"Space-conscious vertical artist actions with optional signature-plug emphasis.",previewAssetId:"reference/everencore/love-and-theft/eelt-ref-single/v1",density:mediumDensity,capabilities:withType(iconCapabilities({mode:"authorable",allowed:["left","right"],defaultSide:"left"},{supported:true,optional:true,defaultEnabled:true},270),responsiveType.single),defaultActions:musicDefaults.map((action,index)=>({...action,plugEnabled:index!==1&&index!==3,plugSide:index%2===0?"left" as const:"right" as const}))};
const twinPresentation: SignaturePresentationContract = {id:"everencore-love-and-theft-twin-rail",label:"Twin Rail",description:"Paired compact actions that save vertical space without losing the collectible language.",previewAssetId:"reference/everencore/love-and-theft/eelt-ref-twin/v1",density:compactDensity,capabilities:withType(iconCapabilities({mode:"derived"},undefined,210),responsiveType.twin),defaultActions:musicDefaults.map((action)=>({...action,textAlign:"center" as const}))};

const heroRecipe: SignatureAssemblyRecipe = {contractId:SIGNATURE_ASSEMBLY_CONTRACT_IDS.singleStack,familyId:EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,familyVersion:EVERENCORE_LOVE_AND_THEFT_VERSION,recipeId:"everencore-love-and-theft-hero",recipeVersion:"1.0.0",presentationMode:"standalone",presentation:heroPresentation,fixedTop:[],actionUnit:{id:"hero-action",kind:"row",capacity:1,masterStrategy:{mode:"side-specific",masters:{left:{role:"hero-action",componentId:"EELT-HERO-L",side:"left",ownsSockets:[APPROVED_SIGNATURE_CONTRACT_IDS.semanticPlugSocket]},right:{role:"hero-action",componentId:"EELT-HERO-R",side:"right",ownsSockets:[APPROVED_SIGNATURE_CONTRACT_IDS.semanticPlugSocket]},center:{role:"hero-action",componentId:"EELT-HERO-BODY",side:"center"}}},socketOwnership:"action-master"},oddActionTreatment:{mode:"not-applicable"},attachmentOrder:["hero-action"],certificationLimits:{minimumActions:1,launchCertifiedActionCounts:[1],maximumLaunchCertifiedActions:1},geometry:{coordinateWidthPx:1200,unitStridePx:400,flowBox:{mode:"action-bar-owned",xPx:0,widthPx:1200,firstRowOffsetPx:60,rowHeightPx:280},fixedTop:[],actionSlots:[{role:"hero-action",side:"left",verticalReference:"unit-start",xPx:0,yOffsetPx:60,scale:1,zOrder:20},{role:"hero-action",side:"right",verticalReference:"unit-start",xPx:0,yOffsetPx:60,scale:1,zOrder:20},{role:"hero-action",side:"center",verticalReference:"unit-start",xPx:0,yOffsetPx:60,scale:1,zOrder:20}],repeatComponents:[]}};
const standardRecipe = (side:"left"|"right", presentation:SignaturePresentationContract): SignatureAssemblyRecipe => ({contractId:SIGNATURE_ASSEMBLY_CONTRACT_IDS.singleStack,familyId:EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,familyVersion:EVERENCORE_LOVE_AND_THEFT_VERSION,recipeId:`everencore-love-and-theft-standard-${side}`,recipeVersion:"1.0.0",presentationMode:"standalone",presentation,fixedTop:[],actionUnit:{id:"standard-action",kind:"row",capacity:1,masterStrategy:{mode:"single",master:{role:"standard-action",componentId:side==="left"?"EELT-STANDARD-L":"EELT-STANDARD-R",side,ownsSockets:[APPROVED_SIGNATURE_CONTRACT_IDS.semanticPlugSocket]}},socketOwnership:"action-master"},oddActionTreatment:{mode:"not-applicable"},attachmentOrder:["standard-action"],certificationLimits:{minimumActions:1,launchCertifiedActionCounts:[1],maximumLaunchCertifiedActions:1},geometry:{coordinateWidthPx:1200,unitStridePx:300,flowBox:{mode:"action-bar-owned",xPx:0,widthPx:1200,firstRowOffsetPx:60,rowHeightPx:280},actionPresentation:{mode:"compact-stacked",rowHeightPx:300,plugVerticalInsetPx:0,preservePlugAspectRatio:true},fixedTop:[],actionSlots:[{role:"standard-action",side,verticalReference:"unit-start",xPx:0,yOffsetPx:60,scale:1,zOrder:20}],repeatComponents:[]}});
const bodyRecipe: SignatureAssemblyRecipe = {contractId:SIGNATURE_ASSEMBLY_CONTRACT_IDS.singleStack,familyId:EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,familyVersion:EVERENCORE_LOVE_AND_THEFT_VERSION,recipeId:"everencore-love-and-theft-standard-body",recipeVersion:"1.0.0",presentationMode:"standalone",presentation:bodyPresentation,fixedTop:[],actionUnit:{id:"standard-action",kind:"row",capacity:1,masterStrategy:{mode:"single",master:{role:"standard-action",componentId:"EELT-STANDARD-BODY",side:"center"}},socketOwnership:"action-master"},oddActionTreatment:{mode:"not-applicable"},attachmentOrder:["standard-action"],certificationLimits:{minimumActions:1,launchCertifiedActionCounts:[1],maximumLaunchCertifiedActions:1},geometry:{coordinateWidthPx:1200,unitStridePx:280,flowBox:{mode:"action-bar-owned",xPx:0,widthPx:1200,firstRowOffsetPx:0,rowHeightPx:280},fixedTop:[],actionSlots:[{role:"standard-action",side:"center",verticalReference:"unit-start",xPx:0,yOffsetPx:0,scale:1,zOrder:20}],repeatComponents:[]}};
const utilityRecipe: SignatureAssemblyRecipe = {contractId:SIGNATURE_ASSEMBLY_CONTRACT_IDS.singleStack,familyId:EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,familyVersion:EVERENCORE_LOVE_AND_THEFT_VERSION,recipeId:"everencore-love-and-theft-standard-utility",recipeVersion:"1.0.0",presentationMode:"standalone",presentation:utilityPresentation,fixedTop:[],actionUnit:{id:"utility-action",kind:"row",capacity:1,masterStrategy:{mode:"side-specific",masters:{left:{role:"utility-action",componentId:"EELT-UTILITY-L",side:"left",ownsSockets:[APPROVED_SIGNATURE_CONTRACT_IDS.semanticPlugSocket]},right:{role:"utility-action",componentId:"EELT-UTILITY-R",side:"right",ownsSockets:[APPROVED_SIGNATURE_CONTRACT_IDS.semanticPlugSocket]},center:{role:"utility-action",componentId:"EELT-UTILITY-BODY",side:"center"}}},socketOwnership:"action-master"},oddActionTreatment:{mode:"not-applicable"},attachmentOrder:["utility-action"],certificationLimits:{minimumActions:1,launchCertifiedActionCounts:[1],maximumLaunchCertifiedActions:1},geometry:{coordinateWidthPx:1200,unitStridePx:280,flowBox:{mode:"action-bar-owned",xPx:0,widthPx:1200,firstRowOffsetPx:0,rowHeightPx:280},fixedTop:[],actionSlots:[{role:"utility-action",side:"left",verticalReference:"unit-start",xPx:0,yOffsetPx:0,scale:1,zOrder:20},{role:"utility-action",side:"right",verticalReference:"unit-start",xPx:0,yOffsetPx:0,scale:1,zOrder:20},{role:"utility-action",side:"center",verticalReference:"unit-start",xPx:0,yOffsetPx:0,scale:1,zOrder:20}],repeatComponents:[]}};
const singleRecipe: SignatureAssemblyRecipe = {contractId:SIGNATURE_ASSEMBLY_CONTRACT_IDS.singleStack,familyId:EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,familyVersion:EVERENCORE_LOVE_AND_THEFT_VERSION,recipeId:"everencore-love-and-theft-single-stack",recipeVersion:"1.0.0",presentationMode:"single-stack",presentation:singlePresentation,fixedTop:[{role:"single-stack-crown",componentId:"EELT-SINGLE-CROWN"}],actionUnit:{id:"action-row",kind:"row",capacity:1,masterStrategy:{mode:"side-specific",masters:{left:{role:"standard-action",componentId:"EELT-STANDARD-L",side:"left",ownsSockets:[APPROVED_SIGNATURE_CONTRACT_IDS.semanticPlugSocket]},right:{role:"standard-action",componentId:"EELT-STANDARD-R",side:"right",ownsSockets:[APPROVED_SIGNATURE_CONTRACT_IDS.semanticPlugSocket]},center:{role:"standard-action",componentId:"EELT-STANDARD-BODY",side:"center"}}},socketOwnership:"action-master"},repeatInterval:{id:"single-stack-frame-interval",components:[{role:"single-stack-chassis",componentId:"EELT-SINGLE-CHASSIS"}],axis:"y",cadence:"action-row",nativeStridePx:280,normalizedStride:1,preferredOverlapPx:0,maximumSeamOverlapPx:0,placement:"action-unit-chassis"},structuralTermination:{role:"single-stack-termination",componentId:"EELT-SINGLE-CAP"},oddActionTreatment:{mode:"not-applicable"},attachmentOrder:["single-stack-crown","action-row","single-stack-frame-interval","single-stack-termination"],certificationLimits:{minimumActions:2,launchCertifiedActionCounts:[2,3,4,5,6],maximumLaunchCertifiedActions:6},geometry:{coordinateWidthPx:1200,unitStridePx:280,flowBox:{mode:"action-bar-owned",xPx:0,widthPx:1200,firstRowOffsetPx:-64,rowHeightPx:400},actionPresentation:{mode:"compact-stacked",rowHeightPx:280,plugVerticalInsetPx:10,preservePlugAspectRatio:true},contentOriginOffsetPx:64,fixedTop:[{role:"single-stack-crown",verticalReference:"assembly-origin",xPx:0,yOffsetPx:0,scale:1,zOrder:27}],actionSlots:[{role:"standard-action",side:"left",verticalReference:"unit-start",xPx:0,yOffsetPx:0,scale:1,zOrder:20},{role:"standard-action",side:"right",verticalReference:"unit-start",xPx:0,yOffsetPx:0,scale:1,zOrder:20},{role:"standard-action",side:"center",verticalReference:"unit-start",xPx:0,yOffsetPx:0,scale:1,zOrder:20}],repeatComponents:[{role:"single-stack-chassis",verticalReference:"unit-start",xPx:0,yOffsetPx:0,scale:1,zOrder:25}],structuralTermination:{role:"single-stack-termination",verticalReference:"termination-start",xPx:0,yOffsetPx:264,scale:1,zOrder:27}}};

const twinRecipe: SignatureAssemblyRecipe = {contractId:SIGNATURE_ASSEMBLY_CONTRACT_IDS.twinRail,familyId:EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,familyVersion:EVERENCORE_LOVE_AND_THEFT_VERSION,recipeId:"everencore-love-and-theft-twin-rail",recipeVersion:"1.0.0",presentationMode:"twin-rail",presentation:twinPresentation,fixedTop:[],actionUnit:{id:"paired-action-level",kind:"paired-level",capacity:2,masterStrategy:{mode:"side-specific",masters:{left:{role:"standard-action",componentId:"EELT-STANDARD-L",side:"left",ownsSockets:[APPROVED_SIGNATURE_CONTRACT_IDS.semanticPlugSocket]},right:{role:"standard-action",componentId:"EELT-STANDARD-R",side:"right",ownsSockets:[APPROVED_SIGNATURE_CONTRACT_IDS.semanticPlugSocket]}}},socketOwnership:"action-master"},oddActionTreatment:{mode:"not-applicable"},attachmentOrder:["paired-action-level"],certificationLimits:{minimumActions:2,launchCertifiedActionCounts:[2,4,6],maximumLaunchCertifiedActions:6},geometry:{coordinateWidthPx:1200,unitStridePx:160,flowBox:{mode:"action-bar-owned",xPx:0,widthPx:1200,firstRowOffsetPx:30,rowHeightPx:140},actionPresentation:{mode:"compact-stacked",rowHeightPx:160,plugVerticalInsetPx:10,preservePlugAspectRatio:true},contentOriginOffsetPx:0,fixedTop:[],actionSlots:[{role:"standard-action",side:"left",verticalReference:"unit-start",xPx:0,yOffsetPx:30,scale:.5,zOrder:20},{role:"standard-action",side:"right",verticalReference:"unit-start",xPx:600,yOffsetPx:30,scale:.5,zOrder:20}],repeatComponents:[]}};

export const EVERENCORE_LOVE_AND_THEFT_ASSEMBLY_RECIPES = [heroRecipe,standardRecipe("left",leftPresentation),standardRecipe("right",rightPresentation),utilityRecipe,bodyRecipe,singleRecipe,twinRecipe] as const;

const proofRoot = "docs/product-reconstitution/creative-studio-platform/proofs/everencore-love-and-theft";
const referenceByPresentationId: Readonly<Record<string,string>> = {
  [heroPresentation.id]:"EELT-REF-HERO",
  [leftPresentation.id]:"EELT-REF-STANDARD-L",
  [rightPresentation.id]:"EELT-REF-STANDARD-R",
  [utilityPresentation.id]:"EELT-REF-UTILITY",
  [bodyPresentation.id]:"EELT-REF-BODY",
  [singlePresentation.id]:"EELT-REF-SINGLE",
  [twinPresentation.id]:"EELT-REF-TWIN",
};
export const EVERENCORE_LOVE_AND_THEFT_VISUAL_ACCEPTANCE: CuratedFamilyVisualAcceptanceContract = {familyId:EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,contractVersion:"1.0.0",deterministicRuntimeRoute:"/review/studio",viewport:{widthPx:390,heightPx:844,density:"phone-authoritative"},humanQuestion:"Would a fan believe this dark-glass and aged-brass object was manufactured as one premium artist collectible?",presentations:EVERENCORE_LOVE_AND_THEFT_ASSEMBLY_RECIPES.map((recipe)=>({recipeId:recipe.recipeId,presentationMode:recipe.presentationMode,referenceAssetIds:[referenceByPresentationId[recipe.presentation!.id]],acceptedRuntimeGolden:`${proofRoot}/golden/${recipe.presentation!.id}-phone390.png`,deterministicRuntimeProof:`${proofRoot}/runtime/${recipe.presentation!.id}-phone390.png`,requiredChecks:["outer-geometry","text-safe-area",...(recipe.presentation!.capabilities?.plug?.supported===false?[]:["plug-envelope"] as const),"whole-object-silhouette","phone-density"] as readonly CuratedWholeObjectCheck[]}))};
