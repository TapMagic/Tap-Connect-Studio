import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { CreativeCompositionBlock, CreativeCompositionNode } from '../composition';
import { parseCreativeComposition } from '../composition';
import { applyLayeredResize, moveLayeredNode, resizeLayeredNodeDimension, resizeLayeredPlane, resizeContainerLayeredPlane, resizeFlowContainerWidth, layeredCompositionParentSizePx, setContainerCompositionMode } from '../platform/layered-region';
import { applySelectionGeometryOperation, selectionOperationAvailability } from '../platform/selection-geometry';
import { fitCardToContent, resolveCardExtent, setExplicitCardMinimum } from '../platform/card-extent';
import { copyCompositionNodeSubtree, pasteCompositionNodeSubtree } from '../../card/composition-parent-authority';
import { computeGroupUnionBounds, compositionGroupSpace } from '../group-authority';
import { createEditorHistory, pushEditorHistory, undoEditorHistory, redoEditorHistory } from '../../../utils/editor-history';
const parent: CreativeCompositionNode={id:'parent',compositionKind:'container',primitive:'frame',parentId:null,x:.1,y:.1,width:.5,height:.5,zIndex:1,props:{layout:'layered',padding:0}};
const child: CreativeCompositionNode={id:'child',compositionKind:'module',primitive:'image',parentId:'parent',siblingOrder:0,x:.1,y:.15,width:.4,height:.2,zIndex:1,props:{fit:'cover',src:'/fixture.png',materialPreset:'glass'}};
const block: CreativeCompositionBlock={version:1,id:'root',label:'Frame truth',safeAreaPaddingPx:0,parentAuthority:{version:1,layout:'flow'},compositionMode:{version:1,mode:'layered',layeredHeightPx:400},nodes:[parent,child]};
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const size=(id:string|null)=>id?{widthPx:200,heightPx:200}:{widthPx:400,heightPx:400};
const get=(b:CreativeCompositionBlock,id:string)=>b.nodes.find(n=>n.id===id)!;
test('authoring resize preserves local child pixels while rendered responsive geometry stays normalized',()=>{
 const b=applyLayeredResize(block,'parent',{...parent,width:.75,height:.75},size),c=get(b,'child');
 near(c.x*300,20);near(c.y*300,30);near(c.width*300,80);near(c.height*300,40);
 assert.deepEqual(c.props,child.props);assert.equal(c.parentId,'parent');assert.equal(child.width,.4);
 assert.equal(JSON.stringify(parseCreativeComposition(b)?.nodes),JSON.stringify(b.nodes));
});
test('padding and border content boxes are measured rather than inferred from painted bounds',()=>{
 const p={...parent,props:{layout:'layered',padding:16,borderWidth:2},rotationDeg:30};
 const b=applyLayeredResize({...block,nodes:[p,child]},p.id,{...p,width:.75,height:.75},id=>id?{widthPx:164,heightPx:164}:{widthPx:400,heightPx:400});
 near(get(b,'child').width*264,child.width*164);near(get(b,'child').y*264,child.y*164);assert.equal(get(b,'parent').rotationDeg,30);
});
test('two nested levels rebase the immediate relationship once',()=>{
 const nested={...child,compositionKind:'container' as const,primitive:'frame' as const,props:{layout:'layered',padding:0}};
 const leaf={...child,id:'leaf',parentId:'child'};
 const b=applyLayeredResize({...block,nodes:[parent,nested,leaf]},parent.id,{...parent,height:.75},size);
 near(get(b,'child').height*300,40);assert.deepEqual(get(b,'leaf'),leaf);
});
test('declared percentage sizing remains relative on its declared axis',()=>{
 const relative={...child,widthPct:.4};const b=applyLayeredResize({...block,nodes:[parent,relative]},parent.id,{...parent,width:.75,height:.75},size);
 assert.equal(get(b,'child').widthPct,.4);assert.equal(get(b,'child').width,.4);near(get(b,'child').height*300,40);
});
test('Flow children retain layout sizing and reflow authority',()=>{
 const flow={...parent,props:{layout:'flow',padding:16,alignment:'stretch'}};
 const b=applyLayeredResize({...block,nodes:[flow,child]},flow.id,{...flow,width:.75,height:.75},size);
 assert.deepEqual(get(b,'child'),child);
});
test('shrinking constrained parent stops before clipping children; declared clip permits shrinking',()=>{
 const small={...parent,width:.12,height:.12};
 const b=applyLayeredResize(block,parent.id,small,size),p=get(b,'parent');
 assert.ok(p.width*400>=100);assert.ok(p.height*400>=70);
 const clip={...parent,props:{...parent.props,clipContent:true}};
 const clipped=applyLayeredResize({...block,nodes:[clip,child]},parent.id,small,size);
 near(get(clipped,'parent').width,.12);near(get(clipped,'child').width*48,80);
});
test('exact Inspector dimension uses the same complete child-preserving transaction',()=>{
 const b=resizeLayeredNodeDimension(block,parent.id,'height',.75,size);near(get(b,'child').height*300,40);
 const h=pushEditorHistory(createEditorHistory(block),b);assert.deepEqual(undoEditorHistory(h).present,block);assert.deepEqual(redoEditorHistory(undoEditorHistory(h)).present,b);
});
test('page minimum is independent, plane resize rebases roots only, and Fit retains content',()=>{
 const min=setExplicitCardMinimum(block,1000);assert.deepEqual(min.nodes,block.nodes);assert.equal(min.compositionMode?.layeredHeightPx,400);
 const resized=resizeLayeredPlane(min,800);near(get(resized,'parent').height*800,200);assert.deepEqual(get(resized,'child'),child);
 const fitted=fitCardToContent(resized,300,240);near(get(fitted,'parent').height*300,200);assert.equal(fitted.explicitMinimumHeightPx,300);assert.deepEqual(get(fitted,'child'),child);
 assert.equal(resolveCardExtent(fitted,420).actualHeightPx,420);
 assert.equal(resizeLayeredPlane(block,3000).compositionMode?.layeredHeightPx,1600);
});
test('matching reference follows selection, not document storage order',()=>{
 const a={...child,id:'a',parentId:null,width:.2,height:.2,x:0,y:0};const b={...a,id:'b',x:.3,width:.3,height:.3};
 const result=applySelectionGeometryOperation({...block,nodes:[a,b]},['b','a'],{kind:'match',mode:'width'});
 near(get(result,'a').width,.3);near(get(result,'a').height,.2);assert.deepEqual(get(result,'b'),b);
});
test('matching constrained frames is atomic and aspect-governed width match is proportional',()=>{
 const a={...child,id:'a',parentId:null,width:.3,height:.2,x:0,y:0};const b={...a,id:'b',width:.2,height:.1,x:.4,props:{fit:'contain'}};
 const root={...block,nodes:[a,b]};const matched=applySelectionGeometryOperation(root,['a','b'],{kind:'match',mode:'width'});
 near(get(matched,'b').width,.3);near(get(matched,'b').height,.15);
 assert.equal(selectionOperationAvailability(root,['a','b'],{kind:'match',mode:'both'}).enabled,false);
 const outside={...root,nodes:[a,{...b,x:.8}]};assert.equal(applySelectionGeometryOperation(outside,['a','b'],{kind:'match',mode:'width'}),outside);
});
test('clipboard after resize preserves child local frames and source identities',()=>{
 const grown=applyLayeredResize(block,parent.id,{...parent,height:.75},size);
 const payload=copyCompositionNodeSubtree(grown,parent.id,{widthPx:400,heightPx:400})!;
 const pasted=pasteCompositionNodeSubtree(grown,payload,null,undefined,{widthPx:400,heightPx:400});assert.ok(pasted.ok);
 const copy=pasted.block.nodes.find(n=>n.parentId===pasted.selectedNodeId)!;
 near(copy.y,get(grown,'child').y);near(copy.height,get(grown,'child').height);assert.notEqual(copy.id,child.id);assert.deepEqual(get(pasted.block,'child'),get(grown,'child'));
});
test('mode switching preserves dormant Layered placement after frame resize',()=>{
 const b=applyLayeredResize(block,parent.id,{...parent,height:.75},size);
 const roundtrip=setContainerCompositionMode(setContainerCompositionMode(b,parent.id,'flow'),parent.id,'layered');
 for(const key of ['x','y','width','height'] as const) near(get(roundtrip,'child')[key],get(b,'child')[key]);
});

