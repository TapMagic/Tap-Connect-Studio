"use client";

import { useEffect } from "react";
import { parseCreativeComposition } from "@/lib/fusion/creative-studio/composition";
import { ensureFontLoaded } from "@/lib/fusion/creative-studio/fonts/load";
import { FONT_CATALOG, getFontById } from "@/lib/fusion/creative-studio/fonts/catalog";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";

/**
 * Ensures composition custom fonts load on Preview / Live Device / public routes
 * the same way Studio typography panels load them during edit.
 */
export function CompositionFontLoader({
  config,
}: {
  config: TapConnectCardConfig;
}) {
  useEffect(() => {
    const families = new Set<string>();
    const collectBlock = (block: ReturnType<typeof parseCreativeComposition>) => {
      if (!block) return;
      for (const node of block.nodes) {
        const ff = node.props.fontFamily;
        if (typeof ff === "string" && ff.trim()) families.add(ff);
        collectBlock(parseCreativeComposition(node.moduleComposition));
      }
    };
    const collectSections = (sections: TapConnectCardConfig["sections"]) => { for (const section of sections || []) {
      const block = parseCreativeComposition(section.composition);
      collectBlock(block);
    }};
    collectBlock(parseCreativeComposition(config.rootComposition));
    collectSections(config.sections);
    for (const page of config.experience?.pages ?? []) {
      collectBlock(parseCreativeComposition(page.composition.rootComposition));
      collectSections(page.composition.sections);
    }
    for (const stack of families) {
      const match =
        FONT_CATALOG.find((f) => stack.includes(f.family)) ||
        getFontById("inter");
      if (match) void ensureFontLoaded(match.id).catch(() => undefined);
    }
  }, [config]);

  return null;
}
