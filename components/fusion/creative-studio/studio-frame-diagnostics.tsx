"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";
import { canonicalVisualOverflowPx, isActionBearingCompositionNode } from "@/lib/fusion/creative-studio/platform/frame-semantics";

/** Observation of the shared renderer. Placement stays the authored wrapper. */
export function StudioFrameDiagnostics({ node }: { node: CreativeCompositionNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [text, setText] = useState<{ width: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const box = ref.current?.parentElement?.querySelector<HTMLElement>('[data-text-height-mode]');
    if (node.primitive !== "text" || !box) return;
    const update = () => {
      const visible = box.dataset.textOverflow === "visible";
      const next = {
        width: visible ? Math.max(box.offsetWidth, box.scrollWidth + box.offsetWidth - box.clientWidth) : box.offsetWidth,
        height: visible ? Math.max(box.offsetHeight, box.scrollHeight + box.offsetHeight - box.clientHeight) : box.offsetHeight,
      };
      setText(previous => previous?.width === next.width && previous.height === next.height ? previous : next);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(box);
    for (const child of box.querySelectorAll("[data-inline-editing]")) observer.observe(child);
    document.fonts?.ready.then(update);
    return () => observer.disconnect();
  }, [node]);
  const overflow = canonicalVisualOverflowPx(node);
  const action = isActionBearingCompositionNode(node);
  return <div ref={ref} className="pointer-events-none absolute inset-0 z-[25]" aria-hidden data-testid={`studio-frame-diagnostics-${node.id}`} data-visual-basis={text ? "measured-text-box-plus-effect-estimate" : "placement-plus-effect-estimate"}>
    <div className="absolute inset-0 border border-cyan-300" data-frame="placement" />
    <div className="absolute border border-fuchsia-300" style={text ? { left: -overflow, top: -overflow, width: text.width + overflow * 2, height: text.height + overflow * 2 } : { inset: -overflow }} data-frame="visual" />
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border border-lime-300" style={{ width: action ? "max(100%, 44px)" : "100%", height: action ? "max(100%, 44px)" : "100%" }} data-frame="touch" data-action-bearing={String(action)} />
  </div>;
}
