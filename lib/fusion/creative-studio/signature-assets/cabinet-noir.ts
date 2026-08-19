import {
  APPROVED_SIGNATURE_CONTRACT_IDS,
  type SignatureAssetDefinition,
  type SignatureComponentContract,
  type SignatureEntitlementResolutionContract,
  type SignatureFamilyDefinition,
  type SignatureNormalizedRect,
} from "./types";
import {
  SIGNATURE_ASSEMBLY_CONTRACT_IDS,
  type SignatureAssemblyRecipe,
} from "./layout-recipes";

export const CABINET_NOIR_FAMILY_ID = "cabinet-noir";
export const CABINET_NOIR_FAMILY_VERSION = "1.0.0" as const;
export const CABINET_NOIR_ENTITLEMENT_KEY = "signature.family.cabinet_noir" as const;
export const CABINET_NOIR_FINISH_ID = "champagne-gold-blackened-gunmetal@1.0.0";
export const CABINET_NOIR_ROOT = "/visual-parts/signature/cabinet-noir";
export const CABINET_NOIR_MANIFEST = `${CABINET_NOIR_ROOT}/reference/manifest.json`;
export const CABINET_NOIR_GEOMETRY_AUTHORITY = `${CABINET_NOIR_ROOT}/reference/geometry.json`;

export const CABINET_NOIR_ENTITLEMENT: SignatureEntitlementResolutionContract = {
  contractId: APPROVED_SIGNATURE_CONTRACT_IDS.entitlementResolution,
  entitlementKey: CABINET_NOIR_ENTITLEMENT_KEY,
  entitled: { visible: true, selectable: true, publishable: true },
  nonEntitled: { visible: true, selectable: false, publishable: false },
  afterLoss: {
    existingObjects: "read-only",
    existingPublishedOutput: "remain-live",
    newInsertion: "block",
    restrictedReplacement: "block",
  },
  publicRenderRequiresCurrentEntitlement: false,
  publicationEnforcement: "server-required",
};

export const CABINET_NOIR_FAMILY: SignatureFamilyDefinition = {
  id: CABINET_NOIR_FAMILY_ID,
  slug: CABINET_NOIR_FAMILY_ID,
  label: "Cabinet Noir",
  lifecycle: "production",
  sortOrder: 30,
  version: CABINET_NOIR_FAMILY_VERSION,
  entitlement: CABINET_NOIR_ENTITLEMENT,
  finishId: CABINET_NOIR_FINISH_ID,
  launchMode: "exact-asset",
  provenanceManifest: CABINET_NOIR_MANIFEST,
};

const full = { top: 0, right: 0, bottom: 0, left: 0 } as const;
const states = ["default", "hover", "pressed", "disabled"] as const;
const rect = ([x0, y0, x1, y1]: readonly [number, number, number, number]): SignatureNormalizedRect => ({
  x: x0,
  y: y0,
  width: x1 - x0,
  height: y1 - y0,
});

const semanticSocket = (
  bounds: readonly [number, number, number, number],
  safeArea: readonly [number, number, number, number],
  center: readonly [number, number],
  ownership: "component" | "live-action" = "live-action",
) => ({
  contractId: APPROVED_SIGNATURE_CONTRACT_IDS.semanticPlugSocket,
  geometry: { bounds: rect(bounds), safeArea: rect(safeArea), center: { x: center[0], y: center[1] } },
  ownership,
});

const actionGeometry = {
  "CN-002": {
    socket: semanticSocket([.701625572,.092201965,.996818383,.944519234],[.77946593,.296961326,.916206262,.70441989],[.847836096,.500690608]),
    text: rect([.115101289,.345303867,.667587477,.552486188]),
    side: "right" as const,
  },
  "CN-003": {
    socket: semanticSocket([-.006279242,.073561389,.289907483,.928748413],[.071823204,.267955801,.209023941,.698895028],[.140423573,.483425414]),
    text: rect([.299263352,.33839779,.85174954,.54558011]),
    side: "left" as const,
  },
  "CN-004": {
    socket: semanticSocket([.023527326,.135401112,.266042631,.83562136],[.08747698,.30801105,.199815838,.633977901],[.143646409,.470994475]),
    text: rect([.276243094,.372928177,.828729282,.566298343]),
    side: "left" as const,
  },
  "CN-005": {
    socket: semanticSocket([.734413886,.109280508,.99780141,.869765613],[.803867403,.296961326,.92587477,.650552486],[.864871087,.473756906]),
    text: rect([.161141805,.366022099,.690607735,.559392265]),
    side: "right" as const,
  },
} as const;

const identityGeometry = {
  "CN-037": rect([.340494792,.227539062,.649088542,.690429688]),
  "CN-037-ALT-A1": rect([.34375,.22265625,.65234375,.685546875]),
  "CN-037-ALT-A2": rect([.327799479,.208496094,.661783854,.709472656]),
  "CN-037-ALT-A3": rect([.324544271,.208496094,.671549479,.729003906]),
} as const;

const identityBridgeAnchors = {
  "CN-037": [768,841],
  "CN-037-ALT-A1": [768,836],
  "CN-037-ALT-A2": [768,889],
  "CN-037-ALT-A3": [768,916],
} as const;

