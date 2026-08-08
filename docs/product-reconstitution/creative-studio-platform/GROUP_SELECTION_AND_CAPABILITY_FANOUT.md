# Group Selection and Capability Fan-out

**Authority:** `lib/fusion/creative-studio/group-authority.ts`  
**Model:** peer `groupId` on composition nodes (`groupNodes` / `ungroupNodes`) — not a second Group species.

## Parent selection

When all true-group members are selected (`isGroupParentSelection`):

- Canvas shows **one** union bounding box (`composition-group-selection-overlay`)
- One resize handle set + one rotate handle + label `Group`
- Child selection overlays are suppressed

Union bounds use transformed AABB of visible members (`computeGroupUnionBounds`).

## Transforms

| Gesture | Implementation |
| --- | --- |
| Move | `expandSelectionToGroups` + `translateNodesOnPasteboard` / `moveGroupComposition` |
| Resize | `resizeGroupComposition` — scale members relative to union origin |
| Rotate | `rotateGroupComposition` — rotate around union center |

One pointer gesture = one commit / Undo entry.

## Edit contents

`enterGroupContentMode` marks `groupContentScope` on all members **without** selecting a child.  
Owner clicks a child → `activateGroupContentChild`.  
Finish / Escape → `exitGroupContentEditing` returns to full Group selection without destroying `groupId`.

See also: `EDITOR_TARGET_SCOPE_CONTRACT.md`, `GROUP_BATCH_EDITING_CONTRACT.md`.

## Capability fan-out

`compatibleDescendants` → `fanOutProps` applies patches only where adapters/families support the capability.

Mixed values: `mixedValueForCapability` → UI shows `Mixed`. Partial scope may show `Applies to N of M selected elements` via `fanOutScopeLabel`.

Groups do **not** invent an invisible Group Surface; Appearance fans out to compatible descendants.
