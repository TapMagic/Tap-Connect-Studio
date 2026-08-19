import {
  getSignatureAssemblyRecipe,
  SIGNATURE_ASSEMBLY_RECIPES,
  SIGNATURE_ASSETS,
  SIGNATURE_FAMILIES,
} from "./registry";
import {
  validateSignatureAssemblyRecipe,
  type SignatureAssemblyComponentReference,
  type SignatureAssemblyPlacementRule,
  type SignatureAssemblyRecipe,
} from "./layout-recipes";
import {
  isSignatureComponentRuntimeEligible,
  type SignatureAssetDefinition,
  type SignatureComponentContract,
  type SignatureFamilyDefinition,
  type SignatureNormalizedRect,
  type SignatureSocketContractId,
  type SignatureVersion,
} from "./types";

export type SignatureAssemblyLayoutMode = "single-stack" | "twin-rail";
export type SignatureAssemblyCertificationStatus = "launch-certified" | "structural-proof-only";
export type SignatureAssemblyInstanceClass = "structural" | "decorative" | "live-action" | "live-content";

export type SignatureAssemblyActionSelection = {
  id: string;
  label: string;
  destination: string;
  plugComponentId: string;
  accessibilityLabel: string;
  state: "default" | "hover" | "pressed" | "disabled";
  analyticsId: string;
};

export type SignatureAssemblyInput = {
  familyId: string;
  familyVersion: SignatureVersion;
  recipeId: string;
  recipeVersion: SignatureVersion;
  requestedActionCount: number;
  layoutMode: SignatureAssemblyLayoutMode;
  actions: readonly SignatureAssemblyActionSelection[];
  componentVariants?: Readonly<Record<string, string>>;
  decorativeFurniture?: Readonly<Record<string, boolean>>;
};

export type SignatureAssemblyNativeRect = { xPx: number; yPx: number; widthPx: number; heightPx: number };

export type SignatureAssemblyPlanInstance = {
  instanceId: string;
  sourceAssetId: string;
  sourceAsset: string;
  sourceComponentId: string;
  sourceComponentVersion: SignatureVersion;
  sourceSha256: string;
  semanticRole: string;
  classification: SignatureAssemblyInstanceClass;
  structural: boolean;
  decorative: boolean;
  interactive: boolean;
  placement: {
    native: SignatureAssemblyNativeRect;
    normalized: SignatureNormalizedRect;
    sourceScale: { mode: "uniform" | "socket-fit"; x: number; y: number };
  };
  attachmentAnchorsUsed: readonly string[];
  zOrder: number;
  repeatIndex?: number;
  repeatStridePx?: number;
  socketOwnership: readonly SignatureSocketContractId[];
  liveContentOwnership: {
    actionText: boolean;
    semanticPlug: boolean;
    identitySocket: boolean;
    informationalLine: boolean;
  };
  layout: { level: number; row: number; column: number; side: SignatureComponentContract["side"] };
  runtimeEligibility: SignatureComponentContract["runtimeEligibility"];
  certificationProvenance: {
    state: SignatureComponentContract["certification"]["state"];
    geometryVersion: SignatureVersion;
    evidence: readonly string[];
    authorityManifest?: string;
    geometryAuthority?: string;
  };
  parentInstanceId?: string;
  action?: SignatureAssemblyActionSelection;
};

export type SignatureAssemblyPlan = {
  planVersion: "1.0.0";
  familyId: string;
  familyVersion: SignatureVersion;
  recipeId: string;
  recipeVersion: SignatureVersion;
  layoutMode: SignatureAssemblyLayoutMode;
  certificationStatus: SignatureAssemblyCertificationStatus;
  requestedActionCount: number;
  actionUnitCount: number;
  completePairedLevelCount: number;
  coordinateAuthority: "certified-native-space";
  coordinateWidthPx: number;
  unitStridePx: number;
  preferredOverlapPx: number;
  nativeBounds: SignatureAssemblyNativeRect;
  instances: readonly SignatureAssemblyPlanInstance[];
  canonicalInputs: SignatureAssemblyInput;
};