const handoffSourcePath = (publicPath: string) => publicPath
  .replace("source/01-production-assets/", "01_PRODUCTION_ASSETS/")
  .replace("source/02-structural-system/", "02_STRUCTURAL_SYSTEM/")
  .replace("source/03-plugs-semantic/", "03_PLUGS_SEMANTIC/")
  .replace("source/04-plugs-social/", "04_PLUGS_SOCIAL_SYSTEM/")
  .replace("source/05-topper-variants/", "05_TOPPER_VARIANTS/")
  .replace("reference/presets/", "06_CERTIFIED_PRESETS_REFERENCES/");

type AssetSpec = {
  componentId: string;
  label: string;
  path: string;
  role: string;
  width: number;
  height: number;
  hash: string;
  kind: SignatureAssetDefinition["assetKind"];
  subgroup: SignatureAssetDefinition["subgroup"];
  lifecycle?: SignatureAssetDefinition["lifecycle"];
  referenceOnly?: boolean;
};

const productionSpecs: readonly AssetSpec[] = [
  {componentId:"CN-001",label:"Identity Topper / Brand Crest",path:"source/01-production-assets/CN-001_identity-topper-brand-crest.png",role:"identity-topper",width:1672,height:941,hash:"b9142dda762cecae36899f7d986ff9a33ec5b0a8523162e2da7dbe8b89fcfc09",kind:"identity",subgroup:"identity"},
  {componentId:"CN-002",label:"Hero Action / Plug Right",path:"source/01-production-assets/CN-002_hero-action_plug-right.png",role:"hero-action",width:2172,height:724,hash:"5741f984a7521f676e57b6c1bce4bee6e4623930c495fad758cce778557e943d",kind:"action",subgroup:"actions"},
  {componentId:"CN-003",label:"Hero Action / Plug Left",path:"source/01-production-assets/CN-003_hero-action_plug-left.png",role:"hero-action",width:2172,height:724,hash:"cfd8c8b8bfde1f9786850b421186c669f53be1557e1b07d1eeabcb6dcd07bab2",kind:"action",subgroup:"actions"},
  {componentId:"CN-004",label:"Standard Action / Plug Left",path:"source/01-production-assets/CN-004_standard-action_plug-left.png",role:"standard-action",width:2172,height:724,hash:"0053a28d71a774d85442e4036805a3f7a98d6132d60753c562351fd8321102ba",kind:"action",subgroup:"actions"},
  {componentId:"CN-005",label:"Standard Action / Plug Right",path:"source/01-production-assets/CN-005_standard-action_plug-right.png",role:"standard-action",width:2172,height:724,hash:"3443f45ac6ebbbe1571429f29df715bad6c8404ef37c7f88ac919def2ce0c1bc",kind:"action",subgroup:"actions"},
  {componentId:"CN-010",label:"Twin-Rail Odd-Row Finisher",path:"source/01-production-assets/CN-010_twin-rail_odd-row-finisher.png",role:"odd-action-finisher",width:2172,height:724,hash:"58ec81f51c3f809b536f9999f4fe14dc27f4dbbdfaa1d4fc7a19bbec30cda97f",kind:"footer",subgroup:"frames-stages"},
  {componentId:"CN-011",label:"Decorative / Utility Finisher",path:"source/01-production-assets/CN-011_decorative-utility-finisher.png",role:"informational-line",width:2172,height:724,hash:"98375c60b7fd240eda469f650bcf0d3bfc8d41df763f01b91d573868a31db990",kind:"footer",subgroup:"frames-stages"},
  {componentId:"CN-012",label:"Standard Semantic Plug Socket",path:"source/01-production-assets/CN-012_standard-plug-socket_empty.png",role:"semantic-plug-chassis",width:1278,height:1230,hash:"6030cc1abf6de4ae3c18b90074da48150e647a15a21dc3c1ce1c3bc376ec6ce4",kind:"micro-part",subgroup:"micro-parts"},
  {componentId:"CN-038",label:"Topper-to-Stack Bridge",path:"source/02-structural-system/CN-038_topper-to-stack-bridge.png",role:"single-stack-bridge",width:1905,height:826,hash:"31c3b63e9d49da80f326dfb086a6467f715f3466206bf8e2b323244d7a65756f",kind:"frame",subgroup:"frames-stages"},
  {componentId:"CN-039",label:"Repeatable Single-Stack Side Rails",path:"source/02-structural-system/CN-039_repeatable-single-stack-side-rail-segment.png",role:"single-stack-repeat-rails",width:2172,height:724,hash:"539f056571632cc93175079b4d96a0f1f2f39ad39663db05fe07b27fd2013c78",kind:"frame",subgroup:"frames-stages"},
  {componentId:"CN-040",label:"Single-Stack Bottom Cap",path:"source/02-structural-system/CN-040_single-stack-bottom-cap.png",role:"single-stack-termination",width:1672,height:941,hash:"1d09c0493c4984f2ebc5d9c8992f47bc826c10085d9c4b495b7ab6fcd6c13bdb",kind:"footer",subgroup:"frames-stages"},
  {componentId:"CN-041",label:"Decorative Footer Pedestal",path:"source/02-structural-system/CN-041_decorative-footer-pedestal.png",role:"decorative-termination",width:2172,height:724,hash:"321ca2a9cfb02f78f5c4b90a79267520a4897ff9ff7c618e08e43226bdc9c9cd",kind:"footer",subgroup:"frames-stages"},
  {componentId:"CN-042",label:"Twin-Rail Repeatable Outer Rails",path:"source/02-structural-system/CN-042_twin-rail-repeatable-outer-rail-segment.png",role:"twin-rail-repeat-outer",width:2172,height:362,hash:"39972ed76575213469916dcdc2744ea1367533c0ee1f7d895edecb430c350a08",kind:"frame",subgroup:"frames-stages"},
  {componentId:"CN-043",label:"Twin-Rail Repeatable Center Spine",path:"source/02-structural-system/CN-043_twin-rail-repeatable-center-spine-segment.png",role:"twin-rail-repeat-spine",width:1024,height:1536,hash:"45272b4d5b3e2676eeb4fc28a692771a6dc083527b7f2beb1c29d541d90bbdea",kind:"frame",subgroup:"frames-stages"},
  {componentId:"CN-044",label:"Twin-Rail Crown Bridge",path:"source/02-structural-system/CN-044_twin-rail-topper-crown-bridge.png",role:"twin-rail-crown-bridge",width:1774,height:887,hash:"2d9ef3a3efcc723253130f18bb8b7694e1988223a9c0e0570a62f77ffb0237da",kind:"frame",subgroup:"frames-stages"},
  {componentId:"CN-045",label:"Twin-Rail Bottom Cap",path:"source/02-structural-system/CN-045_twin-rail-bottom-cap.png",role:"twin-rail-termination",width:2172,height:724,hash:"d77a1064be38f2a9aee6604e1cbc04f77937fbf0f98589f5c3abedd650933e0d",kind:"footer",subgroup:"frames-stages"},
] as const;

