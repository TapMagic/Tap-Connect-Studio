"use client";

import { useState } from "react";
import type { CreativeCompositionBlock } from "@/lib/fusion/creative-studio/composition";
import { CreativeCompositionCanvas } from "@/components/fusion/creative-studio/creative-composition-canvas";
import { VisualPartsCabinetPanel } from "@/components/fusion/creative-studio/visual-parts-cabinet-panel";
import { compileSignatureAuthoringState, type SignatureAssemblyAuthoringState, type SignatureEntitlementKey } from "@/lib/fusion/creative-studio/signature-assets";

export function SignatureAssemblySpecimenClient({block:initialBlock,title,certificationStatus,referenceAsset,authoringState:initialAuthoringState,entitlementKeys=[],informationalLine=false}:{block:CreativeCompositionBlock;title:string;certificationStatus:"launch-certified"|"structural-proof-only";referenceAsset?:string;authoringState?:SignatureAssemblyAuthoringState;entitlementKeys?:readonly SignatureEntitlementKey[];informationalLine?:boolean}) {
  const [block,setBlock]=useState(initialBlock);
  const [authoringState,setAuthoringState]=useState(initialAuthoringState);
  const [persistenceProof,setPersistenceProof]=useState("not-run");
  const [informationalVisible,setInformationalVisible]=useState(true);
  const [informationalText,setInformationalText]=useState(String(initialBlock.nodes[0]?.props.informationalText || ""));
  const renderedBlock=informationalLine?{...block,nodes:block.nodes.map((node)=>({...node,props:{...node.props,informationalText}}))}:block;
  const height=renderedBlock.pageHeightPx??520;
  return <main data-testid="signature-proof-root" style={{minHeight:"100vh",margin:0,padding:"32px 24px 64px",background:"#030303",color:"#fff",fontFamily:"Inter,system-ui,sans-serif"}}>
    <div style={{display:"flex",alignItems:"flex-start",gap:24,flexWrap:"wrap"}}>
    <div>
    <header style={{width:390,margin:"0 0 14px",display:"flex",justifyContent:"space-between",alignItems:"end",gap:12}}>
      <div><div style={{fontSize:11,letterSpacing:2.2,textTransform:"uppercase",color:"#c99b52"}}>Signature assembly proof</div><h1 style={{fontSize:15,margin:"5px 0 0",fontWeight:650}}>{title}</h1></div>
      <span data-testid="signature-proof-certification" style={{fontSize:9,padding:"4px 7px",border:"1px solid #806537",borderRadius:999,color:certificationStatus==="structural-proof-only"?"#ffca7a":"#d7b36d",whiteSpace:"nowrap"}}>{certificationStatus}</span>
    </header>
    {informationalLine?<div data-testid="signature-informational-proof-controls" style={{width:390,display:"flex",gap:8,margin:"0 0 12px"}}><button type="button" onClick={()=>setInformationalVisible(true)}>Add line</button><input aria-label="Informational line proof text" value={informationalText} onChange={(event)=>setInformationalText(event.target.value.replace(/[\r\n]+/g," "))} style={{flex:1}}/><button type="button" onClick={()=>setInformationalVisible(false)}>Remove</button></div>:null}
    {informationalVisible?<section data-testid="signature-proof-card" data-proof-width="390" style={{width:390,height,margin:0,position:"relative",background:"#030303"}}>
      <CreativeCompositionCanvas block={renderedBlock} editMode={false} layoutMode="free" minHeightPx={height} className="!rounded-none !border-0" />
    </section>:<section data-testid="signature-informational-removed" style={{width:390,minHeight:80,border:"1px dashed #5c4930",display:"grid",placeItems:"center",color:"#8f8069"}}>Optional informational line removed</section>}
    {referenceAsset?<section data-testid="signature-reference-comparison" style={{width:390,margin:"28px 0 0",paddingTop:18,borderTop:"1px solid #332817"}}><div style={{fontSize:10,marginBottom:10,color:"#aa946c",letterSpacing:1.5,textTransform:"uppercase"}}>Reference-only preset — not runtime authority</div><img src={referenceAsset} alt="Certified flattened visual reference" style={{display:"block",width:390,height:"auto",objectFit:"contain"}} /></section>:null}
    </div>
    {authoringState ? <aside data-testid="signature-proof-authoring-drawer" style={{width:360,maxHeight:"calc(100vh - 64px)",overflow:"auto",padding:14,border:"1px solid #392918",borderRadius:12,background:"#0a0908"}}>
      <VisualPartsCabinetPanel props={{}} targetFamily="button" onPatch={()=>{}} signatureEntitlementKeys={entitlementKeys} signatureAssembly={authoringState} onSignatureAssemblyChange={(state)=>{setAuthoringState(state);const compiled=compileSignatureAuthoringState(state,{blockId:block.id,label:block.label});if(compiled.ok)setBlock(compiled.composition.block);}} />
      <button type="button" data-testid="signature-proof-save-reload" style={{width:"100%",minHeight:40,marginTop:12,border:"1px solid #6d5732",borderRadius:7,background:"#15100a",color:"#f0d19b"}} onClick={()=>{const restored=JSON.parse(JSON.stringify(authoringState)) as SignatureAssemblyAuthoringState;const compiled=compileSignatureAuthoringState(restored,{blockId:block.id,label:block.label});if(compiled.ok){setAuthoringState(restored);setBlock(compiled.composition.block);setPersistenceProof("passed");}}}>Save JSON → reload deterministic plan</button>
      <p data-testid="signature-proof-persistence-status" style={{fontSize:10,color:persistenceProof==="passed"?"#b8ff2c":"#887a65"}}>Persistence proof: {persistenceProof}</p>
    </aside>:null}
    </div>
  </main>;
}