export type SignatureAssemblyErrorCode =
  | "FAMILY_NOT_FOUND"
  | "INVALID_FAMILY_VERSION"
  | "RECIPE_NOT_FOUND"
  | "RECIPE_INVALID"
  | "LAYOUT_MODE_MISMATCH"
  | "INVALID_ACTION_COUNT"
  | "UNSUPPORTED_ACTION_COUNT"
  | "MISSING_ACTION_DATA"
  | "COMPONENT_NOT_FOUND"
  | "COMPONENT_RUNTIME_INELIGIBLE"
  | "COMPONENT_LAYOUT_INCOMPATIBLE"
  | "INVALID_COMPONENT_VARIANT"
  | "MISSING_ATTACHMENT_GEOMETRY"
  | "MISSING_SOCKET_CONTRACT"
  | "INVALID_PLUG_SELECTION"
  | "REPEAT_CADENCE_MISMATCH"
  | "REPEAT_STRIDE_MISMATCH"
  | "NONZERO_COMPENSATING_OVERLAP";

export type SignatureAssemblyError = { code: SignatureAssemblyErrorCode; message: string; componentId?: string };
export type SignatureAssemblyResult = { ok: true; plan: SignatureAssemblyPlan } | { ok: false; errors: readonly SignatureAssemblyError[] };

export type SignatureAssemblyRegistry = {
  families: readonly SignatureFamilyDefinition[];
  assets: readonly SignatureAssetDefinition[];
  recipes: readonly SignatureAssemblyRecipe[];
};

const DEFAULT_REGISTRY: SignatureAssemblyRegistry = {
  families:SIGNATURE_FAMILIES,
  assets:SIGNATURE_ASSETS,
  recipes:SIGNATURE_ASSEMBLY_RECIPES,
};

const fail = (code: SignatureAssemblyErrorCode, message: string, componentId?: string): SignatureAssemblyError => ({code,message,componentId});
const stableToken = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

function assetForComponent(registry: SignatureAssemblyRegistry, familyId: string, componentId: string) {
  return registry.assets.find((asset)=>asset.familyId===familyId && asset.normalizedContract?.componentId===componentId);
}

function referencedComponentId(reference: SignatureAssemblyComponentReference, input: SignatureAssemblyInput) {
  return input.componentVariants?.[reference.role] ?? reference.componentId;
}

function expectedLayoutContract(recipe: SignatureAssemblyRecipe) {
  return recipe.contractId;
}

function placementFor(
  component: SignatureComponentContract,
  rule: SignatureAssemblyPlacementRule,
  verticalBasePx: number,
): { rect: SignatureAssemblyNativeRect; anchors: readonly string[] } | SignatureAssemblyError {
  const source = component.sourceGeometry;
  if (!source) return fail("MISSING_ATTACHMENT_GEOMETRY",`Component ${component.componentId} has no certified source geometry.`,component.componentId);
  const widthPx = source.widthPx*rule.scale;
  const heightPx = source.heightPx*rule.scale;
  if (!rule.attachmentAnchorId) return {rect:{xPx:rule.xPx,yPx:verticalBasePx+rule.yOffsetPx,widthPx,heightPx},anchors:[]};
  const anchor = component.attachmentAnchors.find((candidate)=>candidate.id===rule.attachmentAnchorId);
  if (!anchor) return fail("MISSING_ATTACHMENT_GEOMETRY",`Component ${component.componentId} is missing attachment anchor ${rule.attachmentAnchorId}.`,component.componentId);
  const targetX = rule.targetXPx ?? rule.xPx;
  return {
    rect:{xPx:targetX-anchor.point.x*widthPx,yPx:verticalBasePx+rule.yOffsetPx-anchor.point.y*heightPx,widthPx,heightPx},
    anchors:[anchor.id],
  };
}

function classify(kind: "fixed"|"action"|"repeat"|"termination"|"decorative"|"transition"|"plug"):
SignatureAssemblyInstanceClass {
  if (kind==="action") return "live-action";
  if (kind==="plug") return "live-content";
  if (kind==="decorative" || kind==="transition") return "decorative";
  return "structural";
}

function verticalBase(rule: SignatureAssemblyPlacementRule, context: {unitStart:number;contentEnd:number;oddActionEnd:number;transitionEnd:number}) {
  if (rule.verticalReference==="unit-start") return context.unitStart;
  if (rule.verticalReference==="content-end") return context.contentEnd;
  if (rule.verticalReference==="odd-action-end") return context.oddActionEnd;
  if (rule.verticalReference==="transition-end") return context.transitionEnd;
  return 0;
}