const plugSpecs = [
  ["CN-013","Website / Globe","03-plugs-semantic","CN-013_website-globe_plug.png","f30afbbbd9921b09b6aa3be0453145954b196163f982e681063486ce49e056ea",1254,1254],
  ["CN-014","Call / Phone","03-plugs-semantic","CN-014_call-phone_plug.png","56eaf9b99418047e3659ffd84fb44ac2ca19bb275ab9357de71f793a457a6bd8",1254,1254],
  ["CN-015","Directions / Map Pin","03-plugs-semantic","CN-015_directions-map-pin_plug.png","3ab5ebee59f83442f035e2dd007954f596f0404e23711c523fd1dea57e27183e",1254,1254],
  ["CN-016","Reviews / Star","03-plugs-semantic","CN-016_reviews-star_plug.png","bbb0f048ba0532a793a001184ba4e5e60f67be0677ccd927e586fbd8309ae9d0",1312,1199],
  ["CN-017","Book / Calendar","03-plugs-semantic","CN-017_book-calendar_plug.png","a15e1603d0bfb76828f1247240cecbfc75da61bf2e87f16d1f49029d1707ce0a",1254,1254],
  ["CN-018","Email / Envelope","03-plugs-semantic","CN-018_email-envelope_plug.png","fcb1f693c365db663c91a9d5d03bb6c119fac48e54e1834039d5b420f017f0b9",1254,1254],
  ["CN-019","Text / SMS","03-plugs-semantic","CN-019_text-sms_plug.png","4b2c8d8a81e46e83d086119ffca9a185fd48e372f685315eb4dd4d56f12d0313",1254,1254],
  ["CN-020","Pay / Payment","03-plugs-semantic","CN-020_pay-payment_plug.png","2f1dc65e86b0aff8433e9f04699560d70bd6a36c31249d5fea47a87accf277c9",1254,1254],
  ["CN-021","Menu / Order","03-plugs-semantic","CN-021_menu-order_plug.png","63f165e765489465b336a0cb70aba31bfc6bae82a96d2d0dba3330d857f5cf81",1254,1254],
  ["CN-022","QR Code","03-plugs-semantic","CN-022_qr-code_plug.png","bf4466bc5f6d7a1dccfbdacba2220edc775dd5624d2d59c8bf02f557a90c034c",1254,1254],
  ["CN-023","Generic Share","03-plugs-semantic","CN-023_generic-share_plug.png","24d581bb7460864ee00c028d3abfa59bd2dfb0a883986ee740a78142f17b739a",1254,1254],
  ["CN-024","Apple System Share","03-plugs-semantic","CN-024_apple-system-share_plug.png","73f8c16797b34ddb2605e8eda918259f520d64b2a701732e8c05587904b9f911",1278,1230],
  ["CN-025","Save / Download","03-plugs-semantic","CN-025_save-download_plug.png","597626513e76bb657f51c0ce07133b846ce99bc6e81ca6939230cd3319ed3eb0",1254,1254],
  ["CN-026","Instagram","04-plugs-social","CN-026_instagram_plug.png","8272f4f1a3e78814fa432e9035a7cd512084d9c7d9d3541668653062588b58c7",1254,1254],
  ["CN-027","Facebook","04-plugs-social","CN-027_facebook_plug.png","b88f83af36ae6204f6823e84178c804de371733bc01ce7b1949c2ef55cc431cc",1276,1233],
  ["CN-028","TikTok","04-plugs-social","CN-028_tiktok_plug.png","3ca09ffd4bc1ff41461a185c37fa7484ffd2a2f705c4297620e474080541dd09",1254,1254],
  ["CN-029","YouTube","04-plugs-social","CN-029_youtube_plug.png","a108a9cd54d1e1eebed0e9d4c575cde9f3bf8987c4b14b1fbc423b0b00b6240f",1254,1254],
  ["CN-030","LinkedIn","04-plugs-social","CN-030_linkedin_plug.png","d78830a405c49ee598d4b9263db69490531fc7929f9a631d309dcb849d3c635c",1254,1254],
  ["CN-031","X","04-plugs-social","CN-031_x_plug.png","a449892a2e3d9ee1b9e97e6897d978067ac5d9aad765392642ef653e68086b01",1271,1238],
  ["CN-032","Pinterest","04-plugs-social","CN-032_pinterest_plug.png","7eb306e1235c2bd3ae31fac1dae0d4a21274323bf360a70d6bac5014c050d36f",1254,1254],
  ["CN-033","Add to Home Screen","03-plugs-semantic","CN-033_add-to-home-screen_plug.png","85d16a4bce666ecc637a62657bbecc61019099d8a99aa9b8b03dc2a1843df46c",1262,1246],
  ["CN-034","Add / Save Contact vCard","03-plugs-semantic","CN-034_add-save-contact-vcard_plug.png","654fa60c1e2b1b183042949a319927e072a46e0664b8d94a02847d039b734ca7",1254,1254],
  ["CN-035","Bookmark / Save for Later","03-plugs-semantic","CN-035_bookmark-save-for-later_plug.png","fa0cb76b85123bb24bf12163316507a7ad0d45b989364c21f1ac610c0f35d594",1254,1254],
  ["CN-036","Google G","03-plugs-semantic","CN-036_google-g_plug.png","22a761576227c4efb59be5e7d698f8b01f63a9768609c7b0488d17e4a68a51d9",1254,1254],
] as const;

