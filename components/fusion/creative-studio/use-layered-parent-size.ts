"use client";

import { useLayoutEffect, useState } from "react";
import type { CreativeCompositionBlock } from "@/lib/fusion/creative-studio/composition";
import { layeredCompositionParentSizePx } from "@/lib/fusion/creative-studio/platform/layered-region";
import { canonicalVisualOverflowPx } from "@/lib/fusion/creative-studio/platform/frame-semantics";

/** Observes published node frames, not scrollHeight (which includes editor chrome).
 * Transformed DOM rectangles include nested rotation. Effect envelopes and rotated
 * clip intersections are conservative bounds, not claims about exact painted pixels.
 */
export function measureCompositionContentExtent(canvas: HTMLElement, block: CreativeCompositionBlock): number {
  const origin = canvas.getBoundingClientRect();
  const scale = origin.width / Math.max(1, canvas.offsetWidth);
  let bottom = 0;
  for (const element of canvas.querySelectorAll<HTMLElement>('[data-composition-node]')) {
    if (element.closest('[data-composition-surface]') !== canvas) continue;
    const node = block.nodes.find(candidate => candidate.id === element.dataset.compositionNode);
    if (!node || node.visible === false || getComputedStyle(element).display === "none") continue;
    const rect = element.getBoundingClientRect();
    let visibleBottom = rect.bottom;
    if (node.primitive === "text") {
      const textBox = element.querySelector<HTMLElement>('[data-text-height-mode]');
      if (textBox) {
        visibleBottom = textBox.getBoundingClientRect().bottom;
        if (textBox.dataset.textOverflow === "visible") {
          for (const glyph of textBox.querySelectorAll("[data-inline-editing]")) visibleBottom = Math.max(visibleBottom, glyph.getBoundingClientRect().bottom);
        }
      }
    }
    let extent = visibleBottom + canonicalVisualOverflowPx(node) * scale;
    let ancestor = element.parentElement;
    while (ancestor && ancestor !== canvas) {
      if (ancestor.hasAttribute('data-composition-node') && ['hidden', 'clip'].includes(getComputedStyle(ancestor).overflowY)) extent = Math.min(extent, ancestor.getBoundingClientRect().bottom);
      ancestor = ancestor.parentElement;
    }
    bottom = Math.max(bottom, (extent - origin.top) / Math.max(.01, scale));
  }
  return Math.ceil(bottom + (block.safeAreaPaddingPx ?? 12));
}

/** Read the canonical renderer's untransformed content box, never its rotated AABB.
 * This is transient observation of browser layout, not authored geometry or a layout engine.
 */
export function renderedLayeredParentSize(element: HTMLElement) {
  const style = getComputedStyle(element);
  const number = (value: string) => Number.parseFloat(value) || 0;
  const borderBox = style.boxSizing === "border-box";
  return {
    widthPx: Math.max(1, number(style.width) - (borderBox ? number(style.paddingLeft) + number(style.paddingRight) + number(style.borderLeftWidth) + number(style.borderRightWidth) : 0)),
    heightPx: Math.max(1, number(style.height) - (borderBox ? number(style.paddingTop) + number(style.paddingBottom) + number(style.borderTopWidth) + number(style.borderBottomWidth) : 0)),
  };
}

/** Shared transient context for Canvas, Inspector and clipboard conversions. */
export function readRenderedLayeredParentSize(block: CreativeCompositionBlock, parentId: string | null) {
  const canvas = [...document.querySelectorAll<HTMLElement>('[data-composition-surface="true"][data-edit-mode="true"]')]
    .find((element) => element.dataset.compositionId === block.id);
  const region = canvas && [...canvas.querySelectorAll<HTMLElement>('[data-layered-region="true"]')]
    .find((element) => element.dataset.layeredRegionId === (parentId ?? "card-surface"));
  const flow = parentId === null ? canvas?.querySelector<HTMLElement>('[data-card-surface-flow="true"]')
    : [...(canvas?.querySelectorAll<HTMLElement>('[data-composition-node]') ?? [])].find((element) => element.dataset.compositionNode === parentId)?.querySelector<HTMLElement>(':scope > [data-container-content]');
  return region ? renderedLayeredParentSize(region) : flow ? renderedLayeredParentSize(flow) : layeredCompositionParentSizePx(block, parentId);
}

export function useLayeredParentSize(block: CreativeCompositionBlock, parentId: string | null) {
  const [measured, setMeasured] = useState<{ key: string; widthPx: number; heightPx: number } | null>(null);
  const key = `${block.id}:${parentId ?? "card-surface"}`;
  useLayoutEffect(() => {
    const canvas = [...document.querySelectorAll<HTMLElement>('[data-composition-surface="true"][data-edit-mode="true"]')]
      .find((element) => element.dataset.compositionId === block.id);
    const region = canvas && [...canvas.querySelectorAll<HTMLElement>('[data-layered-region="true"]')]
      .find((element) => element.dataset.layeredRegionId === (parentId ?? "card-surface"));
    if (!region) { setMeasured(null); return; }
    const update = () => {
      const size = renderedLayeredParentSize(region);
      setMeasured((previous) => previous?.key === key && previous.widthPx === size.widthPx && previous.heightPx === size.heightPx ? previous : { key, ...size });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(region);
    return () => observer.disconnect();
  }, [block, parentId, key]);
  return measured?.key === key ? measured : layeredCompositionParentSizePx(block, parentId);
}

export function readRenderedCompositionFrames(block: CreativeCompositionBlock) {
  const canvas = [...document.querySelectorAll<HTMLElement>('[data-composition-surface="true"][data-edit-mode="true"]')]
    .find((element) => element.dataset.compositionId === block.id);
  return Object.fromEntries([...(canvas?.querySelectorAll<HTMLElement>('[data-composition-node]') ?? [])].map((element) => {
    const style = getComputedStyle(element);
    return [element.dataset.compositionNode!, { widthPx: parseFloat(style.width), heightPx: parseFloat(style.height) }];
  }));
}

/** Observe the active destination chain after a canonical paste preview. */
export function readFlowPasteOverflow(block: CreativeCompositionBlock, parentId: string | null) {
  const canvas = [...document.querySelectorAll<HTMLElement>('[data-composition-surface="true"][data-edit-mode="true"]')].find((element) => element.dataset.compositionId === block.id);
  let id = parentId;
  while (id) {
    const node = block.nodes.find((candidate) => candidate.id === id);
    const outer = [...(canvas?.querySelectorAll<HTMLElement>('[data-composition-node]') ?? [])].find((element) => element.dataset.compositionNode === id);
    const content = outer?.querySelector<HTMLElement>(':scope > [data-container-content]');
    if (outer && content && content.dataset.containerLayout !== "layered") {
      const style = getComputedStyle(outer);
      const height = parseFloat(style.height);
      const required = Math.max(content.offsetHeight, content.scrollHeight);
      if (required > height + 1) return { parentId: id, name: node?.name || "Container", heightPx: height, requiredHeightPx: required };
    }
    id = node?.parentId ?? null;
  }
  return null;
}

export function revealCompositionSelection(blockId: string, ids: string[]) {
  const canvas = [...document.querySelectorAll<HTMLElement>('[data-composition-surface="true"][data-edit-mode="true"]')].find((element) => element.dataset.compositionId === blockId);
  const element = [...(canvas?.querySelectorAll<HTMLElement>('[data-composition-node]') ?? [])].find((element) => ids.includes(element.dataset.compositionNode!));
  element?.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
  element?.focus({ preventScroll: true });
}