export function resolveSignatureAssembly(
  input: SignatureAssemblyInput,
  suppliedRegistry?: SignatureAssemblyRegistry,
): SignatureAssemblyResult {
  const registry = suppliedRegistry ?? DEFAULT_REGISTRY;
  const recipe = suppliedRegistry
    ? registry.recipes.find((candidate)=>candidate.recipeId===input.recipeId && candidate.recipeVersion===input.recipeVersion)
    : getSignatureAssemblyRecipe(input.recipeId,input.recipeVersion);
  const errors: SignatureAssemblyError[] = [];
  const family = registry.families.find((candidate)=>candidate.id===input.familyId);
  if (!family) errors.push(fail("FAMILY_NOT_FOUND",`Signature family ${input.familyId} is not registered.`));
  else if (family.version!==input.familyVersion) errors.push(fail("INVALID_FAMILY_VERSION",`Family ${input.familyId} does not provide version ${input.familyVersion}.`));
  if (!recipe) errors.push(fail("RECIPE_NOT_FOUND",`Assembly recipe ${input.recipeId}@${input.recipeVersion} is not registered.`));
  if (!recipe || errors.length) return {ok:false,errors};
  const recipeErrors = validateSignatureAssemblyRecipe(recipe);
  if (recipeErrors.length) return {ok:false,errors:recipeErrors.map((message)=>fail("RECIPE_INVALID",message))};
  if (recipe.familyId!==input.familyId || recipe.familyVersion!==input.familyVersion) {
    return {ok:false,errors:[fail("INVALID_FAMILY_VERSION","Recipe family/version does not match the requested family authority.")]};
  }
  const expectedMode: SignatureAssemblyLayoutMode = recipe.actionUnit.kind==="row"?"single-stack":"twin-rail";
  if (input.layoutMode!==expectedMode) errors.push(fail("LAYOUT_MODE_MISMATCH",`Recipe ${recipe.recipeId} requires ${expectedMode}.`));
  if (!Number.isInteger(input.requestedActionCount) || input.requestedActionCount<recipe.certificationLimits.minimumActions) {
    errors.push(fail("INVALID_ACTION_COUNT",`Action count must be an integer of at least ${recipe.certificationLimits.minimumActions}.`));
  }
  const launchCertified = recipe.certificationLimits.launchCertifiedActionCounts.includes(input.requestedActionCount);
  const proofOnly = recipe.certificationLimits.structuralProofOnlyActionCounts?.includes(input.requestedActionCount) ?? false;
  if (!launchCertified && !proofOnly) errors.push(fail("UNSUPPORTED_ACTION_COUNT",`Action count ${input.requestedActionCount} is not certified or approved for structural proof by ${recipe.recipeId}.`));
  if (input.actions.length!==input.requestedActionCount || input.actions.some((action)=>!action.id || !action.label || !action.destination || !action.plugComponentId || !action.accessibilityLabel || !action.analyticsId)) {
    errors.push(fail("MISSING_ACTION_DATA","Each requested action requires stable identity, label, destination, semantic plug, accessibility label, state, and analytics identity."));
  }
  if (errors.length) return {ok:false,errors};

  type Resolved = {asset:SignatureAssetDefinition;component:SignatureComponentContract};
  const resolveReference = (reference: SignatureAssemblyComponentReference): Resolved | undefined => {
    const componentId = referencedComponentId(reference,input);
    if (!componentId) { errors.push(fail("COMPONENT_NOT_FOUND",`Recipe role ${reference.role} has no component authority.`)); return undefined; }
    const asset = assetForComponent(registry,input.familyId,componentId);
    if (!asset?.normalizedContract) { errors.push(fail("COMPONENT_NOT_FOUND",`Component ${componentId} is not registered for ${input.familyId}.`,componentId)); return undefined; }
    const component = asset.normalizedContract;
    if (input.componentVariants?.[reference.role] && component.role!==reference.role) {
      errors.push(fail("INVALID_COMPONENT_VARIANT",`Component ${componentId} cannot replace role ${reference.role}.`,componentId)); return undefined;
    }
    if (!isSignatureComponentRuntimeEligible(component)) { errors.push(fail("COMPONENT_RUNTIME_INELIGIBLE",`Component ${componentId} is not a canonical certified runtime authority.`,componentId)); return undefined; }
    if (!component.layoutCompatibility.includes(expectedLayoutContract(recipe))) { errors.push(fail("COMPONENT_LAYOUT_INCOMPATIBLE",`Component ${componentId} is incompatible with ${recipe.contractId}.`,componentId)); return undefined; }
    for (const socket of reference.ownsSockets??[]) if (!component.sockets.some((candidate)=>candidate.contractId===socket)) {
      errors.push(fail("MISSING_SOCKET_CONTRACT",`Component ${componentId} does not provide required socket ${socket}.`,componentId)); return undefined;
    }
    return {asset,component};
  };

  const fixed = recipe.fixedTop.map((reference)=>({reference,resolved:resolveReference(reference)}));
  const termination = {reference:recipe.structuralTermination,resolved:resolveReference(recipe.structuralTermination)};
  const decorative = recipe.optionalDecorativeTermination ? {reference:recipe.optionalDecorativeTermination,resolved:resolveReference(recipe.optionalDecorativeTermination)} : undefined;
  const repeat = (recipe.repeatInterval?.components??[]).map((reference)=>({reference,resolved:resolveReference(reference)}));
  const actionReferences: SignatureAssemblyComponentReference[] = [];
  const strategy = recipe.actionUnit.masterStrategy;
  if (strategy.mode==="single") actionReferences.push(strategy.master);
  if (strategy.mode==="alternating") actionReferences.push(...strategy.sequence);
  if (strategy.mode==="side-specific") actionReferences.push(...Object.values(strategy.masters).filter((value):value is SignatureAssemblyComponentReference=>Boolean(value)));
  const actions = new Map(actionReferences.map((reference)=>[`${reference.role}:${reference.side??"none"}`,resolveReference(reference)]));
  const oddTreatment = recipe.oddActionTreatment.mode==="full-width-after-complete-pairs" ? {
    action:{reference:recipe.oddActionTreatment.finalActionMaster,resolved:resolveReference(recipe.oddActionTreatment.finalActionMaster)},
    transition:{reference:recipe.oddActionTreatment.transitionFurniture,resolved:resolveReference(recipe.oddActionTreatment.transitionFurniture)},
  } : undefined;

  if (recipe.repeatInterval) {
    repeat.forEach(({resolved},index)=>{
      if (!resolved) return;
      const contract = resolved.component.repeatability;
      const rule = recipe.geometry.repeatComponents[index];
      if (!contract || contract.cadence!==recipe.repeatInterval?.cadence) errors.push(fail("REPEAT_CADENCE_MISMATCH",`Component ${resolved.component.componentId} does not match ${recipe.repeatInterval?.cadence} cadence.`,resolved.component.componentId));
      if (contract && contract.preferredOverlapPx!==recipe.repeatInterval!.preferredOverlapPx) errors.push(fail("NONZERO_COMPENSATING_OVERLAP",`Component ${resolved.component.componentId} overlap ${contract.preferredOverlapPx}px does not match the recipe authority ${recipe.repeatInterval!.preferredOverlapPx}px.`,resolved.component.componentId));
      const runtimeStride = contract && resolved.component.sourceGeometry ? contract.nativeStridePx*(resolved.component.sourceGeometry.runtimeScale??rule?.scale??1) : 0;
      if (!rule || Math.abs(runtimeStride-recipe.repeatInterval!.nativeStridePx)>.001 || Math.abs(resolved.component.sourceGeometry!.heightPx*rule.scale-recipe.repeatInterval!.nativeStridePx)>.001) {
        errors.push(fail("REPEAT_STRIDE_MISMATCH",`Component ${resolved.component.componentId} does not resolve to ${recipe.repeatInterval!.nativeStridePx}px runtime lockstep.`,resolved.component.componentId));
      }
    });
    if (Math.abs(recipe.geometry.unitStridePx-(recipe.repeatInterval.nativeStridePx-recipe.repeatInterval.preferredOverlapPx))>.001) {
      errors.push(fail("REPEAT_STRIDE_MISMATCH","Assembly unit stride does not match the certified repeat stride and overlap authority."));
    }
  }
  if (errors.length) return {ok:false,errors};

  const nativeInstances: Array<Omit<SignatureAssemblyPlanInstance,"placement"> & {native:SignatureAssemblyNativeRect;scale:{mode:"uniform"|"socket-fit";x:number;y:number}}> = [];
  const add = (resolved:Resolved, rule:SignatureAssemblyPlacementRule, kind:Parameters<typeof classify>[0], index:number, layout:{level:number;row:number;column:number}, context:{unitStart:number;contentEnd:number;oddActionEnd:number;transitionEnd:number}, action?:SignatureAssemblyActionSelection, repeatIndex?:number) => {
    const placed = placementFor(resolved.component,rule,verticalBase(rule,context));
    if ("code" in placed) { errors.push(placed); return undefined; }
    const classification = classify(kind);
    const instanceId = [input.familyId,input.recipeId,rule.role,resolved.component.componentId,layout.level,layout.column,index].map(String).map(stableToken).join(":");
    nativeInstances.push({
      instanceId,sourceAssetId:resolved.asset.id,sourceAsset:resolved.asset.sourceAsset,sourceComponentId:resolved.component.componentId,sourceComponentVersion:resolved.component.componentVersion,sourceSha256:resolved.component.sourceSha256,
      semanticRole:rule.role,classification,structural:classification==="structural",decorative:classification==="decorative",interactive:classification==="live-action",native:placed.rect,scale:{mode:"uniform",x:rule.scale,y:rule.scale},attachmentAnchorsUsed:placed.anchors,zOrder:rule.zOrder,repeatIndex,repeatStridePx:repeatIndex===undefined?undefined:recipe.repeatInterval?.nativeStridePx,
      socketOwnership:resolved.component.sockets.map((socket)=>socket.contractId),liveContentOwnership:{actionText:classification==="live-action",semanticPlug:classification==="live-action",identitySocket:resolved.component.sockets.some((socket)=>socket.contractId.startsWith("identityHeaderSocket@")),informationalLine:Boolean(resolved.component.liveContentContract)},
      layout:{...layout,side:resolved.component.side},runtimeEligibility:resolved.component.runtimeEligibility,certificationProvenance:{state:resolved.component.certification.state,geometryVersion:resolved.component.certification.geometryVersion,evidence:resolved.component.certification.evidence??[],authorityManifest:resolved.component.provenance?.authorityManifest,geometryAuthority:resolved.component.provenance?.geometryAuthority},action,
    });
    return instanceId;
  };
  const addPlug = (parentId:string,parent:Resolved,parentRect:SignatureAssemblyNativeRect,selection:SignatureAssemblyActionSelection,layout:{level:number;row:number;column:number},index:number) => {
    const plugAsset = assetForComponent(registry,input.familyId,selection.plugComponentId);
    const plug = plugAsset?.normalizedContract;
    if (!plugAsset || !plug || !isSignatureComponentRuntimeEligible(plug) || plug.role!=="semantic-plug" || !plug.layoutCompatibility.includes(recipe.contractId)) { errors.push(fail("INVALID_PLUG_SELECTION",`Plug ${selection.plugComponentId} is not an eligible semantic plug for ${recipe.contractId}.`,selection.plugComponentId)); return; }
    const socket = parent.component.sockets.find((candidate)=>candidate.contractId.startsWith("semanticPlugSocket@"));
    if (!socket) { errors.push(fail("MISSING_SOCKET_CONTRACT",`Action ${parent.component.componentId} has no semantic plug socket.`,parent.component.componentId)); return; }
    const bounds = socket.geometry.bounds;
    const native = {xPx:parentRect.xPx+bounds.x*parentRect.widthPx,yPx:parentRect.yPx+bounds.y*parentRect.heightPx,widthPx:bounds.width*parentRect.widthPx,heightPx:bounds.height*parentRect.heightPx};
    const instanceId = [input.familyId,input.recipeId,"semantic-plug",plug.componentId,layout.level,layout.column,index].map(String).map(stableToken).join(":");
    nativeInstances.push({instanceId,sourceAssetId:plugAsset.id,sourceAsset:plugAsset.sourceAsset,sourceComponentId:plug.componentId,sourceComponentVersion:plug.componentVersion,sourceSha256:plug.sourceSha256,semanticRole:"semantic-plug",classification:"live-content",structural:false,decorative:false,interactive:false,native,scale:{mode:"socket-fit",x:native.widthPx/plugAsset.width,y:native.heightPx/plugAsset.height},attachmentAnchorsUsed:[],zOrder:30,socketOwnership:[],liveContentOwnership:{actionText:false,semanticPlug:true,identitySocket:false,informationalLine:false},layout:{...layout,side:parent.component.side},runtimeEligibility:plug.runtimeEligibility,certificationProvenance:{state:plug.certification.state,geometryVersion:plug.certification.geometryVersion,evidence:plug.certification.evidence??[],authorityManifest:plug.provenance?.authorityManifest,geometryAuthority:plug.provenance?.geometryAuthority},parentInstanceId:parentId});
  };

  const zeroContext = {unitStart:0,contentEnd:0,oddActionEnd:0,transitionEnd:0};
  fixed.forEach(({resolved},index)=>{if (resolved) add(resolved,recipe.geometry.fixedTop[index],"fixed",index,{level:-1,row:-1,column:index},zeroContext);});
  const isPaired = recipe.actionUnit.kind==="paired-level";
  const completePairs = isPaired?Math.floor(input.requestedActionCount/2):0;
  const unitCount = isPaired?Math.ceil(input.requestedActionCount/2):input.requestedActionCount;
  const fullContentEnd = (isPaired?completePairs:input.requestedActionCount)*recipe.geometry.unitStridePx;
  let actionIndex = 0;
  const addActionAt = (reference:SignatureAssemblyComponentReference,rule:SignatureAssemblyPlacementRule,level:number,column:number,selection:SignatureAssemblyActionSelection) => {
    const resolved = actions.get(`${reference.role}:${reference.side??"none"}`);
    if (!resolved) return;
    const context={unitStart:level*recipe.geometry.unitStridePx,contentEnd:fullContentEnd,oddActionEnd:0,transitionEnd:0};
    const before=nativeInstances.length;
    const parentId=add(resolved,rule,"action",actionIndex,{level,row:level,column},context,selection);
    const parent=nativeInstances[before];
    if (parentId && parent) addPlug(parentId,resolved,parent.native,selection,{level,row:level,column},actionIndex);
    actionIndex++;
  };
  if (!isPaired && strategy.mode==="single") {
    for (let row=0;row<input.requestedActionCount;row++) {
      const reference=strategy.master;
      const rule=recipe.geometry.actionSlots.find((candidate)=>candidate.role===reference.role && (!reference.side || candidate.side===reference.side))!;
      addActionAt(reference,rule,row,0,input.actions[row]);
      if (row<input.requestedActionCount-1) repeat.forEach(({resolved},index)=>{if(resolved)add(resolved,recipe.geometry.repeatComponents[index],"repeat",index,{level:row+1,row:row+1,column:index},{unitStart:(row+1)*recipe.geometry.unitStridePx,contentEnd:fullContentEnd,oddActionEnd:0,transitionEnd:0},undefined,row);});
    }
  } else if (!isPaired && strategy.mode==="alternating") {
    for (let row=0;row<input.requestedActionCount;row++) {
      const reference=strategy.sequence[row%strategy.sequence.length];
      const rule=recipe.geometry.actionSlots.find((candidate)=>candidate.role===reference.role && candidate.side===reference.side)!;
      addActionAt(reference,rule,row,0,input.actions[row]);
      if (row<input.requestedActionCount-1) repeat.forEach(({resolved},index)=>{if(resolved)add(resolved,recipe.geometry.repeatComponents[index],"repeat",index,{level:row+1,row:row+1,column:index},{unitStart:(row+1)*recipe.geometry.unitStridePx,contentEnd:fullContentEnd,oddActionEnd:0,transitionEnd:0},undefined,row);});
    }
  } else if (isPaired && strategy.mode==="side-specific") {
    for (let level=0;level<completePairs;level++) {
      const left=strategy.masters.left!; const right=strategy.masters.right!;
      addActionAt(left,recipe.geometry.actionSlots.find((rule)=>rule.side==="left")!,level,0,input.actions[actionIndex]);
      addActionAt(right,recipe.geometry.actionSlots.find((rule)=>rule.side==="right")!,level,1,input.actions[actionIndex]);
      if (level<completePairs-1) repeat.forEach(({resolved},index)=>{if(resolved)add(resolved,recipe.geometry.repeatComponents[index],"repeat",index,{level:level+1,row:level+1,column:index},{unitStart:(level+1)*recipe.geometry.unitStridePx,contentEnd:fullContentEnd,oddActionEnd:0,transitionEnd:0},undefined,level);});
    }
  }

  let contentEnd=fullContentEnd;
  let transitionEnd=contentEnd;
  if (isPaired && input.requestedActionCount%2===1 && oddTreatment && recipe.geometry.oddAction) {
    const resolved=oddTreatment.action.resolved;
    if (resolved) {
      const rule=recipe.geometry.oddAction.action;
      const selection=input.actions[actionIndex];
      const before=nativeInstances.length;
      const parentId=add(resolved,rule,"action",actionIndex,{level:completePairs,row:completePairs,column:0},{unitStart:contentEnd,contentEnd,oddActionEnd:0,transitionEnd:0},selection);
      const parent=nativeInstances[before];
      if(parentId&&parent)addPlug(parentId,resolved,parent.native,selection,{level:completePairs,row:completePairs,column:0},actionIndex);
      contentEnd+=parent?.native.heightPx??0;
    }
    const transition=oddTreatment.transition.resolved;
    if (transition) {
      const before=nativeInstances.length;
      add(transition,recipe.geometry.oddAction.transition,"transition",0,{level:completePairs+1,row:completePairs+1,column:0},{unitStart:0,contentEnd,oddActionEnd:contentEnd,transitionEnd:0});
      transitionEnd=contentEnd+(nativeInstances[before]?.native.heightPx??0);
      contentEnd=transitionEnd;
    }
  }
  if (termination.resolved) add(termination.resolved,recipe.geometry.structuralTermination,"termination",0,{level:unitCount+1,row:unitCount+1,column:0},{unitStart:0,contentEnd,oddActionEnd:contentEnd,transitionEnd},undefined);
  if (decorative?.resolved && recipe.geometry.decorativeTermination && input.decorativeFurniture?.[decorative.reference.role]===true) add(decorative.resolved,recipe.geometry.decorativeTermination,"decorative",0,{level:unitCount+2,row:unitCount+2,column:0},{unitStart:0,contentEnd,oddActionEnd:contentEnd,transitionEnd},undefined);
  if (errors.length) return {ok:false,errors};

  const minX=Math.min(...nativeInstances.map((instance)=>instance.native.xPx));
  const minY=Math.min(...nativeInstances.map((instance)=>instance.native.yPx));
  const maxX=Math.max(...nativeInstances.map((instance)=>instance.native.xPx+instance.native.widthPx));
  const maxY=Math.max(...nativeInstances.map((instance)=>instance.native.yPx+instance.native.heightPx));
  const nativeBounds={xPx:minX,yPx:minY,widthPx:maxX-minX,heightPx:maxY-minY};
  const finalized: SignatureAssemblyPlanInstance[] = nativeInstances.map(({native,scale,...instance})=>({...instance,placement:{native,normalized:{x:(native.xPx-minX)/nativeBounds.widthPx,y:(native.yPx-minY)/nativeBounds.heightPx,width:native.widthPx/nativeBounds.widthPx,height:native.heightPx/nativeBounds.heightPx},sourceScale:scale}}));
  return {ok:true,plan:{planVersion:"1.0.0",familyId:input.familyId,familyVersion:input.familyVersion,recipeId:recipe.recipeId,recipeVersion:recipe.recipeVersion,layoutMode:input.layoutMode,certificationStatus:proofOnly?"structural-proof-only":"launch-certified",requestedActionCount:input.requestedActionCount,actionUnitCount:unitCount,completePairedLevelCount:completePairs,coordinateAuthority:"certified-native-space",coordinateWidthPx:recipe.geometry.coordinateWidthPx,unitStridePx:recipe.geometry.unitStridePx,preferredOverlapPx:recipe.repeatInterval?.preferredOverlapPx??0,nativeBounds,instances:finalized,canonicalInputs:input}};
}
