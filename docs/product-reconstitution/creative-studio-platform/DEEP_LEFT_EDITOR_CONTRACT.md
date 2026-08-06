# Deep Left Editor Contract

Status: assembly candidate — human verification required.  
Starting SHA: `54fada53deb351a8edc7081b3b1ac448bdd378ae`

## Modes (mutually exclusive)

### LIBRARY MODE

Browse Templates, Elements, Text, Icons, Buttons, Badges, Coupons, Tickets, Brand, Assets, Background, Projects, Reusable, Layers, AI, Tools.

- Visual previews, search, categories, Recent, Favorites, Brand, saved resources.
- Selecting a rail item opens/focuses library mode for that tool.
- Build may exist only as an optional guided checklist — not a duplicate preset catalog.

### EDIT MODE

Complete editing controls for the **exact selected target**.

- Opened only by a contextual toolbar command (or Layers Advanced → same dispatcher).
- Replaces library drawer content temporarily in the **same width**.
- Header always shows: object name · level · capability · parent breadcrumb.
- Nested pages stay in the same drawer (e.g. Text color → Default solid colors → Back).
- Back returns to previous library tool; Close restores library mode.
- Does not open a second drawer or a right panel.
- Does not leave floating property forms over the Card.

## Header examples

| Target | Header |
| --- | --- |
| Text color | Text / Color |
| Button surface | Button / Surface |
| Button label typography | Button › Label / Typography |
| Button icon picker | Button › Icon / Change Icon |
| Badge wording effects | Badge › Wording / Text Effects |
| Container layout | Container / Layout |
| Card background | Card / Background |

## Opening rules

1. Toolbar command calls `dispatchEditorCommand(id, family, open)`.
2. Dispatcher validates family against `EDITOR_COMMAND_REGISTRY`.
3. `open(section)` sets deep-left Edit mode to that section for the current `SelectionRef`.
4. Quick mutations (Bold, Size ±) may stay on the toolbar without opening Edit mode.
5. More menu may open drawer sections only through the same dispatcher.

## Dismissal rules

| Trigger | Behavior |
| --- | --- |
| Back | Exit nested page or return to library mode |
| Close / × | Restore previous library tool |
| Escape (no field editing) | Close Edit mode → library |
| Neutral pasteboard click | Clear selection + close Edit mode |
| Selection change | Retarget Edit mode to new object/section or close if none |
| Preview mode | Close Edit mode; hide contextual toolbar |

## Nested navigation

```
Text color (home)
  → See all default solid colors
  → See all default gradient colors
  → Photo colors
  → Full custom color
Back always returns one level within the same drawer width.
```

## Forbidden

- Parallel mutation state owned by toolbar popovers for major commands
- Generic Surface panel that several unrelated commands silently share
- Card Root Edit mode without explicit root selection
- Widening the shell or stacking a second panel

## Implementation anchors

- State: `DeepLeftEditorSession` (`mode`, `section`, `nestedPage`, `previousLibraryTool`, `selectionGeneration`)
- Host: left rail drawer body switches library ↔ edit
- Content: target-aware editors reuse shared color / gradient / text / material / icon panels
- Registry: `lib/fusion/creative-studio/editor-command-registry.ts`
