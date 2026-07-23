# Accessibility runtime checklist (Fusion)

Manual must-pass checks before OWNER-READY sign-off. Run against a local `npm run dev` session with keyboard + VoiceOver/NVDA spot-checks. Do not treat automated axe as a substitute for these flows.

## Global (all surfaces)

- [ ] Skip / focus: Tab reaches primary nav and main content; visible focus ring on interactive controls
- [ ] Color: neon lime accent on dark meets contrast for text buttons and links (≥ 4.5:1 body, ≥ 3:1 large UI)
- [ ] Motion: reduce-motion respected where animations are decorative (Builder canvas, hub transitions)
- [ ] Images / logos: Tap Connect mark has meaningful `alt`; decorative icons `aria-hidden`
- [ ] “Powered by Tap The Magic” on public/empty states does not steal focus order from primary CTA

## Builder (Tap Card / Workbench / freeform canvas)

- [ ] Format controls and block library are keyboard operable (Enter/Space activate; Esc closes popovers)
- [ ] Canvas selection announces or exposes selected block via accessible name / live region when changed
- [ ] AI / Automation Team panel: proposal actions (accept / reject / undo) have distinct labels, not icon-only
- [ ] Time-travel / schedule preview controls have labels; disabled states explain why (plan / feature)
- [ ] Lead form preview fields associate `<label>` (or `aria-label`) with inputs; errors announced

## Studio hubs (Experiences, Audience, Insights, Tap Points, Assets, Settings)

- [ ] Hub landing: one `h1`; section titles hierarchical; nav current item via `aria-current="page"`
- [ ] Audience Inbox: thread list + reply composer operable without mouse; Guardian block reasons readable as text
- [ ] Wallet manager: status badges (DRAFT → ISSUED → …) not color-only; include text status
- [ ] Insights tables/charts: data available as text/CSV export path; chart not sole carrier of meaning
- [ ] Journeys: beginner stage list and graph both keyboard reachable; validation errors listed as text, not toast-only
- [ ] Billing / Stripe panel: connection blockers listed as plain language; no secret values in DOM

## MyTap (public `/mytap/[relationshipId]`)

- [ ] Preference toggles (email / SMS / wallet) are real switches/checkboxes with accessible names
- [ ] Frequency select has a visible label; save confirmation is text (not color flash alone)
- [ ] Keep Card / reopen CTA has accessible name; loading and error states announced
- [ ] Works at 200% zoom without horizontal clipping of primary controls
- [ ] Touch targets ≥ 44×44 CSS px for preference controls on mobile widths

## Admin (`/admin`, `/admin/platform`)

- [ ] Platform tabs are a tablist (or equivalent) with keyboard arrow support and selected state
- [ ] Feature Registry kill switches: enable/disable requires reason field; errors tied to inputs
- [ ] Overrides / audit / outbox tables: sortable headers announced; empty states not blank
- [ ] Dead-letter retry actions confirmable via keyboard; destructive actions not single-key
- [ ] Platform admin gate: unauthorized users get clear message (no empty shell)

## Exit criteria

All unchecked items above are OWNER blockers for production enablement of that surface. Record date + tester in the release notes when claiming OWNER-READY for a pillar.
