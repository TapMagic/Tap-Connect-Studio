# TapConnect Penthouse — Owner Review Package

Branch: `replit-penthouse-transformation` (experimental — not merged, not deployed).

## 1. Preview & startup

- **Preview URL (development):** the Replit preview pane, port 5000. From a shell the app is reachable at `http://127.0.0.1:5000` or via the workspace `$REPLIT_DEV_DOMAIN`.
- **Exact startup command** (the configured "Start application" workflow):

```sh
export PATH=/nix/store/bf45nflf0wylnscwwa2xgliib91x226l-nodejs-22.22.0/bin:$PATH
DATABASE_URL="postgresql://$PGUSER:$PGPASSWORD@$PGHOST:5432/tapconnect_fusion_dev?sslmode=disable" \
FUSION_ALLOW_REMOTE_DEV_DB=true \
FUSION_CONFIRM_ISOLATED_DEV_DB=tapconnect_fusion_dev \
PLATFORM_ADMIN_EMAILS=dev@tapconnect.local \
npx next dev -p 5000 -H 0.0.0.0
```

- **Auth / test path:** Clerk is intentionally not configured in this environment. The app runs a local dev session banner ("Dev mode: Clerk auth not configured") and signs you in as the seeded owner (`dev@tapconnect.local`, platform admin). Simply open `/dashboard`. Seed workspace: **[SEED] Demo Cafe**; public tap URL: `/t/seeddemo01`.
- **E2E command:** `PROOF_HEADED=1 BASE_URL=http://127.0.0.1:5000 npx playwright test` (some specs also want `DATABASE_URL`, `SEED_BUSINESS_ID`, `SEED_DEVICE_SLOT_ID` — see `e2e/proof-helpers.ts` + `tmp/fusion-seed-ids.json`).

## 2. Route map

**Public**
- `/` — Penthouse landing (Studio Assembly hero, cinematic pullback, 12-capability product explorer, deep dives, TapConnect/Studio selector, tier cards, integration ticker, offer journey)
- `/pricing`, `/features`
- `/t/[deviceCode]` — public tap resolution (e.g. `/t/seeddemo01`)
- `/c/[slug]` — public campaign pages; offer Card checkout cancel/return pages under the offer journey

**Studio (authenticated)**
- `/dashboard` — Card Command Center home (operations console, decision queue at `#decision-queue`)
- `/dashboard/card/edit` — Card authoring workspace (adaptive shell, Outline drawer for blocks/actions)
- `/dashboard/brand` — Brand Kit; `/dashboard/assets` — Assets library (+ keyword suggestions disclosure)
- `/dashboard/campaigns`, `/dashboard/campaigns/[id]` — campaign builder (3-column studio; narrower rails at 1024px)
- `/dashboard/email` — Email authoring workspace (technical tools behind `email-technical-tools` disclosure)
- `/dashboard/inbox` — Email & Replies + Guardian consent messaging
- `/dashboard/audience` — Audience, consent, TapLoop (`#taploop`)
- `/dashboard/journeys` — TapFlow; `/dashboard/experiences/canvas` — TapCanvas; `/dashboard/experiences/tapcast` — TapCast
- `/dashboard/insights` — Insights/TapProof evidence narrative
- `/dashboard/integrations`, `/dashboard/settings`, `/dashboard/groups/[id]` (time-travel preview), `/dashboard/devices` (Tap Points)

## 3. Review artifacts (on this branch)

- **Screenshots (desktop/tablet/phone, full page):** captured by the proof suites into `tmp/` — `tmp/studio-assembly-landing-page*/`, `tmp/card-centered-owner-experience*/`, `tmp/brand-v0-precommit-shots/`, `tmp/campaign-format-precommit-shots/`, `tmp/email-authoring-proofs/`, `tmp/email-replies-proofs/`, `tmp/fusion-proofs/`, and per-spec proof folders. Regenerate any of them by re-running the matching spec with `PROOF_HEADED=1`.
- **Assembly motion proof:** `e2e/studio-assembly-owner-calibration.spec.ts` + `e2e/studio-assembly-cinematic-reveal.spec.ts` capture staged frames of the Assembly opening (desktop/tablet/phone + reduced-motion) into `tmp/studio-assembly-landing-page*`.
- **Before/after comparisons:** precommit proof suites (`*-precommit*.spec.ts`) write comparison sheets per surface into their `tmp/*-precommit*` folders.
- **Icon sheet, token sheet, material/lighting sheet:** documented in `docs/penthouse/CREATIVE_DIRECTIONS.md` (direction, palette, materials) and implemented in the design-system tokens (`app/globals.css` token layer, proprietary icon family under `components/icons/`).
- **Audit & setup:** `docs/penthouse/AUDIT.md`, `docs/penthouse/OPERATOR_SETUP.md`.
- **Performance/SEO measurements:** `tmp/perf/perf-seo-audit.json` (see FINAL_REPORT.md §56–57).
- **Final report:** `docs/penthouse/FINAL_REPORT.md` (72-point).

## 4. Validation summary (2026-07-28)

| Check | Result |
| --- | --- |
| TypeScript (`npx tsc --noEmit`) | clean |
| Prisma (`npx prisma validate`) | valid |
| Unit/Fusion tests (`npm test`) | 769/769 pass |
| Lint | at baseline (all errors pre-existing / outside project code) |
| Production build (`npm run build`) | success |
| Route smoke | all Studio + public routes 200 |
| E2E (full matrix, ~52 spec files) | green (desktop/tablet/phone, keyboard, reduced motion) |
| axe | zero serious/critical violations on audited routes |

## 5. Known limitations & missing official assets

See FINAL_REPORT.md §64–65. Highlights: dev-mode metrics only (no production Lighthouse run possible without deploy, which is prohibited); provider integrations (Stripe live, email provider, Clerk) run in honest mock/placeholder states; official brand photography/logo files not supplied — placeholder identity assets in use.