const topperSpecs: readonly AssetSpec[] = [
  {componentId:"CN-037",label:"Circular Identity Topper",path:"source/05-topper-variants/CN-037_circular-identity-topper_empty.png",role:"identity-header",width:1536,height:1024,hash:"5b0e2883605335a1f2bd9aca7dca3318c0fe677c3532260e0ac865ce6817d85e",kind:"identity",subgroup:"identity"},
  {componentId:"CN-037-ALT-A1",label:"Circular Identity Topper A1",path:"source/05-topper-variants/CN-037-ALT-A1_circular-identity-topper_empty.png",role:"identity-header",width:1536,height:1024,hash:"1b09dc7efb93c01612b1f7ef1931775b514c83ec9473bb04ae01824741bc9235",kind:"identity",subgroup:"identity"},
  {componentId:"CN-037-ALT-A2",label:"Circular Identity Topper A2",path:"source/05-topper-variants/CN-037-ALT-A2_circular-identity-topper_empty.png",role:"identity-header",width:1536,height:1024,hash:"9875d611cf2e27cb6eb04348edcc92efc204cdc553a48352703fa873a6a5c9e4",kind:"identity",subgroup:"identity"},
  {componentId:"CN-037-ALT-A3",label:"Circular Identity Topper A3",path:"source/05-topper-variants/CN-037-ALT-A3_circular-identity-topper_empty.png",role:"identity-header",width:1536,height:1024,hash:"9745962530a6b81349fa1eda8e9f6fd93c0f932fb7288a3ef4b1997b77e2a1be",kind:"identity",subgroup:"identity"},
] as const;

const referenceSpecs: readonly AssetSpec[] = [
  {componentId:"CN-006",label:"Bound Single-Stack / 4 Row",path:"reference/presets/CN-006_bound-single-stack_4-row.png",role:"assembly-preset",width:941,height:1672,hash:"b42516a577aa56e13a83adaf264b0122ad4c2082778007ee85f5f75624d4207d",kind:"stage",subgroup:"frames-stages",lifecycle:"reference",referenceOnly:true},
  {componentId:"CN-007",label:"Bound Single-Stack / 6 Row",path:"reference/presets/CN-007_bound-single-stack_6-row.png",role:"assembly-preset",width:1024,height:1536,hash:"a1e406754e2b336c9125a6b9207342d8692eb32451ae061c6ed46a664360bdaa",kind:"stage",subgroup:"frames-stages",lifecycle:"reference",referenceOnly:true},
  {componentId:"CN-008",label:"Twin-Rail Bound Stack / 2x2",path:"reference/presets/CN-008_twin-rail-bound-stack_2x2.png",role:"assembly-preset",width:1122,height:1402,hash:"05fe13a9e532e8e360840079fb3e5f4b0b4a28d1e23568f26bbc55599a9a4aa4",kind:"stage",subgroup:"frames-stages",lifecycle:"reference",referenceOnly:true},
  {componentId:"CN-009",label:"Twin-Rail Bound Stack / 2x3",path:"reference/presets/CN-009_twin-rail-bound-stack_2x3.png",role:"assembly-preset",width:1024,height:1536,hash:"a67ae9cfba75fe45ff7b26129a6c38ea924c26a37acc749b028e5a436197860c",kind:"stage",subgroup:"frames-stages",lifecycle:"reference",referenceOnly:true},
] as const;

