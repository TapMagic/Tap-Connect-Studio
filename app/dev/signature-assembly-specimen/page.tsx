import { notFound } from "next/navigation";
import { resolveSignatureAssembly, type SignatureAssemblyActionSelection } from "@/lib/fusion/creative-studio/signature-assets/assembly";
import { adaptSignatureAssemblyResult, adaptSignatureStandaloneAction, adaptSignatureStandaloneComponent } from "@/lib/fusion/creative-studio/signature-assets/composition-adapter";
import { SignatureAssemblySpecimenClient } from "./specimen-client";
import { CABINET_NOIR_ENTITLEMENT_KEY, CABINET_NOIR_FAMILY_ID, compileSignatureAuthoringState, createSignatureAssemblyAuthoringState } from "@/lib/fusion/creative-studio/signature-assets";

const variants = new Set(["CN-037","CN-037-ALT-A1","CN-037-ALT-A2","CN-037-ALT-A3"]);
const referenceByProof: Record<string,string> = {
  "single-stack:4":"/visual-parts/signature/cabinet-noir/reference/presets/CN-006_bound-single-stack_4-row.png",
  "single-stack:6":"/visual-parts/signature/cabinet-noir/reference/presets/CN-007_bound-single-stack_6-row.png",
  "twin-rail:4":"/visual-parts/signature/cabinet-noir/reference/presets/CN-008_twin-rail-bound-stack_2x2.png",
  "twin-rail:6":"/visual-parts/signature/cabinet-noir/reference/presets/CN-009_twin-rail-bound-stack_2x3.png",
};

const fixtureAction=(index:number,compact=false,textAlign:SignatureAssemblyActionSelection["textAlign"]="center",textSize:SignatureAssemblyActionSelection["textSize"]="medium"):SignatureAssemblyActionSelection=>({
  id:`proof-action-${index+1}`,
  label:(compact
    ? ["Website","Instagram","Call us","Directions","Reviews","Book now","Save contact"]
    : ["Visit our website","Follow on Instagram","Call our team","Get directions","View reviews","Book an appointment","Save contact"]
  )[index]??`Action ${index+1}`,
  destination:`https://example.com/proof/${index+1}`,
  plugComponentId:index%2===0?"CN-013":"CN-026",
  accessibilityLabel:`Open proof action ${index+1}`,
  state:"default",
  analyticsId:`proof-action-${index+1}`,
  textAlign,
  textSize,
});

export default async function SignatureAssemblySpecimenPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  if (process.env.TAPCONNECT_DEV_AUTH!=="1") notFound();
  const query=await searchParams;
  const value=(key:string)=>typeof query[key]==="string"?query[key]:undefined;
  if (value("presentation")==="standalone-action") {
    const block=adaptSignatureStandaloneAction({familyId:"cabinet-noir",familyVersion:"1.0.0",componentId:"CN-004",componentVersion:"1.0.0",instanceId:"cn-004-standalone-proof",action:fixtureAction(0)});
    if (!block) notFound();
    return <SignatureAssemblySpecimenClient block={block} title="Standalone Action · certified proportions" certificationStatus="launch-certified" safeAreaProof={value("guide")==="1"} />;
  }
  if (value("authoring")==="1") {
    const layoutMode=value("layout")==="twin-rail"?"twin-rail":"single-stack";
    const state=createSignatureAssemblyAuthoringState(CABINET_NOIR_FAMILY_ID,layoutMode,{idFactory:(()=>{let index=0;return()=>`proof-action-${++index}`;})(),identityContent:{src:"/tap-connect-mark.png",alt:"Tap Connect fixture identity"}});
    if (!state) notFound();
    const compiled=compileSignatureAuthoringState(state,{label:"Registry-driven Signature authoring"});
    if (!compiled.ok) notFound();
    return <SignatureAssemblySpecimenClient block={compiled.composition.block} authoringState={state} entitlementKeys={value("locked")==="1"?[]:[CABINET_NOIR_ENTITLEMENT_KEY]} title={value("locked")==="1"?"Locked Signature discovery":"Registry-driven authoring"} certificationStatus="launch-certified" />;
  }
  if (value("component")==="informational-line") {
    const block=adaptSignatureStandaloneComponent({familyId:"cabinet-noir",familyVersion:"1.0.0",componentId:"CN-011",componentVersion:"1.0.0",instanceId:"cn-011-proof",liveText:"EST. 1927"});
    if (!block) notFound();
    return <SignatureAssemblySpecimenClient block={block} title="CN-011 informational line" certificationStatus="launch-certified" informationalLine />;
  }
  const layoutMode=value("layout")==="twin-rail"?"twin-rail":"single-stack";
  const requested=Number(value("count")??(layoutMode==="twin-rail"?2:1));
  const count=Number.isInteger(requested)?requested:1;
  const variant=variants.has(value("variant")??"")?value("variant")!:"CN-037";
  const textAlign=value("align")==="left"||value("align")==="right"?value("align") as "left"|"right":"center";
  const textSize=value("size")==="small"||value("size")==="large"?value("size") as "small"|"large":"medium";
  const result=resolveSignatureAssembly({familyId:"cabinet-noir",familyVersion:"1.0.0",recipeId:layoutMode==="single-stack"?"cabinet-noir-single-stack":"cabinet-noir-twin-rail",recipeVersion:"1.0.0",requestedActionCount:count,layoutMode,actions:Array.from({length:count},(_,index)=>fixtureAction(index,layoutMode==="twin-rail",textAlign,textSize)),componentVariants:{"identity-header":variant},decorativeFurniture:{"decorative-termination":value("footer")==="1"}});
  const adapted=adaptSignatureAssemblyResult(result,{label:`Cabinet Noir ${layoutMode} ${count}`,fixtureContent:{identity:{src:"/tap-connect-mark.png",alt:"Tap Connect fixture identity"}}});
  if (!adapted.ok) notFound();
  const reference=value("compare")==="1"?referenceByProof[`${layoutMode}:${count}`]:undefined;
  return <SignatureAssemblySpecimenClient block={adapted.composition.block} title={`${layoutMode} · ${count} action${count===1?"":"s"} · ${textAlign} · ${textSize}`} certificationStatus={adapted.composition.certificationStatus} referenceAsset={reference} safeAreaProof={value("guide")==="1"} seamProof={value("seam")==="1"} rowEnvelopeProof={value("envelope")==="1"} />;
}
