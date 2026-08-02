/**
 * Owner-facing wording for Creative Studio chrome.
 * Prefer verbs that describe outcomes over internal jargon.
 */

export const STUDIO_WORDING = {
  undo: "Undo",
  redo: "Redo",
  save: "Save",
  saving: "Saving…",
  saved: "Saved",
  unsaved: "Unsaved changes",
  finishEditing: "Finish editing",
  backToOverview: "Back to Card overview",
  previewAsCustomer: "Preview draft",
  exitPreview: "Exit preview",
  publishedCard: "Published Card",
  draftPreview: "Preview draft",
  workingDraft: "Current working draft",
  hidePanels: "Hide panels",
  focusOnCanvas: "Focus on canvas",
  showPanels: "Show panels",
  openLiveDevice: "Live device",
  updatePhonePreview: "Update phone preview",
  creatingPhonePreview: "Creating phone preview…",
  phonePreviewReady: "Phone preview ready",
  draftChangedUpdate: "Draft changed — Update phone preview",
  testAction: "Test action",
  openDestination: "Open destination",
  copyDestination: "Copy destination",
  previewOnlyNotPublished: "Preview only — not published",
  stalePreview: "Draft changed — Update phone preview",
  unreachableLocalhost:
    "This preview link uses localhost, which a phone cannot open. Set NEXT_PUBLIC_PREVIEW_BASE_URL to a reachable address.",
} as const;

export type StudioWordingKey = keyof typeof STUDIO_WORDING;