const normalizedContract = (spec: AssetSpec): SignatureComponentContract => {
  const action = actionGeometry[spec.componentId as keyof typeof actionGeometry];
  const identity = identityGeometry[spec.componentId as keyof typeof identityGeometry];
  const identityBridgeAnchor = identityBridgeAnchors[spec.componentId as keyof typeof identityBridgeAnchors];
  const isReference = Boolean(spec.referenceOnly);
  const repeatability = spec.componentId === "CN-039"
    ? { axis:"y" as const, cadence:"action-row", nativeStridePx:724, normalizedStride:1, preferredOverlapPx:0, maximumSeamOverlapPx:2 }
    : spec.componentId === "CN-042"
      ? { axis:"y" as const, cadence:"paired-level", nativeStridePx:362, normalizedStride:1, preferredOverlapPx:0, maximumSeamOverlapPx:2 }
      : spec.componentId === "CN-043"
        ? { axis:"y" as const, cadence:"paired-level", nativeStridePx:1536, normalizedStride:1, preferredOverlapPx:0, maximumSeamOverlapPx:2 }
        : undefined;
  const sockets = action
    ? [action.socket]
    : identity
      ? [{ contractId:APPROVED_SIGNATURE_CONTRACT_IDS.identityHeaderSocket, geometry:{bounds:identity,safeArea:rect([573/1536,280/1024,953/1536,660/1024]),center:{x:(identity.x+identity.width/2),y:(identity.y+identity.height/2)}}, ownership:"identity-content" as const }]
      : spec.componentId === "CN-012"
        ? [semanticSocket([96/1278,65/1230,1180/1278,1112/1230],[411/1278,380/1230,855/1278,799/1230],[633/1278,589.5/1230],"component")]
        : [];
  const attachmentAnchors = identityBridgeAnchor ? [
    {id:"bridge-attachment",point:{x:identityBridgeAnchor[0]/spec.width,y:identityBridgeAnchor[1]/spec.height},edge:"bottom" as const},
  ] : spec.componentId === "CN-038" ? [
    {id:"left-rail",point:{x:231.210054/1905,y:650/826},edge:"bottom" as const},
    {id:"right-rail",point:{x:1672.361044/1905,y:650/826},edge:"bottom" as const},
    {id:"identity-crown",point:{x:952.5/1905,y:357/826},edge:"top" as const},
  ] : spec.componentId === "CN-040" ? [
    {id:"left-rail",point:{x:120.308308/1672,y:136/941},edge:"top" as const},
    {id:"right-rail",point:{x:1551.124681/1672,y:136/941},edge:"top" as const},
  ] : spec.componentId === "CN-044" ? [
    {id:"left-rail",point:{x:85.177845/1774,y:760/887},edge:"bottom" as const},
    {id:"center-spine",point:{x:885.391975/1774,y:760/887},edge:"bottom" as const},
    {id:"right-rail",point:{x:1688.278689/1774,y:760/887},edge:"bottom" as const},
    {id:"identity-crown",point:{x:887/1774,y:135/887},edge:"top" as const},
  ] : spec.componentId === "CN-045" ? [
    {id:"left-rail",point:{x:116.337101/2172,y:0},edge:"top" as const},
    {id:"center-spine",point:{x:1085.518387/2172,y:0},edge:"top" as const},
    {id:"right-rail",point:{x:2054.739851/2172,y:0},edge:"top" as const},
  ] : spec.componentId === "CN-039" ? [
    {id:"left-top",point:{x:120/2172,y:0},edge:"top" as const},{id:"right-top",point:{x:2052/2172,y:0},edge:"top" as const},
    {id:"left-bottom",point:{x:120/2172,y:1},edge:"bottom" as const},{id:"right-bottom",point:{x:2052/2172,y:1},edge:"bottom" as const},
  ] : spec.componentId === "CN-042" ? [
    {id:"left-top",point:{x:120/2172,y:0},edge:"top" as const},{id:"right-top",point:{x:2052/2172,y:0},edge:"top" as const},
    {id:"left-bottom",point:{x:120/2172,y:1},edge:"bottom" as const},{id:"right-bottom",point:{x:2052/2172,y:1},edge:"bottom" as const},
  ] : spec.componentId === "CN-043" ? [
    {id:"center-top",point:{x:513/1024,y:0},edge:"top" as const},{id:"center-bottom",point:{x:513/1024,y:1},edge:"bottom" as const},
  ] : [];
  return {
    familyId:CABINET_NOIR_FAMILY_ID,
    familyVersion:CABINET_NOIR_FAMILY_VERSION,
    componentId:spec.componentId,
    componentVersion:"1.0.0",
    role:spec.role,
    side:action?.side ?? "none",
    layoutCompatibility:isReference ? [] : ["singleStackAssembly@1.0.0","twinRailAssembly@1.0.0"],
    sockets,
    liveContentContract:spec.componentId === "CN-011" ? APPROVED_SIGNATURE_CONTRACT_IDS.informationalLine : undefined,
    attachmentAnchors,
    repeatability,
    authority:isReference ? "reference-only" : "canonical",
    lifecycle:spec.lifecycle ?? "production",
    runtimeEligibility:isReference ? "runtime-ineligible" : "runtime-eligible",
    certification:{state:"certified",geometryVersion:"1.0.0",evidence:[CABINET_NOIR_GEOMETRY_AUTHORITY]},
    sourceSha256:spec.hash,
    finishId:CABINET_NOIR_FINISH_ID,
    entitlementKey:CABINET_NOIR_ENTITLEMENT_KEY,
    accessibility:{furniture:"decorative",ariaHidden:true,interactive:false,liveContent:action?"socket-content":spec.componentId==="CN-011"?"text":"none",accessibleNameSource:action?"live-label":spec.componentId==="CN-011"?"live-content":undefined},
    sourceGeometry:{widthPx:spec.width,heightPx:spec.height,runtimeScale:spec.componentId==="CN-043"?362/1536:undefined},
    liveContentGeometry:action ? {safeArea:action.text,alignment:"left",fontSizePxAt390:[14,16],lineHeightPxAt390:[18,20]} : spec.componentId === "CN-011" ? {safeArea:rect([326/2172,284/724,1846/2172,440/724]),alignment:"center",recommendedWidthPx:1352,fontSizePxAt390:[14,16],lineHeightPxAt390:[18,20]} : undefined,
    provenance:{sourceAssetPath:handoffSourcePath(spec.path),authorityManifest:CABINET_NOIR_MANIFEST,geometryAuthority:CABINET_NOIR_GEOMETRY_AUTHORITY,sourceMode:"exact-asset",immutable:true},
  };
};

