"use client";

import { useMemo } from "react";
import { CreativeCompositionCanvas } from "@/components/fusion/creative-studio/creative-composition-canvas";
import { createCardElement } from "@/lib/fusion/card/composer-model";
import type { CreativeCompositionBlock } from "@/lib/fusion/creative-studio/composition";

export function StandardButtonPreview({
  props,
  className,
}: {
  props: Record<string, unknown>;
  className?: string;
}) {
  const block = useMemo<CreativeCompositionBlock>(() => {
    const base = createCardElement("button");
    return {
      version: 1,
      id: `standard-button-preview-${String(props.catalogPresetId || "button")}`,
      label: "Standard Button preview",
      background: { kind: "solid", value: "#111827" },
      mobileFallback: "scale",
      nodes: [{
        ...base,
        id: `preview-${String(props.catalogPresetId || "button")}`,
        x: (1 - Number(props.width ?? 0.52)) / 2,
        y: 0.25,
        width: Number(props.width ?? 0.52),
        height: 0.5,
        props: { ...base.props, ...props },
      }],
    };
  }, [props]);

  return (
    <CreativeCompositionCanvas
      block={block}
      editMode={false}
      aspectRatio={3.2}
      minHeightPx={96}
      className={className}
    />
  );
}
