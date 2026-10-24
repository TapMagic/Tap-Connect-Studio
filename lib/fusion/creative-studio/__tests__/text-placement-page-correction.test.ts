import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {CreativeCompositionBlock,CreativeCompositionNode} from '../composition';
import {findLayeredOpening,layeredPlacementEnvelope,layeredSelectionOverlaps,placeNodeInCompositionParent,planLayeredPagePlacement} from '../platform/layered-region';
import {extendCardPage,fitCardToContent,setExplicitCardMinimum} from '../platform/card-extent';
import {groupCompositionBlock, compositionGroupRecord} from '../group-authority';
import {studioTextBoxStyle} from '../platform/text-authoring';
import {createEditorHistory,pushEditorHistory,undoEditorHistory,redoEditorHistory} from '../../../utils/editor-history';
const n=(id:string,x=0,y=0,w=1,h=.5):CreativeCompositionNode=>({id,primitive:'frame',compositionKind:'module',parentId:null,x,y,width:w,height:h,zIndex:1,props:{}});
const block:CreativeCompositionBlock={version:1,id:'test',label:'Correction',parentAuthority:{version:1,layout:'flow',cardGapPx:12},compositionMode:{version:1,mode:'layered',layeredHeightPx:738,bounds:'constrain'},safeAreaPaddingPx:12,explicitMinimumHeightPx:1024,nodes:[n('occupied'),n('new',.1,.72,.84,.236)]};
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<.0001,`${a} != ${b}`);
test('rendered Auto/Minimum/Fixed policies do not consume dormant placement height',()=>{
 assert.deepEqual(studioTextBoxStyle({textHeightMode:'auto',textMinHeightPx:99}),{minHeight:0});
 assert.deepEqual(studioTextBoxStyle({textHeightMode:'minimum',textMinHeightPx:99}),{minHeight:99});
 assert.deepEqual(studioTextBoxStyle({textHeightMode:'fixed',textFixedHeightPx:64}),{height:64,minHeight:0});
});
test('insertion searches actual edges for a gap the coarse scan misses',()=>{
 const pos=findLayeredOpening(.94,.2,[n('above',0,0,1,.337),n('below',0,.57,1,.43)]);
 near(pos.y,.352);assert.ok(pos.x+.94<=1);
});
test('Curated insertion height uses destination width, preserving the certified aspect',()=>{
 const curated={...n('curated'),props:{flowWidthPercent:84},moduleComposition:{...block,parentAuthority:undefined,signatureAssembly:{version:1} as never,pageHeightPx:207,nodes:[]}};
 const placed=placeNodeInCompositionParent({...block,nodes:[]},curated,null);
 near(placed.height*738,placed.width*366*207/390);
 assert.equal(placed.moduleComposition,curated.moduleComposition);
});
test('crowding is sibling-local and measured Text can occupy more than authored height',()=>{
 const text={...n('text',0,0,1,.05),primitive:'text' as const}; const next=n('next',0,.1,1,.1);
 assert.equal(layeredSelectionOverlaps({...block,nodes:[text,next]},['next']),false);
 assert.equal(layeredSelectionOverlaps({...block,nodes:[text,next]},['next'],{text:{widthPx:366,heightPx:150}}),true);
 assert.equal(layeredSelectionOverlaps({...block,nodes:[{...text,parentId:'elsewhere'},next]},['next']),false);
});
test('extension proposal preserves explicit minimum, unselected physical geometry, and native assembly',()=>{
 const content={...n('occupied',0,0,1,1),rotationDeg:0};
 const assembly={...block.nodes[1],moduleComposition:{...block,nodes:[{...n('action'),props:{href:'https://example.com',materialPreset:'glass',text:'Watch'}}]}};
 const input={...block,nodes:[content,assembly]};const result=planLayeredPagePlacement(input,['new']);assert.ok(result.ok);if(!result.ok)return;
 assert.equal(result.block.explicitMinimumHeightPx,1024);assert.ok(result.extended);
 const out=result.block.nodes;near(out[0].height*result.heightPx,738);near(out[1].height*result.heightPx,assembly.height*738);
 assert.equal(out[1].moduleComposition,assembly.moduleComposition);near(out[1].y*result.heightPx,750);
 assert.deepEqual(input.nodes,[content,assembly]);
 const history=pushEditorHistory(createEditorHistory(input),result.block);assert.deepEqual(undoEditorHistory(history).present,input);assert.deepEqual(redoEditorHistory(undoEditorHistory(history)).present,result.block);
});
test('group and multi-selection preserve relative positions when extending',()=>{
 const a={...n('a',.2,.7,.2,.2),groupId:'pair'},b={...n('b',.5,.75,.2,.15),groupId:'pair'};
 const input={...block,nodes:[a,b]};const result=planLayeredPagePlacement(input,['a','b'],{xPx:12,yPx:200});assert.ok(result.ok);if(!result.ok)return;
 near((result.block.nodes[1].y-result.block.nodes[0].y)*result.heightPx,(b.y-a.y)*738);
 assert.deepEqual(result.block.nodes.map(n=>n.groupId),['pair','pair']);assert.deepEqual(result.block.nodes.map(n=>n.id),['a','b']);
});
test('rotated and measured Text envelopes fit without saving the observation',()=>{
 const t={...n('t',.2,.8,.4,.04),primitive:'text' as const,rotationDeg:20,props:{text:'A long line\nMore',textHeightMode:'auto'}};
 const input={...block,nodes:[t]}; const sizes={t:{widthPx:146.4,heightPx:140}};
 const result=planLayeredPagePlacement(input,['t'],{xPx:0,yPx:120},sizes);assert.ok(result.ok);if(!result.ok)return;
 const out=result.block.nodes[0];near(out.height*result.heightPx,t.height*738);assert.equal(out.props,t.props);
 const envelope=layeredPlacementEnvelope(out,{widthPx:366,heightPx:result.heightPx},sizes);assert.ok(envelope.top+envelope.height<=result.heightPx);
});
test('nested frames, locks, Flow and existing height limit reject expansion with reasons',()=>{
 for(const input of [{...block,compositionMode:{...block.compositionMode!,mode:'flow' as const}}, {...block,nodes:[{...block.nodes[1],parentId:'container'}]}, {...block,nodes:[{...block.nodes[1],locked:true}]}])assert.equal(planLayeredPagePlacement(input,['new']).ok,false);
 const limit=planLayeredPagePlacement(block,['new'],{xPx:0,yPx:1700});assert.equal(limit.ok,false);if(!limit.ok)assert.match(limit.reason,/1,600/);
});
test('page edge grows usable plane; minimum alone does not; Fit retains content geometry',()=>{
 const minimum=setExplicitCardMinimum(block,1400);assert.equal(minimum.compositionMode?.layeredHeightPx,738);
 const extended=extendCardPage(block,1264);assert.equal(extended.compositionMode?.layeredHeightPx,1240);assert.equal(extended.explicitMinimumHeightPx,1024);
 near(extended.nodes[1].height*1240,block.nodes[1].height*738);
 const fitted=fitCardToContent(extended,762,240);assert.equal(fitted.compositionMode?.layeredHeightPx,738);near(fitted.nodes[1].y,block.nodes[1].y);
 assert.equal(extendCardPage(block,5000).compositionMode?.layeredHeightPx,1600);
});

test('page edge extension synchronizes persisted Group frames with rebased members',()=>{
 const grouped=groupCompositionBlock({...block,nodes:[n('a',.1,.4,.2,.1),n('b',.4,.4,.2,.1)]},['a','b'],'pair');
 const extended=extendCardPage(grouped,1100);const before=compositionGroupRecord(grouped,'pair')!,after=compositionGroupRecord(extended,'pair')!;
 near(after.y*1076,before.y*738);near(after.height*1076,before.height*738);
 assert.equal(after.id,before.id);
});
