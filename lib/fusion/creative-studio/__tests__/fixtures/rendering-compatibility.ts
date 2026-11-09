import { createCompositionNode, type CreativeCompositionBlock } from '../../composition';
import { createFlowContainerNode } from '../../../card/composition-parent-authority';
import { textRoleCanonicalProps } from '../../platform/text-authoring';

/** Synthetic, reusable visual contract; no customer records or private media. */
export function renderingCompatibilityFixture(authored = false): CreativeCompositionBlock {
  const container = createFlowContainerNode('Layered image');
  container.id = 'compat-container';
  container.props = { ...container.props, layout: 'layered', layeredHeightPx: 180, containerTreatment: 'smoked_glass' };
  if (!authored) delete container.props.layeredPaddingPlacement;
  const text = createCompositionNode('text', { id: 'compat-text', compositionKind: 'module', parentId: null,
    props: { ...(authored ? textRoleCanonicalProps('body') : {}), text: 'Saved text wraps at its approved width.\n', fontFamily: 'Georgia, serif', fontSize: 18, lineHeight: 1.55, textHeightMode: 'auto', textMinHeightPx: 72 } });
  const image = createCompositionNode('image', { id: 'compat-image', compositionKind: 'module', parentId: container.id, x: 0, y: 0, width: 1, height: 1, props: { src: '/tap-connect-logo.png', fit: 'cover' } });
  return { version: 1, id: 'rendering-compatibility', parentAuthority: { version: 1, layout: "flow", cardGapPx: 16 }, safeAreaPaddingPx: 12, nodes: [text, container, image] } as CreativeCompositionBlock;
}
