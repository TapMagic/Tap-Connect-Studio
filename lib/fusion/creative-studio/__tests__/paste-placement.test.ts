import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { CreativeCompositionBlock, CreativeCompositionNode } from '../composition';
import { copyCompositionNodeSubtree, pasteCompositionNodeSubtree, expandFlowPasteDestination } from '../../card/composition-parent-authority';
import { tightLayeredPlacementHeight } from "../platform/layered-region";
import { resolveStudioPlacementContext } from '../platform/add-discover';
import { createEditorHistory, pushEditorHistory, undoEditorHistory, redoEditorHistory } from '../../../utils/editor-history';
const size = { widthPx: 400, heightPx: 760 };
const node: CreativeCompositionNode = {id:'buttons',name:'Styled set',compositionKind:'module',primitive:'frame',parentId:null,siblingOrder:1,x:.3,y:.62,width:.4,height:.2,zIndex:1,props:{elementKind:'curated-system',flowWidthPercent:84,materialPreset:'brass',action:{href:'https://example.com'}}};
const parent: CreativeCompositionNode = {id:'container',name:'Destination',compositionKind:'container',primitive:'frame',parentId:null,siblingOrder:0,x:.1,y:.8,width:.8,height:.15,zIndex:2,props:{layout:'flow',padding:16,contentFit:'fit_content'}};
const block: CreativeCompositionBlock = {version:1,id:'root',label:'Paste regression',parentAuthority:{version:1,layout:'flow',cardGapPx:12},compositionMode:{version:1,mode:'layered',layeredHeightPx:760},nodes:[node,parent]};
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('explicit Container wins; selected nested child inserts after that child; leaving selects root',()=>{
 assert.equal(resolveStudioPlacementContext(block,parent)?.parentId,parent.id);
 const child={...node,id:'child',parentId:parent.id,siblingOrder:0};const b={...block,nodes:[...block.nodes,child]};
 assert.deepEqual(resolveStudioPlacementContext(b,child),{parentId:parent.id,insertionIndex:1,targetLabel:'Destination',reason:'selected-sibling'});
 assert.equal(resolveStudioPlacementContext(block,null)?.parentId,null);
});
test('PO Flow scenario preserves displayed width and never uses source Y for Flow positioning',()=>{
 const payload=copyCompositionNodeSubtree(block,node.id,size)!;
 const result=pasteCompositionNodeSubtree(block,payload,parent.id,0,{widthPx:288,heightPx:82});assert.ok(result.ok);
 const copy=result.block.nodes.find(n=>n.id===result.selectedNodeId)!;
 assert.equal(copy.parentId,parent.id);near(Number(copy.props.flowWidthPercent)/100*288,160);
 assert.deepEqual(copy.props.action,node.props.action);assert.equal(copy.props.materialPreset,'brass');assert.equal(copy.siblingOrder,0);
 assert.deepEqual(result.block.nodes.find(n=>n.id===node.id),node);
});
test('cross-parent Layered placement starts inside destination; repeated paste is bounded, never cumulative',()=>{
 const destination={...parent,props:{...parent.props,layout:'layered'},rotationDeg:20};
 let b={...block,nodes:[node,destination]};const payload=copyCompositionNodeSubtree(b,node.id,size)!;
 let first: CreativeCompositionNode|undefined;
 for(let i=0;i<12;i++) {const result=pasteCompositionNodeSubtree(b,payload,parent.id,undefined,{widthPx:300,heightPx:250});assert.ok(result.ok);b=result.block;const copy=b.nodes.find(n=>n.id===result.selectedNodeId)!;first??=copy;near(copy.x,first.x);near(copy.y,first.y);near(copy.width*300,160);near(copy.rotationDeg!,-20);assert.ok(copy.x>=0&&copy.y>=0&&copy.x+copy.width<=1&&copy.y+copy.height<=1);}
});
test('clipboard sibling order follows authored order even when node storage differs',()=>{
 const second={...node,id:'second',siblingOrder:0,x:.1,y:.5};const b={...block,nodes:[node,second,parent]};const p=copyCompositionNodeSubtree(b,[node.id,second.id],size)!;assert.deepEqual(p.rootIds,['second','buttons']);
});
test('explicit Flow expansion grows root without stretching originals or nested descendants',()=>{
 const p=copyCompositionNodeSubtree(block,node.id,size)!;const pasted=pasteCompositionNodeSubtree(block,p,parent.id,0,{widthPx:288,heightPx:82});assert.ok(pasted.ok);
 const grown=expandFlowPasteDestination(pasted.block,parent.id,450,id=>id===null?size:{widthPx:288,heightPx:82});assert.ok(grown.ok);
 const h=grown.block.compositionMode!.layeredHeightPx;assert.equal(h,1070);
 const original=grown.block.nodes.find(n=>n.id===node.id)!;near(original.y*h,node.y*760);near(original.height*h,node.height*760);
 const container=grown.block.nodes.find(n=>n.id===parent.id)!;near(container.height*h,450);near(container.y*h,608);
 const history=pushEditorHistory(createEditorHistory(block),grown.block);assert.deepEqual(undoEditorHistory(history).present,block);assert.deepEqual(redoEditorHistory(undoEditorHistory(history)).present,grown.block);
});
test('Layered page limit rejects expansion rather than silently normalizing and clipping',()=>{
 const result=expandFlowPasteDestination(block,parent.id,1100,()=>size);assert.equal(result.ok,false);if(!result.ok)assert.match(result.issues[0].message,/1600px/);
});
test('Group anchor selection copies all members; Edit Contents copies only the chosen child',()=>{
 const a={...node,id:'a',groupId:'g',siblingOrder:0};const b={...node,id:'b',groupId:'g',siblingOrder:1,x:.6};
 const group={id:'g',name:'Buttons',parentId:null,layout:'layered',density:'standard',rowGapPx:12,columnGapPx:12,internalGapPx:0,scaleMode:'proportional',x:.3,y:.62,width:.7,height:.2} as NonNullable<CreativeCompositionBlock['groups']>[number];
 const grouped={...block,nodes:[a,b],groups:[group]};const p=copyCompositionNodeSubtree(grouped,'a',size)!;assert.deepEqual(p.rootIds,['a','b']);assert.equal(p.groups.length,1);
 const content={...grouped,nodes:[{...a,props:{...a.props,groupContentScope:true,groupContentEditing:true}},b]};const child=copyCompositionNodeSubtree(content,'a',size)!;assert.deepEqual(child.rootIds,['a']);assert.equal(child.groups.length,0);
});

test('tight governed frames may use the full fitted parent height without a hidden 90 percent shrink',()=>{
 const source={...node,width:1,height:1,moduleComposition:{version:1,id:'assembly',label:'Assembly',nodes:[],pageHeightPx:760,signatureAssembly:{input:{actions:[]}}} as unknown as CreativeCompositionBlock};
 const root={...block,safeAreaPaddingPx:0,nodes:[source]};
 // A 390px wide governed frame with native height 760 fills its 760px parent.
 near(tightLayeredPlacementHeight(root,source),1);
});
