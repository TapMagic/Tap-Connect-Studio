import type { TapConnectCardConfig } from "@/lib/brand/tap-card";
import type { CreativeCompositionBlock, CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";
import { resolveSignatureAssembly, type SignatureAssemblyActionSelection, type SignatureAssemblyLayoutMode } from "@/lib/fusion/creative-studio/signature-assets/assembly";
import { adaptSignatureAssemblyResult } from "@/lib/fusion/creative-studio/signature-assets/composition-adapter";
import { CABINET_NOIR_FAMILY_ID, CABINET_NOIR_FAMILY_VERSION } from "@/lib/fusion/creative-studio/signature-assets/cabinet-noir";
import { SIGNATURE_ASSEMBLY_AUTHORING_CONTRACT } from "@/lib/fusion/creative-studio/signature-assets/authoring";
import type { StudioSemanticResource } from "@/lib/fusion/creative-studio/platform/semantic-resource-slot";

/** The local review route rebuilds this exact Card before redirecting. */
export const STUDIO_SLICE_1_REVIEW_FIXTURE_VERSION = "phase-1-slice-1-curated-golden-v2";

const action = (id: string, label: string, destination: string, plugComponentId: string): SignatureAssemblyActionSelection => ({
  id, label, destination,
  actionType: destination.startsWith("tel:") ? "call" : destination.startsWith("mailto:") ? "email" : "website",
  plugComponentId, accessibilityLabel: label, state: "default", analyticsId: `review-${id}`, textAlign: "center", textSize: "medium",
});

const REVIEW_ACTIONS = [
  action("call", "Call the studio", "tel:+13524332833", "CN-013"),
  action("website", "Visit our website", "https://example.com", "CN-014"),
  action("email", "Send an email", "mailto:hello@example.com", "CN-015"),
  action("directions", "Get directions", "https://maps.google.com", "CN-016"),
] as const;

function curatedModule(layoutMode: Extract<SignatureAssemblyLayoutMode, "single-stack" | "twin-rail">, order: number, identitySrc?: string): CreativeCompositionNode {
  const label = `Cabinet Noir ${layoutMode === "single-stack" ? "Single Stack" : "Twin Rail"}`;
  const blockId = `review-cabinet-noir-${layoutMode}`;
  const input = {
    familyId: CABINET_NOIR_FAMILY_ID, familyVersion: CABINET_NOIR_FAMILY_VERSION,
    recipeId: layoutMode === "single-stack" ? "cabinet-noir-single-stack" : "cabinet-noir-twin-rail",
    recipeVersion: "1.0.0" as const, layoutMode, requestedActionCount: 4,
    actions: [...REVIEW_ACTIONS], decorativeFurniture: {},
  };
  const adapted = adaptSignatureAssemblyResult(resolveSignatureAssembly(input), {
    blockId, label,
    fixtureContent: identitySrc ? { identity: { src: identitySrc, alt: "The Monkey Cage identity" } } : undefined,
  });
  if (!adapted.ok) throw new Error(`The deterministic ${label} fixture failed to compile: ${adapted.errors.map((error)=>error.message).join("; ")}`);
  const identity: StudioSemanticResource | undefined = identitySrc ? {
    src: identitySrc,
    alt: "The Monkey Cage identity",
    source: "brand",
    sourceLabel: "Brand identity",
    provenance: "brand",
  } : undefined;
  const composition = { ...adapted.composition.block, signatureAssembly: { contractId:SIGNATURE_ASSEMBLY_AUTHORING_CONTRACT, input, identityContent: identity, identityDefault: identity } };
  return {
    id:`review-module-${layoutMode}`, primitive:"frame", compositionKind:"module", parentId:null, siblingOrder:order,
    x:0,y:0,width:1,height:1,zIndex:order+1,minHeightPx:Math.ceil(composition.pageHeightPx ?? 56),name:label,
    props:{label,componentKind:"curated-system",elementKind:"curated-system",curatedFamilyId:CABINET_NOIR_FAMILY_ID,curatedLayoutMode:layoutMode,spacingAbovePx:0,spacingBelowPx:0},
    moduleComposition:composition,
  };
}

function ordinaryNode(id: string, primitive: CreativeCompositionNode["primitive"], order: number, name: string, props: Record<string, unknown>, minHeightPx: number): CreativeCompositionNode {
  return { id, primitive, compositionKind:"module", parentId:null, siblingOrder:order, x:0,y:0,width:1,height:1,zIndex:order+1,minHeightPx,name,props:{...props,spacingAbovePx:0,spacingBelowPx:0} };
}

function buildReviewRoot(config: TapConnectCardConfig): CreativeCompositionBlock {
  const text = ordinaryNode("review-text", "text", 0, "Welcome text", {elementKind:"text",text:"Welcome to The Monkey Cage — choose how you would like to connect.",textRole:"body",fontFamily:"Inter, system-ui, sans-serif",fontSize:18,fontWeight:600,lineHeight:1.25,align:"center",color:"#f8fafc",flowWidthPercent:92,flowAlignment:"center"}, 54);
  const button = ordinaryNode("review-standard-button", "button", 1, "Standard Button", {elementKind:"button",componentKind:"button",label:"Explore the Card",actionType:"website",href:"https://example.com",accessibleLabel:"Explore the Card",fill:"#b8ff2c",color:"#07100a",radius:14,flowWidthPercent:86,flowAlignment:"center"}, 58);
  const divider = ordinaryNode("review-divider", "border", 2, "Champagne glow Divider", {elementKind:"divider",componentKind:"divider",color:"#d6b36a",opacity:.92,thickness:3,style:"double",decorativeTreatment:"metallic",flowWidthPercent:72,flowAlignment:"center",flowInsetPx:10}, 16);
  const container: CreativeCompositionNode = { id:"review-container",primitive:"frame",compositionKind:"container",parentId:null,siblingOrder:3,x:0,y:0,width:1,height:1,zIndex:4,name:"Smoked Glass Container",props:{componentKind:"container",elementKind:"container",layout:"flow",autoHeight:true,surfaceTreatment:"smoked_glass",fill:"#101923",opacity:.78,blurPx:14,borderWidthPx:1,borderColor:"#8bdcff",radiusPx:18,shadowPx:18,padding:12,gap:6,spacingAbovePx:0,spacingBelowPx:0} };
  const containerText = ordinaryNode("review-container-text", "text", 0, "Container text", {elementKind:"text",text:"This Container accepts ordinary Modules without becoming a fixed Curated assembly.",fontSize:15,fontWeight:500,lineHeight:1.25,align:"left",color:"#dbeafe"}, 46);
  containerText.parentId=container.id;
  return {
    version:1,id:`studio-review:${STUDIO_SLICE_1_REVIEW_FIXTURE_VERSION}`,label:"Product Owner Slice 1 Review Card",
    parentAuthority:{version:1,layout:"flow",cardGapPx:6},
    nodes:[text,button,divider,container,containerText,curatedModule("single-stack",4,config.headerLogoUrl),curatedModule("twin-rail",5,config.headerLogoUrl)],
    background:{kind:"solid",value:"#070b10"},mobileFallback:"scale",safeAreaPaddingPx:8,pageHeightPx:520,
  };
}

export function prepareCompositionParentReviewDraft(config: TapConnectCardConfig): { config: TapConnectCardConfig; changed: boolean } {
  return { changed:true, config:{...config,version:Math.max(3,config.version ?? 1) as 3,documentName:"The Monkey Cage · Slice 1 Review",rootComposition:buildReviewRoot(config),rootCanvasMinHeightPx:520} };
}
