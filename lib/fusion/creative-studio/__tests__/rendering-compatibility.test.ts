import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createFlowContainerNode } from '../../card/composition-parent-authority';
import { textRoleCanonicalProps, studioTextBoxStyle } from '../platform/text-authoring';

createRequire(import.meta.url).extensions['.css'] = () => undefined;

import { renderingCompatibilityFixture } from './fixtures/rendering-compatibility';

async function markup(authored = false) {
  const { CreativeCompositionCanvas } = await import('@/components/fusion/creative-studio/creative-composition-canvas');
  return renderToStaticMarkup(createElement(CreativeCompositionCanvas, { block: renderingCompatibilityFixture(authored) }));
}

test('saved text preserves tight leading, minimum box, normal wrapping and trailing-newline metrics', async () => {
  const html = await markup();
  assert.match(html, /items-center px-1 h-auto min-h-full/);
  assert.match(html, /min-height:72px/);
  assert.match(html, /leading-tight/);
  assert.doesNotMatch(html, /overflow-wrap:anywhere|min-height:1lh|<br/);
  assert.deepEqual(studioTextBoxStyle({ textHeightMode: 'auto', textMinHeightPx: 72 }), { minHeight: 72 });
});

test('explicit new Text roles retain authored line height, intrinsic sizing and final blank line', async () => {
  const html = await markup(true);
  assert.equal(textRoleCanonicalProps('body').textLayoutVersion, 2);
  assert.match(html, /items-start/);
  assert.match(html, /line-height:1.55/);
  assert.match(html, /overflow-wrap:anywhere/);
  assert.match(html, /<br aria-hidden="true"/);
  assert.doesNotMatch(html, /leading-tight/);
  assert.deepEqual(studioTextBoxStyle({ ...textRoleCanonicalProps('body'), textMinHeightPx: 72 }), { minHeight: 0 });
});

test('unversioned layered image retains its original containing block, not an outer inset frame', async () => {
  const html = await markup();
  const outer = html.match(/data-composition-node="compat-container"[^>]*style="([^"]*)"/)?.[1];
  assert.ok(outer);
  assert.doesNotMatch(outer, /padding:/);
  assert.match(html, /style="[^"]*padding:16px;[^\"]*" data-container-content="true"/);
  assert.match(html, /left:0%;top:0%;width:100%;height:100%/);
  assert.doesNotMatch(html, /rounded-md bg-white\/10/);
});

test('new Container explicitly opts into outer padding while its inner coordinate plane stays unpadded', async () => {
  const html = await markup(true);
  assert.equal(createFlowContainerNode().props.layeredPaddingPlacement, 'outer');
  assert.match(html, /data-composition-node="compat-container"[^>]*style="[^"]*padding:16px/);
  assert.match(html, /style="[^"]*padding:0;[^\"]*" data-container-content="true"/);
});

test('rendering the compatibility fixtures never rewrites their persisted inputs', async () => {
  const { CreativeCompositionCanvas } = await import('@/components/fusion/creative-studio/creative-composition-canvas');
  for (const authored of [false, true]) {
    const block = renderingCompatibilityFixture(authored), before = structuredClone(block);
    renderToStaticMarkup(createElement(CreativeCompositionCanvas, { block }));
    assert.deepEqual(block, before);
  }
});
