import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { introductionPreview } from '../reconstitution/native-starting-compositions';
import { createCompositionNode } from '../composition';

const cssRequire = createRequire(import.meta.url);
cssRequire.extensions['.css'] = () => undefined;

test('image backing is reserved for empty editor placeholders, including Preview', async () => {
  const { CreativeCompositionCanvas } = await import('@/components/fusion/creative-studio/creative-composition-canvas');
  for (const editMode of [true, false]) {
    for (const src of ['', '/transparent.png', '/opaque.jpg']) {
      const block = { ...introductionPreview('clean-minimal'), nodes: [createCompositionNode('image', { parentId: null, compositionKind: 'module', props: { src } })] };
      const markup = renderToStaticMarkup(createElement(CreativeCompositionCanvas, { block, editMode }));
      assert.equal(markup.includes('rounded-md bg-white/10'), !src && editMode);
      if (src) assert.ok(markup.includes(`src="${src}"`));
    }
  }
});
