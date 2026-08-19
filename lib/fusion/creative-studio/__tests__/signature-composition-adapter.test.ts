import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { resolveSignatureAssembly, type SignatureAssemblyActionSelection, type SignatureAssemblyInput } from "../signature-assets/assembly";
import { adaptSignatureAssemblyResult, adaptSignatureStandaloneComponent } from "../signature-assets/composition-adapter";
import { CABINET_NOIR_ASSETS } from "../signature-assets/cabinet-noir";

const action=(index:number,plugComponentId=index%2?"CN-026":"CN-013"):SignatureAssemblyActionSelection=>({id:`action-${index+1}`,label:`Fixture action ${index+1}`,destination:`https://example.com/${index+1}`,plugComponentId,accessibilityLabel:`Open fixture action ${index+1}`,state:"default",analyticsId:`fixture-${index+1}`});
const request=(layoutMode:"single-stack"|"twin-rail",count:number,overrides:Partial<SignatureAssemblyInput>={}):SignatureAssemblyInput=>({familyId:"cabinet-noir",familyVersion:"1.0.0",recipeId:layoutMode==="single-stack"?"cabinet-noir-single-stack":"cabinet-noir-twin-rail",recipeVersion:"1.0.0",requestedActionCount:count,layoutMode,actions:Array.from({length:count},(_,index)=>action(index)),...overrides});
const adapted=(layout:"single-stack"|"twin-rail",count:number,overrides:Partial<SignatureAssemblyInput>={})=>{
  const resolved=resolveSignatureAssembly(request(layout,count,overrides));
  assert.equal(resolved.ok,true,JSON.stringify(resolved));
  const result=adaptSignatureAssemblyResult(resolved,{fixtureContent:{identity:{src:"/tap-connect-mark.png",alt:"Fixture identity"}}});
  assert.equal(result.ok,true,JSON.stringify(result));
  return {plan:resolved.plan,composition:result.composition};
};

test("adapter is deterministic and copies resolver geometry without recalculation",()=>{
  const resolved=resolveSignatureAssembly(request("single-stack",4));
  const first=adaptSignatureAssemblyResult(resolved);
  const second=adaptSignatureAssemblyResult(resolved);
  assert.deepEqual(first,second);
  assert.equal(first.ok,true);
  if (!first.ok||!resolved.ok)return;
  assert.equal(first.composition.block.nodes.length,resolved.plan.instances.length);
  resolved.plan.instances.forEach((instance,index)=>{
    const node=first.composition.block.nodes[index];
    assert.equal(node.id,instance.instanceId);
    assert.deepEqual({x:node.x,y:node.y,width:node.width,height:node.height},instance.placement.normalized);
    assert.deepEqual(node.props.signatureNativePlacement,instance.placement.native);
    assert.deepEqual(node.props.signatureScaleAuthority,instance.placement.sourceScale);
  });
});

test("certified sources, component versions, z-order, and provenance survive adaptation",()=>{
  const {plan,composition}=adapted("twin-rail",6);
  plan.instances.forEach((instance,index)=>{
    const node=composition.block.nodes[index];
    assert.equal(node.props.signatureComponentId,instance.sourceComponentId);
    assert.equal(node.props.signatureComponentVersion,instance.sourceComponentVersion);
    assert.equal(node.props.src,instance.sourceAsset);
    assert.equal(node.zIndex,instance.zOrder);
    assert.deepEqual(node.props.signatureCertificationProvenance,instance.certificationProvenance);
    assert.equal(node.props.signatureRuntimeEligibility,"runtime-eligible");
  });
});

test("actions remain accessible interactive nodes while furniture stays locked and decorative",()=>{
  const {composition}=adapted("twin-rail",3);
  const actions=composition.block.nodes.filter((node)=>node.props.signatureClassification==="live-action");
  assert.equal(actions.length,3);
  for (const node of actions) {
    assert.equal(node.primitive,"button");
    assert.equal(typeof node.props.href,"string");
    assert.equal(typeof node.props.accessibleLabel,"string");
    assert.equal(typeof node.props.trackingName,"string");
    assert.equal(node.locked,false);
  }
  const transition=composition.block.nodes.find((node)=>node.props.signatureRole==="odd-action-finisher")!;
  assert.equal(transition.primitive,"image");
  assert.equal(transition.props.href,undefined);
  assert.equal(transition.props.accessibleLabel,undefined);
  assert.equal(transition.props.trackingName,undefined);
  assert.equal(transition.props.decorative,true);
  assert.equal(transition.locked,true);
});

test("action destination semantics remain independent from visual plug selection",()=>{
  const base=request("single-stack",2);
  const input={...base,actions:[
    {...base.actions[0],destination:"tel:+15550118",plugComponentId:"CN-013"},
    {...base.actions[1],destination:"mailto:pilot@example.test",plugComponentId:"CN-026"},
  ]};
  const resolved=resolveSignatureAssembly(input);
  assert.equal(resolved.ok,true,JSON.stringify(resolved));
  const result=adaptSignatureAssemblyResult(resolved);
  assert.equal(result.ok,true,JSON.stringify(result));
  if (!result.ok)return;
  const actions=result.composition.block.nodes.filter((node)=>node.primitive==="button");
  assert.deepEqual(actions.map((node)=>({actionType:node.props.actionType,href:node.props.href})),[
    {actionType:"call",href:"tel:+15550118"},
    {actionType:"email",href:"pilot@example.test"},
  ]);
});

