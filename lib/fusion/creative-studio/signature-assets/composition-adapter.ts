import type { CreativeCompositionBlock, CreativeCompositionNode } from "../composition";
import type {
  SignatureAssemblyActionSelection,
  SignatureAssemblyError,
  SignatureAssemblyPlan,
  SignatureAssemblyPlanInstance,
  SignatureAssemblyResult,
} from "./assembly";
import { SIGNATURE_ASSETS, SIGNATURE_FAMILIES } from "./registry";
import { isSignatureComponentRuntimeEligible, type SignatureVersion } from "./types";
import type { StudioSemanticResource } from "../platform/semantic-resource-slot";

export type SignatureCompositionFixtureContent = {
  identity?: StudioSemanticResource | { src: string; alt: string };
};

export type SignatureCompositionAdapterOptions = {
  blockId?: string;
  label?: string;
  fixtureContent?: SignatureCompositionFixtureContent;
  background?: string;
  appearance?: {
    contractId: string;
    contractVersion: string;
    semanticOptionIds: Readonly<Record<string, string>>;
    semanticRendererValues: Readonly<Record<string, string>>;
    textTreatmentContractId?: string;
    textTreatmentContractVersion?: string;
    textTreatmentId?: string;
    textTreatmentRecipe?: string;
  };
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

function actionDestination(destination: string, explicitActionType?: string) {
  if (explicitActionType) return { actionType: explicitActionType, href: /^mailto:/i.test(destination) ? destination.replace(/^mailto:/i, "") : destination };
  if (/^tel:/i.test(destination)) return { actionType: "call", href: destination } as const;
  if (/^mailto:/i.test(destination)) return { actionType: "email", href: destination.replace(/^mailto:/i, "") } as const;
  return { actionType: "website", href: destination } as const;
}

function nodeForInstance(
  plan: SignatureAssemblyPlan,
  instance: SignatureAssemblyPlanInstance,
  assemblyInstanceId: string,
  fixtureContent?: SignatureCompositionFixtureContent,
  appearance?: SignatureCompositionAdapterOptions["appearance"],
): CreativeCompositionNode {
  const isAction=instance.classification==="live-action";
  const owningActionId = instance.action?.id
    ?? (instance.parentInstanceId
      ? plan.instances.find((candidate) => candidate.instanceId === instance.parentInstanceId)?.action?.id
      : undefined);
  const identity=instance.liveContentOwnership.identitySocket?fixtureContent?.identity:undefined;
  return {
    // Resolver part ids are deterministic inside a recipe. The composition
    // block id scopes them to a specific inserted Curated object so two copies
    // of the same layout can coexist without cross-selection or cross-editing.
    id:`${assemblyInstanceId}:${instance.instanceId}`,
    primitive:isAction?"button":"image",
    x:instance.placement.normalized.x,
    y:instance.placement.normalized.y,
    width:instance.placement.normalized.width,
    height:instance.placement.normalized.height,
    zIndex:instance.zOrder,
    name:instance.semanticRole,
    // Curated System geometry is compiler-owned. Every compiled part remains
    // selectable for Edit Contents, but never independently transformable.
    locked:true,
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
      signatureAssemblyInstanceId:assemblyInstanceId,
      signaturePartInstanceId:instance.instanceId,
      signatureActionId:owningActionId,
      signatureRole:instance.semanticRole,
      signatureClassification:instance.classification,
      signatureParentPartInstanceId:instance.parentInstanceId,
      signatureDepthTreatment:instance.semanticRole==="semantic-plug"?"raised-contact":undefined,
      signatureAppearanceContractId:appearance?.contractId,
      signatureAppearanceContractVersion:appearance?.contractVersion,
      signatureAppearanceOptionIds:appearance?.semanticOptionIds,
      signatureAppearanceRendererValues:appearance?.semanticRendererValues,
      signatureTextTreatmentContractId:appearance?.textTreatmentContractId,
      signatureTextTreatmentContractVersion:appearance?.textTreatmentContractVersion,
      signatureTextTreatmentId:appearance?.textTreatmentId,
      signatureTextTreatmentRecipe:appearance?.textTreatmentRecipe,
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
      signaturePresentationMode:plan.actionPresentationMode,
      signatureLayoutMode:plan.layoutMode,
      signatureActionRowHeightPx:plan.actionRowHeightPx,
      signatureMirrored:false,
      signatureCompensatingOverlapPx:plan.preferredOverlapPx,
      signatureVisualContinuationOverlapPx:plan.visualContinuationOverlapPx,
      src:instance.sourceAsset,
      fit:"contain",
      decorative:instance.decorative||instance.structural||instance.classification==="live-content",
      alt:"",
      opacity:1,
      ...(identity?{identityContentUrl:identity.src,identityContentAlt:identity.alt,identityResourceVisual:"visual" in identity?identity.visual:undefined}:{}),
      ...(instance.action?{
        signatureActionId:instance.action.id,
        elementKind:"button",
        label:instance.action.label,
        ...actionDestination(instance.action.destination, instance.action.actionType),
        accessibleLabel:instance.action.accessibilityLabel,
        trackingName:instance.action.analyticsId,
        disabled:instance.action.state==="disabled",
        signatureActionState:instance.action.state,
        signatureTextAlign:instance.action.textAlign??"center",
        signatureTextSize:instance.action.textSize??"medium",
        signatureTextSizePx:instance.action.textSizePx,
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
  const blockId=options.blockId??`${plan.familyId}:${plan.recipeId}:${plan.requestedActionCount}`;
  const block: CreativeCompositionBlock = {
    version:1,
    id:blockId,
    label:options.label??`${plan.familyId} ${plan.layoutMode} ${plan.requestedActionCount}`,
    nodes:plan.instances.map((instance)=>nodeForInstance(plan,instance,blockId,options.fixtureContent,options.appearance)),
    background:options.background?{kind:"solid",value:options.background}:{kind:"none"},
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
  identityContent?: StudioSemanticResource | { src: string; alt: string };
};

export type SignatureStandaloneActionInput = {
  familyId: string;
  familyVersion: SignatureVersion;
  componentId: string;
  componentVersion: SignatureVersion;
  instanceId: string;
  action: SignatureAssemblyActionSelection;
};

/**
 * Production-renderer proof/consumer for a Cabinet action outside a Curated
 * recipe. It uses the component's uncompressed source canvas and socket;
 * compact-stacked projection is deliberately a recipe-only behavior.
 */
export function adaptSignatureStandaloneAction(input: SignatureStandaloneActionInput): CreativeCompositionBlock | null {
  const family=SIGNATURE_FAMILIES.find((candidate)=>candidate.id===input.familyId&&candidate.version===input.familyVersion);
  const asset=SIGNATURE_ASSETS.find((candidate)=>candidate.familyId===input.familyId&&candidate.normalizedContract?.componentId===input.componentId&&candidate.normalizedContract.componentVersion===input.componentVersion);
  const component=asset?.normalizedContract;
  const plugAsset=SIGNATURE_ASSETS.find((candidate)=>candidate.familyId===input.familyId&&candidate.normalizedContract?.componentId===input.action.plugComponentId);
  const plug=plugAsset?.normalizedContract;
  const socket=component?.sockets.find((candidate)=>candidate.contractId.startsWith("semanticPlugSocket@"));
  if (!family||!asset||!component||!plugAsset||!plug||!socket||!isSignatureComponentRuntimeEligible(component)||!isSignatureComponentRuntimeEligible(plug)) return null;
  const bounds=socket.geometry.bounds;
  const socketWidthPx=bounds.width*asset.width;
  const socketHeightPx=bounds.height*asset.height;
  const plugAspect=plugAsset.width/plugAsset.height;
  let plugHeightPx=socketHeightPx;
  let plugWidthPx=plugHeightPx*plugAspect;
  if (plugWidthPx>socketWidthPx) { plugWidthPx=socketWidthPx; plugHeightPx=plugWidthPx/plugAspect; }
  const centerXPx=socket.geometry.center.x*asset.width;
  const centerYPx=socket.geometry.center.y*asset.height;
  const plugRect={xPx:centerXPx-plugWidthPx/2,yPx:centerYPx-plugHeightPx/2,widthPx:plugWidthPx,heightPx:plugHeightPx};
  const destination=actionDestination(input.action.destination,input.action.actionType);
  const common={signatureFamilyId:family.id,signatureFamilyVersion:family.version,signaturePresentationMode:"standalone",signatureLayoutCertificationStatus:"launch-certified",signatureMirrored:false,signatureCompensatingOverlapPx:0};
  return {
    version:1,id:`standalone:${input.instanceId}`,label:`${family.label} standalone action`,
    nodes:[
      {id:input.instanceId,primitive:"button",x:0,y:0,width:1,height:1,zIndex:20,name:component.role,locked:true,visible:true,anchor:"top-left",props:{...common,signatureAssetId:asset.id,signatureComponentId:component.componentId,signatureComponentVersion:component.componentVersion,signatureAssemblyInstanceId:input.instanceId,signatureRole:component.role,signatureClassification:"live-action",signatureStructural:false,signatureDecorative:false,signatureInteractive:true,signatureNativePlacement:{xPx:0,yPx:0,widthPx:asset.width,heightPx:asset.height},signatureNormalizedPlacement:{x:0,y:0,width:1,height:1},signatureScaleAuthority:{mode:"uniform",x:1,y:1},signatureSocketOwnership:component.sockets.map((candidate)=>candidate.contractId),signatureLiveContentOwnership:{actionText:true,semanticPlug:true,identitySocket:false,informationalLine:false},signatureRuntimeEligibility:component.runtimeEligibility,signatureCertificationProvenance:component.certification,src:asset.sourceAsset,fit:"contain",decorative:false,alt:"",signatureActionId:input.action.id,elementKind:"button",label:input.action.label,...destination,accessibleLabel:input.action.accessibilityLabel,trackingName:input.action.analyticsId,disabled:input.action.state==="disabled",signatureActionState:input.action.state,signatureTextAlign:input.action.textAlign??"center",signatureTextSize:input.action.textSize??"medium"}},
      {id:`${input.instanceId}:plug`,primitive:"image",x:plugRect.xPx/asset.width,y:plugRect.yPx/asset.height,width:plugRect.widthPx/asset.width,height:plugRect.heightPx/asset.height,zIndex:30,name:"semantic-plug",locked:true,visible:true,anchor:"top-left",props:{...common,signatureAssetId:plugAsset.id,signatureComponentId:plug.componentId,signatureComponentVersion:plug.componentVersion,signatureAssemblyInstanceId:input.instanceId,signatureRole:"semantic-plug",signatureClassification:"live-content",signatureDepthTreatment:"raised-contact",signatureStructural:false,signatureDecorative:false,signatureInteractive:false,signatureNativePlacement:plugRect,signatureNormalizedPlacement:{x:plugRect.xPx/asset.width,y:plugRect.yPx/asset.height,width:plugRect.widthPx/asset.width,height:plugRect.heightPx/asset.height},signatureScaleAuthority:{mode:"socket-fit",x:plugRect.widthPx/plugAsset.width,y:plugRect.heightPx/plugAsset.height},signatureSocketOwnership:[],signatureLiveContentOwnership:{actionText:false,semanticPlug:true,identitySocket:false,informationalLine:false},signatureRuntimeEligibility:plug.runtimeEligibility,signatureCertificationProvenance:plug.certification,src:plugAsset.sourceAsset,fit:"contain",decorative:true,alt:""}},
    ],
    background:{kind:"none"},mobileFallback:"scale",safeAreaPaddingPx:0,pageHeightPx:asset.height/asset.width*390,
  };
}

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
      props:{signatureAssetId:asset.id,signatureFamilyId:family.id,signatureFamilyVersion:family.version,signatureComponentId:component.componentId,signatureComponentVersion:component.componentVersion,signatureAssemblyInstanceId:input.instanceId,signatureRole:component.role,signatureClassification:informational||identity?"live-content":"decorative",signatureStructural:false,signatureDecorative:!informational&&!identity,signatureInteractive:false,signatureNativePlacement:{xPx:0,yPx:0,widthPx:asset.width,heightPx:asset.height},signatureNormalizedPlacement:{x:0,y:0,width:1,height:1},signatureScaleAuthority:{mode:"uniform",x:1,y:1},signatureSocketOwnership:component.sockets.map((socket)=>socket.contractId),signatureLiveContentOwnership:{actionText:false,semanticPlug:false,identitySocket:identity,informationalLine:informational},signatureRuntimeEligibility:component.runtimeEligibility,signatureCertificationProvenance:component.certification,signatureLayoutCertificationStatus:"launch-certified",signatureMirrored:false,signatureCompensatingOverlapPx:0,src:asset.sourceAsset,fit:"contain",decorative:!informational&&!identity,alt:"",informationalText:input.liveText,identityContentUrl:input.identityContent?.src,identityContentAlt:input.identityContent?.alt,identityResourceVisual:input.identityContent&&"visual" in input.identityContent?input.identityContent.visual:undefined},
    }],
    background:{kind:"none"},mobileFallback:"scale",safeAreaPaddingPx:0,pageHeightPx:asset.height/asset.width*390,
  };
}
