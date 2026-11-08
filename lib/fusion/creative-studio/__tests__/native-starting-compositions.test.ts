import test from 'node:test';
import assert from 'node:assert/strict';
import { insertIntroduction, applyIntroductionSurface, introductionPreview } from '../reconstitution/native-starting-compositions';
import { createEmptyCreativeComposition } from '../composition';
import { establishCompositionParentAuthority, validateCompositionParentAuthority, createFlowContainerNode, insertCompositionContainer } from '../../card/composition-parent-authority';
import { setCardSurfaceCompositionMode, setContainerCompositionMode } from '../platform/layered-region';
import { studioNodeDisplayLabel } from '../platform/studio-selection-target';

for (const look of ['clean-minimal','dark-cinematic'] as const) {
  test(`${look}: native hierarchy, stable serialization, fresh identities and editable content`, () => {
    const block = introductionPreview(look);
    assert.deepEqual(validateCompositionParentAuthority(block), []);
    const container = block.nodes.find(n => n.compositionKind === 'container')!;
    const children = block.nodes.filter(n => n.parentId === container.id);
    assert.deepEqual(children.map(n => n.primitive), ['text','text','button']);
    assert.equal(container.props.layout, 'flow');
    assert.equal(children[0].props.textHeightMode, 'auto');
    assert.equal(children[2].props.href, '');
    assert.equal(new Set(block.nodes.map(n=>n.id)).size, 4);
    const restored = JSON.parse(JSON.stringify(block));
    assert.deepEqual(restored.nodes.map((n: {id:string})=>n.id), block.nodes.map(n=>n.id));
    assert.ok(introductionPreview(look).nodes.every(n => !block.nodes.some(old => old.id === n.id)));
  });
  for (const rootMode of ['flow','layered'] as const) for (const nestedMode of ['flow','layered'] as const) {
    test(`${look}: ${rootMode} root / ${nestedMode} rotated padded nested destination preserves siblings`, () => {
      let block = setCardSurfaceCompositionMode(establishCompositionParentAuthority(createEmptyCreativeComposition()), rootMode);
      const parent = createFlowContainerNode('Destination'); parent.rotation=17;parent.props.padding=28;
      const inserted = insertCompositionContainer(block, parent); assert.ok(inserted.ok);block=inserted.block;
      block=setContainerCompositionMode(block,parent.id,nestedMode);
      const before=JSON.stringify(block);
      const result=insertIntroduction(block,look,parent.id); assert.ok(result.ok);
      assert.equal(JSON.stringify(block),before);
      assert.deepEqual(result.block.nodes.find(n=>n.id===parent.id),block.nodes.find(n=>n.id===parent.id));
      assert.deepEqual(validateCompositionParentAuthority(result.block),[]);
      assert.equal(result.block.nodes.find(n=>n.id===result.selectedNodeId)?.parentId,parent.id);
      assert.deepEqual(result.block.compositionMode,block.compositionMode);
    });
  }
}
test('Surface treatment changes appearance without touching content, layout, actions, geometry or child asset references',()=>{
 const props={layout:'layered',padding:27,gap:11,widthPercent:68,childAlignment:'end',heightPx:444,text:'Keep Exact Case\nAnd lines',href:'https://example.com',mediaAssetId:'original',opacity:.73,contentComposition:{nodes:[{id:'child'}]}};
 for(const look of ['clean-minimal','dark-cinematic'] as const){const after=applyIntroductionSurface(props,look);for(const [key,value]of Object.entries(props))assert.deepEqual(after[key],value,key);}
});
test('Invalid or locked destinations reject the entire candidate, with no mutation',()=>{
 const root=establishCompositionParentAuthority(createEmptyCreativeComposition());
 assert.equal(insertIntroduction(root,'clean-minimal','missing').ok,false);
 const container=createFlowContainerNode();container.locked=true;
 const added=insertCompositionContainer(root,container);assert.ok(added.ok);
 assert.equal(insertIntroduction(added.block,'clean-minimal',container.id).ok,false);
 assert.equal(added.block.nodes.length,1);
});
test('Labels enrich generic names without changing authored names or content',()=>{
 const node=introductionPreview('clean-minimal').nodes.find(n=>n.primitive==='text')!;
 assert.equal(studioNodeDisplayLabel(node),'Introduction heading');
 const generic={...node,name:'Text'};const before=JSON.stringify(generic);
 assert.match(studioNodeDisplayLabel(generic),/^Text · Make a little room/);
 assert.equal(JSON.stringify(generic),before);
});

test('Button appearance and nested label use the same canonical values',()=>{
 for(const look of ['clean-minimal','dark-cinematic'] as const){
  const button=introductionPreview(look).nodes.find(n=>n.primitive==='button')!;
  const content=button.props.contentComposition as {nodes:{props:Record<string,unknown>}[]};
  const label=content.nodes.find(n=>n.props.buttonContentRole==='label')!;
  assert.equal(label.props.fontSize,button.props.fontSize);
  assert.equal(label.props.color,button.props.labelColor);
  assert.equal((button.props.standardButtonAppearance as {radiusPx:number}).radiusPx,button.props.radius);
 }
});
