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
  creatingPhonePreview: "Preparing phone preview…",
  phonePreviewReady: "QR ready to scan",
  draftChangedUpdate: "Draft changed — Update phone preview",
  testAction: "Test action",
  openDestination: "Open destination",
  copyDestination: "Copy destination",
  previewOnlyNotPublished: "Preview only — not published",
  stalePreview: "Draft changed — Update phone preview",
  unreachableLocalhost:
    "This preview link uses localhost, which a phone cannot open. Set NEXT_PUBLIC_PREVIEW_BASE_URL to a reachable address.",
  lanCandidateUnverified:
    "LAN candidate — keep phone on the same Wi-Fi. Phone open has not been verified yet.",
  publicCandidateUnverified:
    "Public preview candidate — phone open has not been verified yet.",
  locallyUnreachableCandidate:
    "Phone cannot use this Studio address yet. Use a LAN IP or set NEXT_PUBLIC_PREVIEW_BASE_URL to a phone-reachable host.",
  invalidPreviewCandidate:
    "Invalid preview address for a phone. Fix the preview host/port, then refresh.",
  qrReadyToScan: "QR ready to scan",
  phoneOpenUnverified: "Phone open has not been verified yet.",
} as const;

export type StudioWordingKey = keyof typeof STUDIO_WORDING;
