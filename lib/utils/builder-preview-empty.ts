export type BuilderPreviewEmptyReason = "no_blocks" | "email_only" | "all_disabled";

/** Derive why the campaign page preview would look blank in edit mode. */
export function campaignPreviewEmptyReason(
  blocks: { enabled?: boolean; channel?: string }[]
): BuilderPreviewEmptyReason | null {
  if (!blocks.length) return "no_blocks";

  const pageBlocks = blocks.filter((b) => {
    if (b.enabled === false) return false;
    const ch = b.channel ?? "page";
    return ch === "page" || ch === "both";
  });

  if (pageBlocks.length > 0) return null;

  const anyEnabled = blocks.some((b) => b.enabled !== false);
  if (anyEnabled) return "email_only";
  return "all_disabled";
}

/** Card builder: empty when no enabled sections. */
export function tapCardPreviewEmptyReason(
  sections: { enabled?: boolean }[]
): "no_blocks" | "all_disabled" | null {
  if (!sections.length) return "no_blocks";
  if (sections.some((s) => s.enabled !== false)) return null;
  return "all_disabled";
}
