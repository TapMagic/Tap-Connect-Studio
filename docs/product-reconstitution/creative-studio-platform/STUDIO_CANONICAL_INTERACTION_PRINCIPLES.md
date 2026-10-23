# Studio canonical interaction principles

Standing Product Owner requirements, incorporated into UX planning on 2026-10-23. These requirements govern future slices; they do not enlarge current implementation authorization. Slice 1 remains open, Text Editing Truth remains gated, and production hash verification remains BLOCKED.

## Simple but powerful; familiar actions produce familiar results

The following is the target interaction contract, not a claim that every shortcut already conforms. Each authorized slice must audit its affected commands and record implementation gaps. Visible menus and contextual controls expose the same commands and shortcuts so discovery improves alongside direct manipulation.

| Action | Target default and scope |
| --- | --- |
| Arrow | Move an eligible Layered selection by 1 authored CSS px in the indicated screen direction. |
| Shift + Arrow | Move by 10 authored CSS px. No additional Alt/Ctrl/Meta nudge convention. |
| Delete / Backspace | Delete eligible canvas selection through canonical commands; one reversible operation. |
| Undo | Cmd+Z on macOS; Ctrl+Z elsewhere. Reverse the last completed creative transaction. |
| Redo | Cmd+Shift+Z on macOS; Ctrl+Shift+Z or Ctrl+Y elsewhere. Restore the undone transaction. |
| Escape | Cancel an active manipulation and restore its starting state without adding history; otherwise exit the innermost editing context, then clear selection. Never silently commit a cancelled gesture. |
| Select All | Cmd/Ctrl+A selects eligible visible objects in the active parent scope; never crosses pages or implicitly selects descendants and ancestors together. |
| Duplicate | Cmd/Ctrl+D creates native copies using canonical duplication, identity remapping, parentage and history. Preserve originals; use existing placement policy. |

Authored CSS px are independent of zoom and device pixel ratio: a 1px nudge appears as 2 screen px at 200% zoom. Convert the screen-direction vector through inverse ancestor rotation into the selected parent's content coordinates, then normalize by that content box. An object's own rotation does not rotate keyboard directions. Padding defines the content origin; decorative borders/shadows do not change it. A Group or compatible multi-selection moves as one unit and creates one history entry per key press or continuous repeat sequence. Parent bounds, locks and governed placement remain enforced with visible reasons. Mixed-parent selections expose a reason and a path to select a compatible scope; do not partially mutate them silently.

Flow does not permit arbitrary X/Y nudging. In a vertical Flow, Up/Down reorders by one eligible sibling; horizontal Flow uses Left/Right; Grid uses linear reading order with Left/Right. Shift does not invent a 10-position jump. Unsupported axes explain that layout owns position and offer the existing reorder, alignment, spacing or parent-layout controls. These are proposed defaults for approval in the relevant construction slice, not permission to change Flow semantics now.

Keyboard ownership precedes command dispatch. Inputs, textareas, selects, contenteditable and declared keyboard owners retain caret navigation, deletion, selection, clipboard and native field behavior. IME composition (including composing key events) is never intercepted. Canvas commands require canvas/selection focus; toolbar buttons invoke explicit commands without starting a drag. History during text/property editing belongs to that active transaction; after commit, canvas Undo reverses the completed operation. Do not register independent shortcut/history handlers for each tool.

## Fearless editing

Move, resize, rotate, align, distribute, reorder, group/ungroup, duplicate, delete, styling and text edits must use canonical commands and history. One gesture, property-edit session or approved compound operation is one labelled transaction. Live preview does not create a history entry per pointer event. Cancel restores the complete starting state. No-op and rejected operations create none. Undo/Redo restores content, geometry, hierarchy, styling and selection coherently without replacing stable identities. Save, reload and Preview use committed canonical state; pending/conflicting saves remain visible. Publishing is a separate explicit authority and is not implied by editing Undo.

The received supplemental directive ends at “Co”; no additional truncated requirement is inferred. The general rule applies to all ordinary creative edits, including future approved operations.

## One foundation for manual and tApIt-assisted creation

Manual design, guided creation, AI-assisted edits and AI-generated starting Experiences consume the same document model, Surface/Container hierarchy, geometry, rendering, Materials, validation, permissions, commands/history, persistence and publishing authorities. tApIt is a future consumer, never a second editor.

Capability interfaces must eventually let an authorized consumer inspect selection and parent context; discover permitted operations and constraint reasons; propose native editable nodes/Containers and existing Material/layout operations; diagnose layout issues; protect user-approved work; preview a proposed change; apply an approved change; Undo/Redo it; and explain the result. Proposal previews must render a candidate canonical document without mutating the current document. Application must revalidate permissions, selection, document revision and constraints; stale proposals require reconciliation rather than overwriting intervening user work. A batch creates one explainable canonical transaction. Publish still requires the existing explicit publishing workflow.

Current demonstrated foundations are limited to repairing shared geometry/constraint semantics used by Canvas and Inspector, retaining selection context and meaningful canonical history labels, and keeping transient diagnostics separate from authored state. Reuse existing capability/validation declarations. Do not build an AI planner, tool registry, proposal store, chat UI, generated Experience workflow, independent history, permissions or rendering infrastructure merely for future readiness. Extend an interface only when a present approved consumer demonstrates the need.

## Redesign the cockpit; preserve the authorities

Current editor colors, panel arrangement, proportions and navigation are not locked. Recommend quieter neutral chrome, purposeful brand/selection/feedback colors, more canvas space and progressive disclosure where measured tasks justify them. Preserve recognizable TapConnect/module identity and the landing-page relationship without forcing identical palettes. The authored Experience is the visual center. Existing capability and architecture contracts remain protected; document conflicts for approval rather than adding parallel systems. No big-bang rewrite.

Surface-first authoring remains the organizing model. A Container's placement within its parent is distinct from its internal layout. Root Surfaces and Containers consume the shared Material authority. Every slice improves discoverability and manipulation together, preserves advanced capability, and reports measured improvements separately from estimates. The native two-Container journey must prove creation, styling, drag, alignment, child editing, resize, persistence and Preview with native controls. Exact reference-image comparison remains pending receipt and evaluation of the reference.

## Implemented local Slice 1 refinement

The [final interaction corrective candidate](SLICE1_FINAL_INTERACTION_REVIEW_2026-10-23.md) implements 1px/10px Layered nudges, 300ms idle burst transactions, selected-body dragging, multi-root clipboard conversion and shared Shift corner geometry. Eligible Layered selection roots consume the same parent-coordinate conversion; locked/Flow preservation is explained. Multi-parent clipboard copying remains explicitly constrained to sibling roots. Physical touch and native Shift-drag acceptance remain open. This record supersedes earlier statements that the candidate still uses 1%/5% Layered nudges; it does not certify every target shortcut or authorize Slice 2.