test('Flow parent / Layered child plane height keeps child physical dimensions',()=>{
 const flow={...block,compositionMode:{version:1 as const,mode:'flow' as const},nodes:[{...parent,props:{...parent.props,layeredHeightPx:200}},child]};
 const result=resizeContainerLayeredPlane(flow,parent.id,300,size);
 near(get(result,'child').y*300,30);near(get(result,'child').height*300,40);
 assert.equal(get(result,'parent').height,parent.height);assert.equal(get(result,'parent').props.layeredHeightPx,300);
});

test('moving a rebased small child does not normalize it back to the insertion minimum',()=>{
 const small={...child,width:.08,height:.04};const grown=applyLayeredResize({...block,nodes:[parent,small]},parent.id,{...parent,width:1,height:1},size);
 const c=get(grown,'child');const moved=moveLayeredNode(grown,c.id,{x:c.x+.001});
 near(get(moved,'child').width,c.width);near(get(moved,'child').height,c.height);
});

test('plane shrink respects content and existing authored-overflow policy',()=>{
 const tall={...block,nodes:[{...parent,y:.5,height:.4},child]};
 assert.equal(resizeLayeredPlane(tall,240).compositionMode?.layeredHeightPx,360);
 const overflow={...tall,compositionMode:{...tall.compositionMode!,bounds:'allow-overflow' as const}};
 assert.equal(resizeLayeredPlane(overflow,240).compositionMode?.layeredHeightPx,240);
});
test('Group matching resolves one visible target and preserves identities',()=>{
 const ref={...child,id:'ref',parentId:null,x:0,y:0,width:.3,height:.1};
 const a={...ref,id:'a',groupId:'pair',x:.5,y:.2,width:.1};const b={...a,id:'b',x:.6};
 const root={...block,nodes:[ref,a,b]};
 const next=applySelectionGeometryOperation(root,['ref','a','b'],{kind:'match',mode:'width'});
 const bounds=computeGroupUnionBounds(next.nodes,'pair',true,compositionGroupSpace(next,'pair'))!;
 near(bounds.width,.3);near(bounds.left,.5);assert.deepEqual(next.nodes.map(n=>n.id),['ref','a','b']);assert.deepEqual(next.nodes.map(n=>n.props),root.nodes.map(n=>n.props));
});

test('authoring Flow Container width preserves local children and the authored responsive percentage',()=>{
 const flow={...block,compositionMode:{version:1 as const,mode:'flow' as const},nodes:[{...parent,props:{...parent.props,widthPercent:50,layeredHeightPx:200}},child]};
 const next=resizeFlowContainerWidth(flow,parent.id,75,size);
 near(get(next,'child').x*300,20);near(get(next,'child').width*300,80);
 assert.equal(get(next,'parent').props.widthPercent,75);near(get(next,'child').height,child.height);
});