const toAsset = (spec: AssetSpec, sortOrder: number): SignatureAssetDefinition => ({
  id:`master/cabinet-noir/${spec.componentId.toLowerCase()}/v1`,
  familyId:CABINET_NOIR_FAMILY_ID,
  label:spec.label,
  subgroup:spec.subgroup,
  assetKind:spec.kind,
  role:spec.role,
  variant:spec.referenceOnly?"reference-only":"certified-exact-asset",
  sourceAsset:`${CABINET_NOIR_ROOT}/${spec.path}`,
  sourceSha256:spec.hash,
  width:spec.width,
  height:spec.height,
  aspectRatio:spec.width/spec.height,
  glowPadding:full,
  safeInsets:full,
  socketContract:spec.kind==="action"?{title:true,description:true,action:true,icon:true}:spec.componentId==="CN-011"?{statusText:true}:spec.componentId==="CN-012"?{icon:true}:spec.kind==="identity"?{identity:true}:{},
  layoutCapabilities:spec.referenceOnly?[]:["SINGLE","STACK-2","STACK-3","GRID-2"],
  responsiveContract:{proportional:true,phoneSafe:!spec.referenceOnly,minRenderedWidthPx:spec.kind==="micro-part"?44:280},
  stateContract:spec.kind==="action"?states:["default","disabled"],
  tintCapabilities:[],
  tintMode:"none",
  energyMode:"fixed",
  sourceReadiness:"production-ready",
  provenanceManifest:CABINET_NOIR_MANIFEST,
  sourceNumber:Number(spec.componentId.match(/^CN-(\d+)/)?.[1]),
  nestingCapabilities:{canContainChildren:false,acceptedChildKinds:[]},
  lifecycle:spec.lifecycle??"production",
  expressionTier:"signature",
  referenceOnly:spec.referenceOnly??false,
  sortOrder,
  tags:["cabinet-noir","exact-asset",spec.role,spec.referenceOnly?"reference-only":"runtime-eligible"],
  normalizedContract:normalizedContract(spec),
});

const plugAssets = plugSpecs.map(([componentId,label,folder,file,hash,width,height],index)=>toAsset({componentId,label,path:`source/${folder}/${file}`,role:"semantic-plug",width,height,hash,kind:"micro-part",subgroup:"micro-parts"},2030+index));

export const CABINET_NOIR_ASSETS: readonly SignatureAssetDefinition[] = [
  ...productionSpecs.map((spec,index)=>toAsset(spec,2000+index)),
  ...plugAssets,
  ...topperSpecs.map((spec,index)=>toAsset(spec,2070+index)),
  ...referenceSpecs.map((spec,index)=>toAsset(spec,2900+index)),
] as const;

export const CABINET_NOIR_AUDIT_RECORDS: readonly SignatureComponentContract[] = [
  {
    ...normalizedContract({componentId:"CN-043-SUPERSEDED",label:"Superseded Center Spine",path:"99_DO_NOT_DEPLOY/CN-043_SUPERSEDED_center-spine.png",role:"superseded-center-spine",width:887,height:1774,hash:"039c263f708132c892c5ec18747aaf5d459f1e293928770047cf2414d49818d1",kind:"frame",subgroup:"frames-stages",lifecycle:"superseded",referenceOnly:true}),
    authority:"audit-only", lifecycle:"superseded", runtimeEligibility:"runtime-ineligible", certification:{state:"revoked",geometryVersion:"1.0.0",evidence:[CABINET_NOIR_MANIFEST]},
  },
  {
    ...normalizedContract({componentId:"CN-040-DUPLICATE",label:"Duplicate Bottom Cap",path:"99_DO_NOT_DEPLOY/CN-040_DUPLICATE_single-stack-bottom-cap.png",role:"duplicate-bottom-cap",width:1672,height:941,hash:"1d09c0493c4984f2ebc5d9c8992f47bc826c10085d9c4b495b7ab6fcd6c13bdb",kind:"footer",subgroup:"frames-stages",lifecycle:"duplicate",referenceOnly:true}),
    authority:"audit-only", lifecycle:"duplicate", runtimeEligibility:"runtime-ineligible",
  },
] as const;

