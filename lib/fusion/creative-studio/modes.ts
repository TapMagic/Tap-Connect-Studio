/**
 * Creative Studio interaction contract.
 * EDIT selects · PREVIEW activates · PUBLIC behaves live.
 */

export type CreativeStudioMode = "edit" | "preview" | "public";

export type PreviewViewport = "desktop" | "tablet" | "phone";

export const CREATIVE_STUDIO_MODE_LABELS: Record<CreativeStudioMode, string> = {
  edit: "Edit",
  preview: "Preview as customer",
  public: "Published Card",
};

export const PREVIEW_VIEWPORT_LABELS: Record<PreviewViewport, string> = {
  desktop: "Desktop",
  tablet: "Tablet",
  phone: "Phone",
};

export const PREVIEW_VIEWPORT_WIDTHS: Record<PreviewViewport, number> = {
  desktop: 1280,
  tablet: 768,
  phone: 390,
};

/** Locked law: Edit selects — customer actions must not fire. */
export function isEditMode(mode: CreativeStudioMode | undefined | null): boolean {
  return mode === "edit" || mode == null;
}

/** Locked law: Preview activates safe customer actions. */
export function isPreviewMode(mode: CreativeStudioMode | undefined | null): boolean {
  return mode === "preview";
}

/** Locked law: Public behaves live with published content only. */
export function isPublicMode(mode: CreativeStudioMode | undefined | null): boolean {
  return mode === "public";
}

export function blocksCustomerActivation(
  mode: CreativeStudioMode | undefined | null
): boolean {
  return isEditMode(mode);
}

export function showsBuilderChrome(
  mode: CreativeStudioMode | undefined | null
): boolean {
  return isEditMode(mode);
}
