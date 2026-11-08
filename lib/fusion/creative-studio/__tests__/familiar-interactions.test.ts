import assert from "node:assert/strict";
import { test } from "node:test";
import type { CreativeCompositionBlock, CreativeCompositionNode } from "../composition";
import { fitNativeImageSize, resizeLayeredPlacement, translateLayeredSelection } from "../platform/layered-region";
import { copyCompositionNodeSubtree, pasteCompositionNodeSubtree, duplicateCompositionNode } from "../../card/composition-parent-authority";
import { editableControlOwnsKeyboard } from "../platform/keyboard-ownership";
const node: CreativeCompositionNode = { id: "image", primitive: "image", compositionKind: "module", parentId: null, siblingOrder: 0, x: .2, y: .2, width: .3, height: .2, rotationDeg: 30, zIndex: 1, props: { fit: "cover", cropX: .3, cropY: .6, materialPreset: "glass" } };
const block: CreativeCompositionBlock = { version: 1, id: "interaction", label: "Interaction", mobileFallback: "scale", parentAuthority: { version: 1, layout: "flow", cardGapPx: 16 }, compositionMode: { version: 1, mode: "layered", layeredHeightPx: 600 }, nodes: [node] };
const size = { widthPx: 400, heightPx: 600 };
const near = (a: number, b: number) => assert.ok(Math.abs(a-b)<1e-8, `${a} != ${b}`);
for (const handle of ["e", "w", "n", "s"] as const) test(`${handle} resize changes only its local dimension despite diagonal input`, () => {
 const result = resizeLayeredPlacement(node, handle, { xPx: 24, yPx: 15 }, size);
 if (handle === "e" || handle === "w") near(result.height,node.height); else near(result.width,node.width);
 const angle=Math.PI/6, side=handle==='e'?[-1,0]:handle==='w'?[1,0]:handle==='s'?[0,-1]:[0,1];
 const opposite=(n: typeof result) => { const w=n.width*400,h=n.height*600;return [n.x*400+w/2+side[0]*w/2*Math.cos(angle)-side[1]*h/2*Math.sin(angle),n.y*600+h/2+side[0]*w/2*Math.sin(angle)+side[1]*h/2*Math.cos(angle)]; };
 opposite(result).forEach((v,i)=>near(v,opposite(node)[i]));
});
test("corner free/Shift/locked policies share local-axis geometry",()=>{
 const delta={xPx:35,yPx:8};
 const free=resizeLayeredPlacement(node,"se",delta,size);
 assert.notEqual(free.width/free.height,node.width/node.height);
 const shifted=resizeLayeredPlacement(node,"se",delta,size,true);
 near(shifted.width/shifted.height,node.width/node.height);
 const locked=resizeLayeredPlacement({...node,props:{...node.props,aspectLocked:true}},"se",delta,size);
 near(locked.width/locked.height,node.width/node.height);
});
test("small authored frames do not expand on the inactive resize axis",()=>{
 const small={...node,width:.02,height:.01};
 near(resizeLayeredPlacement(small,"e",{xPx:5,yPx:30},size).height,.01);
});
test("1px and 10px nudges use document pixels, never object rotation or zoom",()=>{
 const one=translateLayeredSelection(block,[node.id],{xPx:1,yPx:0},()=>size).nodes[0];
 near((one.x-node.x)*400,1);near(one.y,node.y);
 const ten=translateLayeredSelection(block,[node.id],{xPx:0,yPx:10},()=>size).nodes[0];near((ten.y-node.y)*600,10);
});
test("nested rotation converts screen direction into parent axes",()=>{
 const parent={...node,id:"parent",primitive:"frame" as const,compositionKind:"container" as const,rotationDeg:90,props:{layout:"layered"}};
 const child={...node,parentId:parent.id};
 const nested={...block,nodes:[parent,child]};
 const next=translateLayeredSelection(nested,[child.id],{xPx:10,yPx:0},()=>size).nodes[1];near(next.x,child.x);near((next.y-child.y)*600,-10);
});
test("multi-selection constrains as one unit and moves Containers without double-moving children",()=>{
 const second={...node,id:"second",x:.69,siblingOrder:1};
 const next=translateLayeredSelection({...block,nodes:[node,second]},[node.id,second.id],{xPx:100,yPx:0},()=>size);
 near(next.nodes[1].x-next.nodes[0].x,second.x-node.x);near(next.nodes[1].x+second.width,1);
 const parent={...node,id:"parent",compositionKind:"container" as const,props:{layout:"layered"}};
 const child={...node,parentId:"parent"};
 const moved=translateLayeredSelection({...block,nodes:[parent,child]},[parent.id,child.id],{xPx:1,yPx:0},()=>size);
 assert.deepEqual(moved.nodes[1],child);
});
test("Flow and locked objects never acquire hidden nudge offsets",()=>{
 const flow={...block,compositionMode:{...block.compositionMode!,mode:"flow" as const}};
 assert.equal(translateLayeredSelection(flow,[node.id],{xPx:10,yPx:0}),flow);
 const locked={...block,nodes:[{...node,locked:true}]};assert.equal(translateLayeredSelection(locked,[node.id],{xPx:10,yPx:0}),locked);
});
test("copy/paste and duplicate preserve image frame, crop, material, rotation and independent identity",()=>{
 const payload=copyCompositionNodeSubtree(block,node.id,size)!;
 const result=pasteCompositionNodeSubtree(block,payload,null,undefined,size);assert.ok(result.ok);
 const copy=result.block.nodes.find(n=>n.id===result.selectedNodeId)!;
 near(copy.width,node.width);near(copy.height,node.height);near(copy.rotationDeg!,node.rotationDeg!);assert.deepEqual(copy.props,node.props);assert.notEqual(copy.id,node.id);
 const duplicate=duplicateCompositionNode(block,node.id);assert.ok(duplicate.ok);const d=duplicate.block.nodes.find(n=>n.id===duplicate.selectedNodeId)!;near(d.width,node.width);assert.deepEqual(d.props,node.props);
});
test("multi-object paste across parent sizes preserves physical size and relative spacing",()=>{
 const second={...node,id:"second",x:.6,y:.5,siblingOrder:1};const source={...block,nodes:[node,second]};
 const payload=copyCompositionNodeSubtree(source,[node.id,second.id],size)!;
 const dest={widthPx:800,heightPx:1200};const result=pasteCompositionNodeSubtree(source,payload,null,undefined,dest);assert.ok(result.ok);
 const copies=result.selectedNodeIds!.map(id=>result.block.nodes.find(n=>n.id===id)!);
 near(copies[0].width*800,node.width*400);near((copies[1].x-copies[0].x)*800,(second.x-node.x)*400);
 const fit=pasteCompositionNodeSubtree(source,payload,null,undefined,{widthPx:100,heightPx:100});assert.ok(fit.ok);assert.ok(fit.notices?.some(n=>n.includes('fit')));
});
test("external image uses native scale or explicit proportional fit",()=>{
 assert.deepEqual(fitNativeImageSize({widthPx:80,heightPx:50},size),{width:.2,height:50/600,scale:1});
 const fitted=fitNativeImageSize({widthPx:800,heightPx:200},size);near(fitted.scale,.5);near(fitted.height*600,100);
});
test("editable controls, prevented events and IME own keyboard input",()=>{
 const e={defaultPrevented:false,isComposing:false,metaKey:false,ctrlKey:false,altKey:false,key:"ArrowRight",target:null};
 assert.equal(editableControlOwnsKeyboard(e),false);assert.equal(editableControlOwnsKeyboard({...e,isComposing:true}),true);assert.equal(editableControlOwnsKeyboard({...e,defaultPrevented:true}),true);
 assert.equal(editableControlOwnsKeyboard({...e,target:{closest:()=>({})} as unknown as EventTarget}),true);
});

