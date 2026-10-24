import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { introductionPreview } from '../reconstitution/native-starting-compositions';

// The Node renderer verifies markup; CSS itself is checked in the native browser.
const cssRequire = createRequire(import.meta.url);
cssRequire.extensions['.css'] = () => undefined;

for (const look of ['clean-minimal', 'dark-cinematic'] as const) {
 test(`${look}: native CTA exposes canonical page routing only outside editing`, async () => {
  const { CreativeCompositionCanvas } = await import('@/components/fusion/creative-studio/creative-composition-canvas');
  const block = introductionPreview(look);
  const button = block.nodes.find(n => n.primitive === 'button')!;
  button.props = { ...button.props, actionType: 'internal_page', internalPageId: 'acceptance-page', destinationRef: 'acceptance-page', href: '' };
  const preview = renderToStaticMarkup(createElement(CreativeCompositionCanvas, { block }));
  assert.match(preview, /data-internal-page-id="acceptance-page"/);
  assert.match(preview, /href="#" aria-disabled="false"/);
  const editor = renderToStaticMarkup(createElement(CreativeCompositionCanvas, { block, editMode: true }));
  assert.doesNotMatch(editor, /data-internal-page-id="acceptance-page"/);
 });
}
