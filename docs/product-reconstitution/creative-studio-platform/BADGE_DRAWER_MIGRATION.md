# Badge Drawer Migration

## Removed

- **Badge Designs** as material-as-species insertion (Gold/Glass/Metal disguised as badge types)
- Initial material catalog as a co-equal library section competing with Appearance

## Library now

`STARTER_BADGE_SHAPES` + `STARTER_BADGE_COMPOSITIONS` in `starter-preset-registry.ts`:

- Shapes: Pill, Round, Seal, Ribbon, Corner ribbon, Shield, Burst, Starburst, Tag
- Useful starters: Sale, New, VIP, Verified, Limited, Award, Special, Member, Featured

Defaults may include attractive fills. **Appearance** (shared MaterialRecipe) owns Gold/Glass/etc. after insert.

Shape / wording / material mutations must not randomly rewrite the other two.

## Drawer ownership flicker

**Root cause:** `useDeepLeftPanelHost` re-opened edit and polled the portal every 32ms, fighting library ownership when Card Root Background opened while Badges library was active.

**Repair:**

- One open key per section/target/capability — no thrash reopen
- MutationObserver once for portal mount (no timer loop as state authority)
- Explicit close only when this host owns the edit session

Expected: Badge Library → Card Root Background = **one** transition to edit route.
