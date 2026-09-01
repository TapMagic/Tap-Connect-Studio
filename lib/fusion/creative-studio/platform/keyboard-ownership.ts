/** Shared keyboard routing authority for every Studio shell and authoring control. */
export const STUDIO_KEYBOARD_OWNERSHIP_CONTRACT = "studioKeyboardOwnership@1.0.0" as const;

export type KeyboardOwnershipEvent = Pick<KeyboardEvent,
  "defaultPrevented" | "isComposing" | "metaKey" | "ctrlKey" | "altKey" | "key"
> & { target: EventTarget | null };

export function studioEditableOwner(target: EventTarget | null): HTMLElement | null {
  if (!target || typeof (target as HTMLElement).closest !== "function") return null;
  return (target as HTMLElement).closest<HTMLElement>([
    "input",
    "textarea",
    "select",
    "[contenteditable]:not([contenteditable='false'])",
    "[role='textbox']",
    "[role='searchbox']",
    "[role='combobox']",
    "[data-studio-keyboard-owner='text-entry']",
  ].join(","));
}

/**
 * Text-entry controls own all ordinary editing keys and platform editing
 * chords. Studio shortcuts may run only when this returns false.
 */
export function editableControlOwnsKeyboard(event: KeyboardOwnershipEvent): boolean {
  return event.defaultPrevented || event.isComposing || Boolean(studioEditableOwner(event.target));
}

export function studioShortcutMayRun(event: KeyboardOwnershipEvent): boolean {
  return !editableControlOwnsKeyboard(event) && !event.altKey;
}
