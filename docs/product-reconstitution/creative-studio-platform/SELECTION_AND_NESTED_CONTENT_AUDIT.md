# Selection and Nested Content Audit

Status: repair candidate — human verification required.  
Starting SHA: `746d6755b4bf01affaa26f6cb0ae12866c83be1e`  
Branch: `tapconnect-operational-spine-restoration`

## Human-visible failures (authoritative)

| Finding | Root cause | Intended result | Repair |
| --- | --- | --- | --- |
| Selecting a Container selects every child | `insertRootContainerPreset` shares `groupId` with children; `expandSelectionToGroups` expands selection chrome to all members | Parent mode: one parent boundary/handles only | Containers use `containerId`/`childIds` hierarchy; `groupId` reserved for true Groups; selection expansion skips container trees |
| No clear enter/exit child editing | Content mode only wired for Button (`contentEditing`); Container children are peer root nodes | Edit contents → one child at a time; Escape / Finish / Select parent exits | Explicit `selectionMode: parent \| content` on parent; content mode allows child hit-test and Layers child selection |
| Dragging/resizing Container appears to scale children | Group expansion selects children; move translates all; resize policy not applied | Parent move carries children without selecting them; resize obeys policy | Move via `containerChildIds`; resize through `applyContainerResize` |
| Premium Offer children overlap | Equal-slice absolute layout ignores role heights | Finished non-overlapping stack | Role-weighted preset layout + overlap validation |
| Layers ordering unclear | Hierarchy flattens peers; container children not nested under parent in Layers | Layers is order authority with parent › child | Nest by `containerId`; support reorder / z-order commands |

## Selection modes

### Parent mode

- One primary parent boundary and handles
- Parent toolbar / left drawer / Layers selection
- No child selected chrome
- Controls: move, resize (policy), Appearance, Layout, Action, Motion, Position, order, duplicate, delete, **Edit contents**

### Content mode

- Subdued parent boundary retained
- Children exposed in Layers
- One child selected (Shift multi-select where supported)
- Select beneath / Select parent / keyboard navigation
- Child-specific toolbar and left drawer
- Exit: Finish editing contents, Escape, Select parent, Layers parent selection

## SelectionRef

Must distinguish document, page/root, parent Component, child Element, `childPath`, `selectionGeneration`, and target capability. Stale targets reject mutation via `validateSelectionRef` / `requireCurrentSelection`.

Target labels (toolbar / drawer):

- `Container`
- `Container › Headline`
- `Button` / `Button › Label` / `Button › Icon`
- `Badge` / `Badge › Wording`
- `Gallery › Image 2`

## Disposition ledger

| Target | Command | Mutation | Rendered | Intended | Automated test | Browser evidence | Disposition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Container parent | select | select container id only | parent chrome | parent-only | selection unit + Playwright | parent selected shot | repaired |
| Container content | `component.editChildren` | `contentEditing: true` | subdued parent + child chrome | one child | nested-content tests | child selected shot | repaired |
| Exit content | Escape / Finish | clear content mode | parent chrome | return parent | nested-content tests | escape shot | repaired |
| SelectionRef stale | any patch | reject | no silent fallback | reject | SelectionRef tests | n/a | preserved |

## Non-goals

- Do not restore legacy Inspector
- Do not create a parallel editor
- Do not move Containers into a vertical Section stream
