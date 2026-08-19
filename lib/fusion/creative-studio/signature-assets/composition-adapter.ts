import type { CreativeCompositionBlock, CreativeCompositionNode } from "../composition";
import type {
  SignatureAssemblyError,
  SignatureAssemblyPlan,
  SignatureAssemblyPlanInstance,
  SignatureAssemblyResult,
} from "./assembly";
import { SIGNATURE_ASSETS, SIGNATURE_FAMILIES } from "./registry";
import { isSignatureComponentRuntimeEligible, type SignatureVersion } from "./types";

export type SignatureCompositionFixtureContent = {
  identity?: { src: string; alt: string };
};

export type SignatureCompositionAdapterOptions = {
  blockId?: string;
  label?: string;
  fixtureContent?: SignatureCompositionFixtureContent;
  background?: string;
};

export type SignatureCompositionPlan = {
  adapterVersion: "1.0.0";
  familyId: string;
  familyVersion: SignatureVersion;
  recipeId: string;
  recipeVersion: SignatureVersion;
  certificationStatus: SignatureAssemblyPlan["certificationStatus"];
  coordinateAuthority: SignatureAssemblyPlan["coordinateAuthority"];
  nativeBounds: SignatureAssemblyPlan["nativeBounds"];
  block: CreativeCompositionBlock;
  phone390: { widthPx: 390; heightPx: number; scale: number };
};

export type SignatureCompositionAdapterResult =
  | { ok: true; composition: SignatureCompositionPlan }
  | { ok: false; errors: readonly SignatureAssemblyError[] };

function actionDestination(destination: string) {
  if (/^tel:/i.test(destination)) return { actionType: "call", href: destination } as const;
  if (/^mailto:/i.test(destination)) return { actionType: "email", href: destination.replace(/^mailto:/i, "") } as const;
  return { actionType: "website", href: destination } as const;
}

function nodeForInstance(
  plan: SignatureAssemblyPlan,
  instance: SignatureAssemblyPlanInstance,
  fixtureContent?: SignatureCompositionFixtureContent,
): CreativeCompositionNode {
  const isAction=instance.classification==="live-action";
  const identity=instance.liveContentOwnership.identitySocket?fixtureContent?.identity:undefined;
  return {
    id:instance.instanceId,
    primitive:isAction?"button":"image",
    x:instance.placement.normalized.x,
    y:instance.placement.normalized.y,
    width:instance.placement.normalized.width,
    height:instance.placement.normalized.height,
    zIndex:instance.zOrder,
    name:instance.semanticRole,
    locked:!isAction,
    visible:true,
    anchor:"top-left",
    props:{
      signatureAssetId:instance.sourceAssetId,
      signatureFamilyId:plan.familyId,
      signatureFamilyVersion:plan.familyVersion,
      signatureRecipeId:plan.recipeId,
      signatureRecipeVersion:plan.recipeVersion,
      signatureComponentId:instance.sourceComponentId,
      signatureComponentVersion:instance.sourceComponentVersion,
      signatureAssemblyInstanceId:instance.instanceId,
      signatureRole:instance.semanticRole,
      signatureClassification:instance.classification,
      signatureStructural:instance.structural,
      signatureDecorative:instance.decorative,
      signatureInteractive:instance.interactive,
      signatureNativePlacement:instance.placement.native,
      signatureNormalizedPlacement:instance.placement.normalized,
      signatureScaleAuthority:instance.placement.sourceScale,
      signatureAttachmentAnchorsUsed:instance.attachmentAnchorsUsed,
      signatureRepeatIndex:instance.repeatIndex,
      signatureRepeatStridePx:instance.repeatStridePx,
      signatureSocketOwnership:instance.socketOwnership,
      signatureLiveContentOwnership:instance.liveContentOwnership,
      signatureLayout:instance.layout,
      signatureRuntimeEligibility:instance.runtimeEligibility,
      signatureCertificationProvenance:instance.certificationProvenance,
      signatureLayoutCertificationStatus:plan.certificationStatus,
      signatureMirrored:false,
      signatureCompensatingOverlapPx:plan.preferredOverlapPx,
      src:instance.sourceAsset,
      fit:"contain",
      decorative:instance.decorative||instance.structural||instance.classification==="live-content",
      alt:"",
      opacity:1,
      ...(identity?{identityContentUrl:identity.src,identityContentAlt:identity.alt}:{}),
      ...(instance.action?{
        signatureActionId:instance.action.id,
        elementKind:"button",
        label:instance.action.label,
        ...actionDestination(instance.action.destination),
        accessibleLabel:instance.action.accessibilityLabel,
        trackingName:instance.action.analyticsId,
        disabled:instance.action.state==="disabled",
        signatureActionState:instance.action.state,
      }:{}),
    },
  };
}