export const CABINET_NOIR_SINGLE_STACK_RECIPE: SignatureAssemblyRecipe = {
  contractId:SIGNATURE_ASSEMBLY_CONTRACT_IDS.singleStack,
  familyId:CABINET_NOIR_FAMILY_ID,
  familyVersion:CABINET_NOIR_FAMILY_VERSION,
  recipeId:"cabinet-noir-single-stack",
  recipeVersion:"1.0.0",
  fixedTop:[{role:"identity-header",componentId:"CN-037",ownsSockets:[APPROVED_SIGNATURE_CONTRACT_IDS.identityHeaderSocket]},{role:"single-stack-bridge",componentId:"CN-038"}],
  actionUnit:{id:"action-row",kind:"row",capacity:1,masterStrategy:{mode:"alternating",sequence:[{role:"standard-action",componentId:"CN-004",side:"left",ownsSockets:[APPROVED_SIGNATURE_CONTRACT_IDS.semanticPlugSocket]},{role:"standard-action",componentId:"CN-005",side:"right",ownsSockets:[APPROVED_SIGNATURE_CONTRACT_IDS.semanticPlugSocket]}]},socketOwnership:"action-master"},
  repeatInterval:{id:"single-stack-rail-interval",components:[{role:"single-stack-repeat-rails",componentId:"CN-039"}],axis:"y",cadence:"action-row",nativeStridePx:724,normalizedStride:1,preferredOverlapPx:0,maximumSeamOverlapPx:2,placement:"between-action-units"},
  structuralTermination:{role:"single-stack-termination",componentId:"CN-040"},
  optionalDecorativeTermination:{role:"decorative-termination",componentId:"CN-041"},
  oddActionTreatment:{mode:"not-applicable"},
  attachmentOrder:["identity-header","single-stack-bridge","action-row","single-stack-rail-interval","single-stack-termination","decorative-termination"],
  certificationLimits:{minimumActions:1,launchCertifiedActionCounts:[1,2,3,4,5,6],maximumLaunchCertifiedActions:6},
  geometry:{
    coordinateWidthPx:2172,
    unitStridePx:724,
    fixedTop:[
      {role:"identity-header",verticalReference:"assembly-origin",xPx:0,yOffsetPx:-392.79437309,scale:1,zOrder:40,attachmentAnchorId:"bridge-attachment",targetXPx:1086.957789325},
      {role:"single-stack-bridge",verticalReference:"assembly-origin",xPx:0,yOffsetPx:0,scale:1.34059513,zOrder:10,attachmentAnchorId:"left-rail",targetXPx:120},
    ],
    actionSlots:[
      {role:"standard-action",side:"left",verticalReference:"unit-start",xPx:0,yOffsetPx:0,scale:1,zOrder:20},
      {role:"standard-action",side:"right",verticalReference:"unit-start",xPx:0,yOffsetPx:0,scale:1,zOrder:20},
    ],
    repeatComponents:[{role:"single-stack-repeat-rails",verticalReference:"unit-start",xPx:0,yOffsetPx:0,scale:1,zOrder:10,attachmentAnchorId:"left-top",targetXPx:120}],
    structuralTermination:{role:"single-stack-termination",verticalReference:"content-end",xPx:0,yOffsetPx:0,scale:1.350278091,zOrder:10,attachmentAnchorId:"left-rail",targetXPx:120},
    decorativeTermination:{role:"decorative-termination",verticalReference:"content-end",xPx:0,yOffsetPx:1270.611884831,scale:1,zOrder:5},
  },
};

