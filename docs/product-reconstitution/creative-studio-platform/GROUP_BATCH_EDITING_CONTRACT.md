# Group Batch Editing Contract

**Authority:** `lib/fusion/creative-studio/group-authority.ts`

## Content mode

1. Group parent → **Edit contents**
2. Enter `groupContentScope` on all members — **no child auto-selected**
3. Group boundary becomes subdued (`composition-group-content-scope-overlay`)
4. Owner clicks the child they want → `activateGroupContentChild`
5. Child toolbar + drawer follow that child
6. **Finish editing** → exit scope → Group parent selection restored

Never initialize content mode with `members[0]`.

## Capability fan-out

Compatible descendants receive patches via `fanOutProps` / `fanOutWithAdapter`.

Covered capabilities include: font, font size, font weight, italic, underline, alignment, line height, letter spacing, text color, gradient, material, effect, opacity, fill, border, motion, visibility, accessibility.

## Mixed / tri-state

- Font family / size: `Mixed` when values differ
- Bold / Italic / Underline: `on` | `off` | `mixed`
- Click from `mixed` → apply ON to all compatible Text; next click → OFF

## Font size semantics (explicit)

| Operation | Control | Behavior |
| --- | --- | --- |
| **Set all to** | numeric field | Absolute size on every compatible Text (normalizes hierarchy) |
| **Scale sizes** | `+10%` / `−10%` | Proportional scale; preserves hierarchy |

Group transform resize also preserves relative hierarchy via `resizeGroupComposition`.

## Color

Every Group color entry point uses the same `text_color` fan-out. Solid color clears `gradientFill` so the new color is visible on first click.
