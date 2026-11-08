import assert from 'node:assert/strict';
import { it } from 'node:test';
import { applyStudioSurfaceParameters, applyStudioSurfaceTreatment, readStudioSurfaceState } from '../platform/surface-capability';
import { applySurfaceMaterial, compositionBackgroundFromMaterialRecipe, getMaterialRecipe, materialPropsFromCompositionBackground } from '../material-engine';
import { resolveMaterialSurfaceFromProps } from '../material-surface';

it('switches Material → Solid → Image → Transparent without stale fill authority, including serialization', () => {
  let props = applySurfaceMaterial({layout:'layered',padding:20,text:'Keep exact text'}, 'gunmetal', {preserveTextColor:true});
  assert.equal(readStudioSurfaceState(props).treatment, 'material');
  props = applyStudioSurfaceTreatment(props,'solid',{fill:'#123456'});
  assert.equal(resolveMaterialSurfaceFromProps(props,'container').background,'#123456');
  props = applyStudioSurfaceTreatment(props,'image',{mediaUrl:'/owned.png',mediaAssetId:'owned'});
  assert.equal(props.materialPreset,null);
  assert.equal(readStudioSurfaceState(props).visualPlane.kind,'image');
  props = JSON.parse(JSON.stringify(applyStudioSurfaceTreatment(props,'transparent')));
  assert.equal(resolveMaterialSurfaceFromProps(props,'container').background,'transparent');
  assert.equal(readStudioSurfaceState(props).visualPlane.kind,'none');
  assert.equal(props.backgroundImageUrl,null);
  assert.equal(props.layout,'layered'); assert.equal(props.padding,20); assert.equal(props.text,'Keep exact text');
});
it('single-property edits preserve rich shadows, imported radius, zero opacity and image identity', () => {
  const original={radius:72,opacity:0,boxShadow:'inset 0 1px 1px white, 0 8px 18px black',backgroundImageUrl:'/owned.png',backgroundMediaAssetId:'asset',layout:'flow',padding:20};
  const next=applyStudioSurfaceParameters(original,{borderWidthPx:2});
  for(const key of Object.keys(original)) assert.deepEqual(next[key],original[key as keyof typeof original]);
  assert.equal(next.borderWidth,2);
  assert.equal(readStudioSurfaceState(next).radiusPx,72);
  assert.equal(readStudioSurfaceState(next).opacity,0);
});
it('reapplying a recipe clears stale image adapter state and border changes preserve its gradient', () => {
  const image=applyStudioSurfaceTreatment({},'image',{mediaUrl:'/owned.png'});
  const metal=applySurfaceMaterial(image,'gunmetal',{preserveTextColor:true});
  assert.equal(readStudioSurfaceState(metal).treatment,'material');
  const next=applyStudioSurfaceParameters(metal,{borderWidthPx:3});
  assert.equal(next.gradientFill,metal.gradientFill);
  assert.equal(next.materialPreset,'gunmetal');
  assert.equal(next.visualPlane,null);
});
it('root material resolution honors supported authored opacity and fill overrides', () => {
  const background=compositionBackgroundFromMaterialRecipe(getMaterialRecipe('gunmetal')!);
  const props=materialPropsFromCompositionBackground({...background,opacity:0,value:'linear-gradient(#123456,#abcdef)'})!;
  assert.equal(props.opacity,0);
  assert.equal(props.gradientFill,'linear-gradient(#123456,#abcdef)');
});

it('source-backed recipes produce a renderable canonical Visual Plane', async () => {
  const { visualPlaneToStyle } = await import('../visual-plane');
  const props = applySurfaceMaterial({}, 'worn_saddle_leather');
  const plane = readStudioSurfaceState(props).visualPlane;
  assert.equal(plane.kind, 'image');
  const style = visualPlaneToStyle(plane);
  assert.match(String(style.backgroundImage), /url/);
});

it('source-backed recipe parameters agree with rendered props after glass', () => {
  const props = applySurfaceMaterial({ opacity: .72, borderWidth: 3, radius: 28, backdropBlur: 14 }, 'worn_saddle_leather');
  const state = readStudioSurfaceState(props);
  assert.equal(state.opacity, props.opacity);
  assert.equal(state.borderWidthPx, props.borderWidth);
  assert.equal(state.radiusPx, props.radius);
  assert.equal(state.shadowPx, props.boxShadow);
});