export const CABINET_NOIR_TWIN_RAIL_RECIPE: SignatureAssemblyRecipe = {
  contractId:SIGNATURE_ASSEMBLY_CONTRACT_IDS.twinRail,
  familyId:CABINET_NOIR_FAMILY_ID,
  familyVersion:CABINET_NOIR_FAMILY_VERSION,
  recipeId:"cabinet-noir-twin-rail",
  recipeVersion:"1.0.0",
  fixedTop:[{role:"identity-header",componentId:"CN-037",ownsSockets:[APPROVED_SIGNATURE_CONTRACT_IDS.identityHeaderSocket]},{role:"twin-rail-crown-bridge",componentId:"CN-044"}],
  actionUnit:{id:"paired-action-level",kind:"paired-level",capacity:2,masterStrategy:{mode:"side-specific",masters:{left:{role:"standard-action",componentId:"CN-004",side:"left",ownsSockets:[APPROVED_SIGNATURE_CONTRACT_IDS.semanticPlugSocket]},right:{role:"standard-action",componentId:"CN-005",side:"right",ownsSockets:[APPROVED_SIGNATURE_CONTRACT_IDS.semanticPlugSocket]}}},socketOwnership:"action-master"},
  repeatInterval:{id:"twin-rail-interval",components:[{role:"twin-rail-repeat-outer",componentId:"CN-042"},{role:"twin-rail-repeat-spine",componentId:"CN-043",side:"center"}],axis:"y",cadence:"paired-level",nativeStridePx:362,normalizedStride:1,preferredOverlapPx:0,maximumSeamOverlapPx:2,placement:"between-action-units"},
  structuralTermination:{role:"twin-rail-termination",componentId:"CN-045"},
  oddActionTreatment:{mode:"full-width-after-complete-pairs",terminateRepeatsAfterLastCompleteUnit:true,finalActionMaster:{role:"hero-action",componentId:"CN-002",side:"right",ownsSockets:[APPROVED_SIGNATURE_CONTRACT_IDS.semanticPlugSocket]},transitionFurniture:{role:"odd-action-finisher",componentId:"CN-010"},transitionIsInteractive:false,structuralTerminationFollows:true},
  attachmentOrder:["identity-header","twin-rail-crown-bridge","paired-action-level","twin-rail-interval","odd-action-finisher","twin-rail-termination"],
  certificationLimits:{minimumActions:2,launchCertifiedActionCounts:[2,3,4,5,6],structuralProofOnlyActionCounts:[7],maximumLaunchCertifiedActions:6},
  geometry:{
    coordinateWidthPx:2172,
    unitStridePx:362,
    fixedTop:[
      {role:"identity-header",verticalReference:"assembly-origin",xPx:0,yOffsetPx:-753.22772375,scale:1,zOrder:40,attachmentAnchorId:"bridge-attachment",targetXPx:1086.327482546},
      {role:"twin-rail-crown-bridge",verticalReference:"assembly-origin",xPx:0,yOffsetPx:0,scale:1.205164358,zOrder:10,attachmentAnchorId:"left-rail",targetXPx:120},
    ],
    actionSlots:[
      {role:"standard-action",side:"left",verticalReference:"unit-start",xPx:0,yOffsetPx:0,scale:.5,zOrder:20},
      {role:"standard-action",side:"right",verticalReference:"unit-start",xPx:1086,yOffsetPx:0,scale:.5,zOrder:20},
    ],
    repeatComponents:[
      {role:"twin-rail-repeat-outer",verticalReference:"unit-start",xPx:0,yOffsetPx:0,scale:1,zOrder:10,attachmentAnchorId:"left-top",targetXPx:120},
      {role:"twin-rail-repeat-spine",side:"center",verticalReference:"unit-start",xPx:0,yOffsetPx:0,scale:362/1536,zOrder:15,attachmentAnchorId:"center-top",targetXPx:1086},
    ],
    structuralTermination:{role:"twin-rail-termination",verticalReference:"content-end",xPx:4.047172791,yOffsetPx:0,scale:.996696894,zOrder:10,attachmentAnchorId:"left-rail",targetXPx:120},
    oddAction:{
      action:{role:"hero-action",side:"right",verticalReference:"unit-start",xPx:0,yOffsetPx:0,scale:1,zOrder:20},
      transition:{role:"odd-action-finisher",verticalReference:"odd-action-end",xPx:0,yOffsetPx:0,scale:1,zOrder:10},
    },
  },
};

export const CABINET_NOIR_ASSEMBLY_RECIPES = [CABINET_NOIR_SINGLE_STACK_RECIPE,CABINET_NOIR_TWIN_RAIL_RECIPE] as const;

export const CABINET_NOIR_GEOMETRY = {
  authority:CABINET_NOIR_GEOMETRY_AUTHORITY,
  actionGeometry,
  identityGeometry,
  informationalLine:{componentId:"CN-011",safeArea:rect([326/2172,284/724,1846/2172,440/724]),guardedLane:rect([302/2172,260/724,1870/2172,464/724]),recommendedTextWidthSourcePx:1352},
  semanticPlugChassis:{componentId:"CN-012",bounds:rect([96/1278,65/1230,1180/1278,1112/1230]),safeArea:rect([411/1278,380/1230,855/1278,799/1230]),center:{x:633/1278,y:589.5/1230}},
  assemblyFrame:{sourceWidthPx:2172,outerRailCentersPx:[120,2052],centerSpinePx:1086},
  structuralAttachments:{
    "CN-038":{sourceOuterAnchorCentersPx:[231.210054,1672.361044],sourceAttachmentYPx:650,scale:1.34059513,translateXPx:-189.959072,targetOuterAnchorsPx:[120,2052],crownSocketAnchorPx:[952.5,357]},
    "CN-040":{sourceOuterAnchorCentersPx:[120.308308,1551.124681],sourceAttachmentYPx:136,scale:1.350278091,translateXPx:-42.449672,targetOuterAnchorsPx:[120,2052]},
    "CN-044":{sourceOuterAnchorCentersPx:[85.177845,1688.278689],sourceCenterAnchorXPx:885.391975,sourceAttachmentYPx:760,scale:1.205164358,translateXPx:17.346697,targetAnchorsPx:[120,1086,2052],crownSocketAnchorPx:[887,135]},
    "CN-045":{sourceTopAnchorCentersPx:[116.337101,1085.518387,2054.739851],targetAnchorsPx:[120,1086,2052],attachmentYPx:0},
  },
  twinRailClearance:{transparentCenterCorridorPx:[181,1989],leftPlugEnvelopePx:[181,0,965.078125,362],rightPlugEnvelopePx:[1206.411458,0,1989,362]},
  phone390:{certified:true,sourceToCardScale:390/2172},
  stockPlugFit:{componentIds:plugSpecs.map(([id])=>id),contractId:APPROVED_SIGNATURE_CONTRACT_IDS.semanticPlugSocket,certified:true},
} as const;