test("semantic and social plug instances remain metadata-positioned live content",()=>{
  const {plan,composition}=adapted("single-stack",2);
  const plugPlan=plan.instances.filter((instance)=>instance.semanticRole==="semantic-plug");
  const plugNodes=composition.block.nodes.filter((node)=>node.props.signatureRole==="semantic-plug");
  assert.deepEqual(plugPlan.map((instance)=>instance.sourceComponentId),["CN-013","CN-026"]);
  assert.deepEqual(plugNodes.map((node)=>node.props.signatureComponentId),["CN-013","CN-026"]);
  plugNodes.forEach((node,index)=>{
    assert.deepEqual({x:node.x,y:node.y,width:node.width,height:node.height},plugPlan[index].placement.normalized);
    assert.equal(node.props.signatureMirrored,false);
  });
});

test("identity fixture content maps to all certified variant sockets",()=>{
  for (const componentId of ["CN-037","CN-037-ALT-A1","CN-037-ALT-A2","CN-037-ALT-A3"]) {
    const {composition}=adapted("single-stack",1,{componentVariants:{"identity-header":componentId}});
    const crown=composition.block.nodes.find((node)=>node.props.signatureRole==="identity-header")!;
    assert.equal(crown.props.signatureComponentId,componentId);
    assert.equal(crown.props.identityContentUrl,"/tap-connect-mark.png");
    assert.equal(crown.props.identityContentAlt,"Fixture identity");
  }
});

test("CN-011 standalone mapping retains informational text and certified authority",()=>{
  const block=adaptSignatureStandaloneComponent({familyId:"cabinet-noir",familyVersion:"1.0.0",componentId:"CN-011",componentVersion:"1.0.0",instanceId:"fixture-info",liveText:"EST. 1927"});
  assert.ok(block);
  const node=block!.nodes[0];
  assert.equal(node.props.informationalText,"EST. 1927");
  assert.equal(node.props.signatureInteractive,false);
  assert.equal(node.props.signatureLiveContentOwnership && (node.props.signatureLiveContentOwnership as {informationalLine:boolean}).informationalLine,true);
  assert.equal(node.props.signatureMirrored,false);
});

test("all requested proof counts preserve plan certification and lockstep",()=>{
  for (const count of [1,2,4,6]) {
    const {plan,composition}=adapted("single-stack",count);
    assert.equal(composition.block.nodes.length,plan.instances.length);
  }
  for (const count of [2,3,4,5,6,7]) {
    const {plan,composition}=adapted("twin-rail",count);
    assert.equal(composition.certificationStatus,count===7?"structural-proof-only":"launch-certified");
    const outer=composition.block.nodes.filter((node)=>node.props.signatureRole==="twin-rail-repeat-outer");
    const spine=composition.block.nodes.filter((node)=>node.props.signatureRole==="twin-rail-repeat-spine");
    assert.equal(outer.length,spine.length);
    outer.forEach((node,index)=>assert.equal(node.y,spine[index].y));
    assert.equal(composition.block.nodes.length,plan.instances.length);
  }
});

test("adapter and renderer contain no family branch, mirroring, overlap, or layout heuristics",()=>{
  const root=process.cwd();
  const adapter=readFileSync(path.join(root,"lib/fusion/creative-studio/signature-assets/composition-adapter.ts"),"utf8");
  const bridge=readFileSync(path.join(root,"lib/fusion/creative-studio/signature-assets/SignatureMasterBridge.tsx"),"utf8");
  assert.doesNotMatch(adapter,/cabinet[_ -]?noir/i);
  assert.doesNotMatch(bridge,/cabinet[_ -]?noir/i);
  assert.doesNotMatch(bridge,/CN-\d{3}/);
  assert.doesNotMatch(`${adapter}\n${bridge}`,/scaleX\s*\(\s*-1|rotateY\s*\(\s*180/i);
  assert.doesNotMatch(adapter,/Math\.ceil|Math\.floor|repeatInterval/);
});

test("renderer consumes live safe areas from normalized registry metadata",()=>{
  const source=readFileSync(path.join(process.cwd(),"lib/fusion/creative-studio/signature-assets/SignatureMasterBridge.tsx"),"utf8");
  assert.match(source,/normalizedContract\?\.liveContentGeometry/);
  assert.match(source,/identitySocket\?\.geometry\.safeArea/);
  for (const id of ["CN-002","CN-003","CN-004","CN-005","CN-011"]) {
    assert.ok(CABINET_NOIR_ASSETS.find((asset)=>asset.normalizedContract?.componentId===id)?.normalizedContract?.liveContentGeometry);
  }
});

test("reference-only components cannot enter standalone runtime composition",()=>{
  assert.equal(adaptSignatureStandaloneComponent({familyId:"cabinet-noir",familyVersion:"1.0.0",componentId:"CN-006",componentVersion:"1.0.0",instanceId:"reference"}),null);
});