test("Flow copy uses observed frame size; Flow paste keeps image dimensions without arbitrary offsets",()=>{
 const flow={...block,compositionMode:{...block.compositionMode!,mode:"flow" as const}};
 const payload=copyCompositionNodeSubtree(flow,node.id,size,{[node.id]:{widthPx:120,heightPx:80}})!;
 const result=pasteCompositionNodeSubtree(block,payload,null,undefined,size);assert.ok(result.ok);
 const copy=result.block.nodes.find(n=>n.id===result.selectedNodeId)!;near(copy.width*400,120);near(copy.height*600,80);near(copy.rotationDeg!,0);
 const toFlow=pasteCompositionNodeSubtree(flow,payload,null,undefined,size);assert.ok(toFlow.ok);
 const f=toFlow.block.nodes.find(n=>n.id===toFlow.selectedNodeId)!;near(Number(f.props.flowWidthPercent),30);near(f.minHeightPx!,80);
});
test("cross-parent paste compensates for ancestor rotation while preserving physical size",()=>{
 const parent={...node,id:"parent",compositionKind:"container" as const,primitive:"frame" as const,parentId:null,siblingOrder:1,rotationDeg:30,props:{layout:"layered"}};
 const payload=copyCompositionNodeSubtree(block,node.id,size)!;
 const result=pasteCompositionNodeSubtree({...block,nodes:[node,parent]},payload,parent.id,undefined,size);assert.ok(result.ok);
 const copy=result.block.nodes.find(n=>n.id===result.selectedNodeId)!;near(copy.rotationDeg!,0);near(copy.width*400,120);near(copy.height*600,120);
});
test("multi-object copy remaps complete Groups without joining the original Group",()=>{
 const a={...node,groupId:"original"}, b={...node,id:"second",groupId:"original",siblingOrder:1,x:.55};
 const group={id:"original",parentId:null,name:"Group",layout:"layered",x:.2,y:.2,width:.65,height:.2} as NonNullable<CreativeCompositionBlock["groups"]>[number];
 const source={...block,nodes:[a,b],groups:[group]};const payload=copyCompositionNodeSubtree(source,[a.id,b.id],size)!;
 const result=pasteCompositionNodeSubtree(source,payload,null,undefined,size);assert.ok(result.ok);
 const copies=result.selectedNodeIds!.map(id=>result.block.nodes.find(n=>n.id===id)!);
 assert.notEqual(copies[0].groupId,"original");assert.equal(copies[0].groupId,copies[1].groupId);assert.equal(result.block.nodes[0].groupId,"original");
});
