# Blindfold Pass — Status

**Status:** INCOMPLETE — not yet a dual Physical + Product-Steward candidate  
**Branch:** `tapconnect-operational-spine-restoration`  
**Start checkpoint:** `3c5e357ac288f49bea0c79dce727db55ca763077`  
**Preserved Blindfold checkpoint:** `d6792892ca261913d6880624addf929cfb24d5c3` (pushed; clean tree at push)

## What landed (product steward)

| Change | Why |
| --- | --- |
| Card root: single **Background** door; removed duplicate Appearance | Same editor, two labels |
| **Guides** opens Editor theme / Canvas assistance prefs | Dead-end copy removed |
| Button/Badge swatch → Fill (`solid-colors`); Appearance → overview | Toolbar contract |
| Animate → **Motion** label | One product word |
| Chrome **Appearance** → **Editor theme** | Reserve Appearance for objects |
| GradientStudio → **Gradient** | Owner language |
| Root materials: drop Soft Glow (effect); label **Material** | Taxonomy honesty |
| Text Appearance category → Text Box focus (no overview loop) | Routing truth |
| `contextual-text-appearance` rename | Material residue |
| Rail Brand → Palette; Guide → Compass | Distinct icons |
| LibraryAction `aria-label={label}` | Clean accessible names |
| Pref radios/checkboxes get aria-labels | Addressable chrome |

## Certification infrastructure

- `e2e/owner-sim/blindfold-crawl.ts` — context provenance, reconstruct, operate
- Removed **percentage** distinctness gates (effects/materials require every named choice distinct)
- Removed false N/A for missing testid / blank-card invisibility / chrome deferral
- Scoped chrome inventory scrapes; ignore closed `<details>` descendants
- Discrete suites: effects + materials uniqueness **passed** under strict gates

## Remaining blocker (exact)

**Blindfold runtime control×context accounting does not yet complete end-to-end.**

Progress (acct8/acct9 evidence):

- Card-root doors now VERIFIED when ordered before stranding chrome (`contextual-root-background|page-size|guides|more`).
- ~60 blank-card-root controls VERIFIED in a single reconstruct.
- Crawl still wedges near end-of-blank chrome: **Keep this Card** chooser, **Preview draft** exit path, **Resize / Adapt** while an overlay traps pointer events.
- Filtered matrix ≈ **889** context/control cases across 16 contexts; accounting has not yet stably entered `selected-*` / `appearance-*` batches after blank closeout.

Until the harness finishes all contexts with:

- zero unexplained enabled controls  
- zero false N/A  
- zero pending  
- progress log covering every context  

…this pass must not be declared a dual candidate.

## Product findings after checkpoint (Owner-encounterable)

| Trap | Finding | Repair |
| --- | --- | --- |
| Resize / Adapt | Modal used `absolute` coverage + no Escape / weak Done path — Owners can strand pointer events | `fixed` backdrop, Escape ownership, Done + focus close |
| Preview draft | Exit lived on a secondary control; Escape did not leave Preview | Lime Exit Preview CTA; Escape exits Preview |
| Keep this Card | Chooser lacked Escape; dismiss path ambiguous vs Exit-Edit “Keep editing” | Escape closes chooser; Exit dialog gets `card-exit-keep-editing` |
| Exit Edit dialog | Escape did not dismiss | Escape → Keep editing |
| Escape in Studio | DashboardChrome silently `router.push(/dashboard/card)` on Escape, abandoning deep-left / overlays | Card editor Escape owned by shell layers + Exit dialog; chrome no longer silent-navigates |
| Exit while saving | “Keep editing” hidden during `saving`, so Escape/dismiss could leave a full-screen blocker | Keep editing always available; Escape aborts Exit even while save acknowledges |

## Next engineering steps

1. Finish blank-card-root without stranding (Keep/Preview/Resize/Exit ordered + Escape recovery) — in progress.
2. Continue through editor-preferences, overflow, root-background, then every selected/appearance family.
3. Headed Product-Steward walkthrough after green ledger (partial walkthrough already drove the IA fixes above).
4. Re-run foundation + exhaustive suites together; record closeout SHA.