export function adaptSignatureAssemblyResult(
  result: SignatureAssemblyResult,
  options: SignatureCompositionAdapterOptions = {},
): SignatureCompositionAdapterResult {
  if (!result.ok) return result;
  const plan=result.plan;
  const scale=390/plan.nativeBounds.widthPx;
  const block: CreativeCompositionBlock = {
    version:1,
    id:options.blockId??`${plan.familyId}:${plan.recipeId}:${plan.requestedActionCount}`,
    label:options.label??`${plan.familyId} ${plan.layoutMode} ${plan.requestedActionCount}`,
    nodes:plan.instances.map((instance)=>nodeForInstance(plan,instance,options.fixtureContent)),
    background:{kind:"solid",value:options.background??"#030303"},
    mobileFallback:"scale",
    safeAreaPaddingPx:0,
    pageHeightPx:plan.nativeBounds.heightPx*scale,
  };
  return {ok:true,composition:{adapterVersion:"1.0.0",familyId:plan.familyId,familyVersion:plan.familyVersion,recipeId:plan.recipeId,recipeVersion:plan.recipeVersion,certificationStatus:plan.certificationStatus,coordinateAuthority:plan.coordinateAuthority,nativeBounds:plan.nativeBounds,block,phone390:{widthPx:390,heightPx:plan.nativeBounds.heightPx*scale,scale}}};
}

export type SignatureStandaloneComponentInput = {
  familyId: string;
  familyVersion: SignatureVersion;
  componentId: string;
  componentVersion: SignatureVersion;
  instanceId: string;
  liveText?: string;
  identityContent?: { src: string; alt: string };
};

export function adaptSignatureStandaloneComponent(input: SignatureStandaloneComponentInput): CreativeCompositionBlock | null {
  const family=SIGNATURE_FAMILIES.find((candidate)=>candidate.id===input.familyId&&candidate.version===input.familyVersion);
  const asset=SIGNATURE_ASSETS.find((candidate)=>candidate.familyId===input.familyId&&candidate.normalizedContract?.componentId===input.componentId&&candidate.normalizedContract.componentVersion===input.componentVersion);
  const component=asset?.normalizedContract;
  if (!family||!asset||!component||!isSignatureComponentRuntimeEligible(component)) return null;
  const informational=Boolean(component.liveContentContract);
  const identity=component.sockets.some((socket)=>socket.contractId.startsWith("identityHeaderSocket@"));
  return {
    version:1,
    id:`standalone:${input.instanceId}`,
    label:`${family.label} ${component.role}`,
    nodes:[{
      id:input.instanceId,
      primitive:"image",
      x:0,y:0,width:1,height:1,zIndex:1,name:component.role,locked:true,visible:true,anchor:"top-left",
      props:{signatureAssetId:asset.id,signatureFamilyId:family.id,signatureFamilyVersion:family.version,signatureComponentId:component.componentId,signatureComponentVersion:component.componentVersion,signatureAssemblyInstanceId:input.instanceId,signatureRole:component.role,signatureClassification:informational||identity?"live-content":"decorative",signatureStructural:false,signatureDecorative:!informational&&!identity,signatureInteractive:false,signatureNativePlacement:{xPx:0,yPx:0,widthPx:asset.width,heightPx:asset.height},signatureNormalizedPlacement:{x:0,y:0,width:1,height:1},signatureScaleAuthority:{mode:"uniform",x:1,y:1},signatureSocketOwnership:component.sockets.map((socket)=>socket.contractId),signatureLiveContentOwnership:{actionText:false,semanticPlug:false,identitySocket:identity,informationalLine:informational},signatureRuntimeEligibility:component.runtimeEligibility,signatureCertificationProvenance:component.certification,signatureLayoutCertificationStatus:"launch-certified",signatureMirrored:false,signatureCompensatingOverlapPx:0,src:asset.sourceAsset,fit:"contain",decorative:!informational&&!identity,alt:"",informationalText:input.liveText,identityContentUrl:input.identityContent?.src,identityContentAlt:input.identityContent?.alt},
    }],
    background:{kind:"solid",value:"#030303"},mobileFallback:"scale",safeAreaPaddingPx:0,pageHeightPx:asset.height/asset.width*390,
  };
}
