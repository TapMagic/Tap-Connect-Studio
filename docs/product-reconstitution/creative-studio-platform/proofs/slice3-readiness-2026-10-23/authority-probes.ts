/** Read-only planning probes. No database, network, fixture or application mutation. Run: node --import tsx <this path> */
import { createExperienceFromLegacyCard, cloneExperienceDocument, projectExperiencePage, canonicalizeExperienceConfig } from '../../../../../lib/fusion/card/experience-pages';
import { insertObject } from '../../../../../lib/fusion/card/object-kernel';
import { applySurfaceMaterial, getMaterialRecipe } from '../../../../../lib/fusion/creative-studio/material-engine';
import { readStudioSurfaceState, applyStudioSurfaceTreatment, applyStudioSurfaceParameters } from '../../../../../lib/fusion/creative-studio/platform/surface-capability';
import { resolveMaterialSurfaceFromProps } from '../../../../../lib/fusion/creative-studio/material-surface';
import { CABINET_NOIR_ASSETS } from '../../../../../lib/fusion/creative-studio/signature-assets/cabinet-noir';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { TapConnectCardConfig } from '../../../../../lib/brand/tap-card';
const card: TapConnectCardConfig = { version:3, accentColor:'#b8ff2c', surfaceColor:'#07100a',textColor:'#ffffff',headerEnergy:50,collapsible:false,defaultCollapsed:false,actionsLayout:'stack',defaultFinish:'soft',cardFinish:'soft',defaultShape:'rounded_md',sections:[],rootComposition:{version:1,id:'probe-root',label:'Read-only probe',nodes:[{id:'probe-title',primitive:'text',x:0,y:0,width:1,height:.1,zIndex:1,props:{text:'Preserve me'}}],mobileFallback:'scale'} };
const canonical=createExperienceFromLegacyCard(card);
const count=(c:TapConnectCardConfig)=>projectExperiencePage(c).rootComposition?.nodes.length??0;
const legacyClone=cloneExperienceDocument(card,'Probe legacy');
const pageClone=cloneExperienceDocument(canonical,'Probe canonical');
const projected=projectExperiencePage(pageClone);
const inserted=insertObject({config:projected,parentId:null,kind:'text'});
const insertedCommitted=canonicalizeExperienceConfig(inserted.config);
const shape=(p:Record<string,unknown>)=>({ material:p.materialPreset,treatment:readStudioSurfaceState(p).treatment,plane:(p.visualPlane as {kind?:string})?.kind,fill:p.fill,gradient:p.gradientFill,border:p.borderWidth,radius:p.radius,opacity:p.opacity,shadow:p.boxShadow,rendered:resolveMaterialSurfaceFromProps(p,'container').background });
const metal=applySurfaceMaterial({radius:24,opacity:0.7,boxShadow:'inset 0 1px 1px white, 0 8px 18px black'},'gunmetal',{preserveTextColor:true});
const solid=applyStudioSurfaceTreatment(metal,'solid',{fill:'#123456'});
const image=applyStudioSurfaceTreatment(solid,'image',{mediaUrl:'/probe-owned-image.png'});
const transparent=applyStudioSurfaceTreatment(image,'transparent');
const edge=applyStudioSurfaceParameters(metal,{borderWidthPx:2});
const rich=applyStudioSurfaceParameters({fill:'#123456',radius:72,opacity:0,boxShadow:'inset 0 1px 1px white, 0 8px 18px black'},{borderWidthPx:2});
const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
let bytes=0;const missing:string[]=[];const mismatch:string[]=[];
for(const a of CABINET_NOIR_ASSETS){const original='tmp/Cabinet Noir v1/Cabinet_Noir_Cody_Handoff/'+a.normalizedContract?.provenance?.sourceAssetPath;const pub='public'+(a.sourceAsset.startsWith('/')?'':'/')+a.sourceAsset;if(!existsSync(original)){missing.push(original);continue;}bytes+=statSync(original).size;if(sha(original)!==a.sourceSha256||sha(pub)!==a.sourceSha256)mismatch.push(a.id);}
console.log(JSON.stringify({kind:'read-only source probes; not native interaction acceptance',clone:{sourceCount:count(card),canonicalCount:count(canonical),legacyCloneCount:count(legacyClone),canonicalCloneCount:count(pageClone),sourceUnchanged:count(card)===1&&count(canonical)===1,pureInsertAfterEmptyClone:count(insertedCommitted),insertionIdentity:inserted.objectIds.length},material:{metal:shape(metal),solid:shape(solid),image:shape(image),transparent:shape(transparent),borderOnly:shape(edge),richValueBorderOnly:shape(rich)},cabinetNoir:{registeredAssets:CABINET_NOIR_ASSETS.length,originalBytes:bytes,missing,mismatch,gunmetalExists:!!getMaterialRecipe('gunmetal')}},null,2));
