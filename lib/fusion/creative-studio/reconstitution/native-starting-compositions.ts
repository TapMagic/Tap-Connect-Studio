import { createCardElement } from '../../card/composer-model';
import { createFlowContainerNode, insertCompositionContainer, insertCompositionModule, type CompositionAuthorityResult } from '../../card/composition-parent-authority';
import { createEmptyCreativeComposition, type CreativeCompositionBlock } from '../composition';
import { applyStudioSurfaceParameters, applyStudioSurfaceTreatment } from '../platform/surface-capability';
import { placeNodeInCompositionParent, type RenderedPlacementSizes } from '../platform/layered-region';
import { textRoleCanonicalProps } from '../platform/text-authoring';
import { updateButtonLabel, updateButtonLabelTypography } from '../button-composition';
import { applyStandardButtonAppearance, applyStandardButtonAppearancePreset } from './standard-button-appearance';
import { evaluateStudioResourceCompatibility, type StudioDiscoveryResource } from '../platform/discovery';

export type IntroductionLook = 'clean-minimal' | 'dark-cinematic';
export const INTRODUCTION_LOOKS: readonly StudioDiscoveryResource<IntroductionLook, IntroductionLook>[] = [
  ['clean-minimal', 'Clean Minimal', 'Open space, crisp typography and a quiet, confident action.'],
  ['dark-cinematic', 'Dark Cinematic', 'A centered statement, luminous contrast and a warm signature action.'],
].map(([id, label, description]) => ({
  ref: { provider: 'studio', resourceId: `introduction:${id}`, version: 1 },
  kind: 'designed-container', label, description,
  preview: { authority: 'CreativeCompositionCanvas', payload: id as IntroductionLook },
  taxonomy: { category: 'container', tags: ['introduction', 'native', id] },
  compatibility: { targetKinds: ['card-surface', 'container'] },
  source: { authority: 'native-starting-compositions', provenance: 'TapConnect native design' },
  brand: { relationship: 'none' },
  governance: { readiness: 'ready', approval: 'not_required', available: true },
  search: { text: `${label} introduction section` }, application: id as IntroductionLook,
}));

/** Appearance only. Layout, child content, opacity and geometry are not recipe inputs. */
export function applyIntroductionSurface(props: Readonly<Record<string, unknown>>, look: IntroductionLook) {
  const dark = look === 'dark-cinematic';
  return applyStudioSurfaceParameters(
    applyStudioSurfaceTreatment(props, 'solid', { fill: dark ? '#141b29' : '#faf8f3' }),
    { borderColor: dark ? '#3b465a' : '#d8d4ca', borderWidthPx: 1, radiusPx: dark ? 24 : 12, shadowPx: dark ? 20 : 0 },
  );
}

/** A consumer of native insert/parent/placement authorities; never a second layout engine. */
export function insertIntroduction(block: CreativeCompositionBlock, look: IntroductionLook, parentId: string | null, insertionIndex?: number, rendered?: RenderedPlacementSizes): CompositionAuthorityResult {
  const parent = parentId ? block.nodes.find(n => n.id === parentId) : null;
  const resource = INTRODUCTION_LOOKS.find(candidate => candidate.application === look);
  if (!resource) return { ok: false, issues: [{ code: 'invalid_parent', message: 'This introduction is no longer available.' }] };
  const compatibility = evaluateStudioResourceCompatibility(resource, { authoringJob: 'insert-introduction', target: { kind: parentId ? parent?.compositionKind ?? 'missing' : 'card-surface' } });
  if (!compatibility.compatible) return { ok: false, issues: [{ code: 'invalid_parent', message: compatibility.reasons.join(' ') }] };
  if (parent?.locked) return { ok: false, issues: [{ code: 'invalid_parent', message: 'Unlock the destination Container or select another parent.' }] };
  const dark = look === 'dark-cinematic';
  const container = createFlowContainerNode(dark ? 'Dark Cinematic introduction' : 'Clean Minimal introduction', 'solid');
  container.props = { ...applyIntroductionSurface(container.props, look), padding: dark ? 28 : 24, gap: dark ? 20 : 16, childAlignment: 'stretch' };
  const placed = placeNodeInCompositionParent(block, container, parentId, undefined, rendered);
  let result = insertCompositionContainer(block, placed, insertionIndex);
  if (!result.ok) return result;
  const heading = createCardElement('text');
  heading.name = 'Introduction heading';
  heading.props = { ...heading.props, ...textRoleCanonicalProps('heading'), text: dark ? 'Something worth\nstaying for.' : 'Make a little\nroom for wonder.', fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSource: 'local', colorSource: 'local', fontWeight: dark ? 700 : 600, fontSize: dark ? 34 : 32, lineHeight: 1.15, letterSpacingEm: -.03, align: dark ? 'center' : 'left', color: dark ? '#f5f3ee' : '#202c29', spacingAbovePx: 0, spacingBelowPx: 0 };
  const body = createCardElement('text');
  body.name = 'Introduction story';
  body.props = { ...body.props, ...textRoleCanonicalProps('body'), text: 'A fresh perspective. A closer connection. Discover the stories and details that make this experience yours.', color: dark ? '#c3cbd7' : '#52605a', colorSource: 'local', fontSource: 'local', fontSize: 16, fontWeight: 400, lineHeight: 1.5, align: dark ? 'center' : 'left', spacingAbovePx: 0, spacingBelowPx: dark ? 8 : 4 };
  const button = createCardElement('button');
  button.name = 'Introduction action';
  button.props = updateButtonLabel({ ...applyStandardButtonAppearance(applyStandardButtonAppearancePreset(button.props, 'clean-flat'), { geometry: dark ? 'pill' : 'rounded', radiusPx: dark ? 999 : 8 }), labelColor: dark ? '#211b10' : '#ffffff', fill: dark ? '#e7c482' : '#253d35', buttonSurfaceKind: 'solid', gradientFill: undefined, radius: dark ? 999 : 8, borderWidth: 0, boxShadow: 0, fontSize: 15, fontWeight: 600, padding: 16, showIcon: false, flowWidthPercent: dark ? 88 : 100, flowAlignment: dark ? 'center' : 'stretch', spacingAbovePx: 0, spacingBelowPx: 0, href: '', actionType: 'website', accessibleLabel: 'Explore the story' }, 'Explore the story', button.id);
  button.props = updateButtonLabelTypography(button.props, { fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSize: 15, fontWeight: 600, color: dark ? '#211b10' : '#ffffff' }, button.id);
  for (const node of [heading, body, button]) {
    result = insertCompositionModule(result.block, node, container.id);
    if (!result.ok) return result;
  }
  return { ...result, selectedNodeId: container.id, selectedNodeIds: [container.id], notices: ['Introduction added. Select the Button and set its Action before sharing.'] };
}

export function introductionPreview(look: IntroductionLook) {
  const block: CreativeCompositionBlock = { ...createEmptyCreativeComposition(), parentAuthority: { version: 1, layout: 'flow', cardGapPx: 0 } };
  const result = insertIntroduction(block, look, null);
  if (!result.ok) throw new Error(result.issues.map(i => i.message).join(' '));
  return result.block;
}
