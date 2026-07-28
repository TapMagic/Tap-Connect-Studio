---
name: E2E proof suite patterns for this repo
description: How to run the Playwright proof suites reliably and the recurring failure patterns (hydration clicks, details disclosures, seed ids)
---
- Run chunked: `PROOF_HEADED=1 BASE_URL=http://127.0.0.1:5000 npx playwright test <specs>` in ≤5-min foreground chunks; some specs need `DATABASE_URL` (isolated dev DB), `SEED_BUSINESS_ID`, `SEED_DEVICE_SLOT_ID`. Seed ids live in `tmp/fusion-seed-ids.json` (read by `e2e/proof-helpers.ts`; extend both together when a spec needs a new seed id).
- **Pre-hydration clicks silently no-op** in Next dev. After `page.goto`/reload, wrap click+assert together inside `expect(async () => { await el.click(); expect(...).toBe(...) }).toPass()` — retrying only the assertion is not enough.
- `<details open>` has `open=""` (falsy string). Check `getAttribute("open") === null`, never truthiness.
- Redesign demoted several tools behind collapsed `<details>` disclosures (assets keywords, email technical tools, operations-row technical detail) — specs must expand the summary first.
- Never hardcode seed record ids in specs or API routes; resolve from DB/seed file. Stale hardcoded ids caused inbox closeout + TapLoop award failures.
- Storing `localStorage` reads in `useState` initializers causes hydration flashes — read in `useEffect`.

**Why:** these five patterns caused nearly every e2e failure during the Penthouse validation wave; fixes that ignore them just flake again.
**How to apply:** when a proof spec fails after a reload/goto or on a collapsed panel, suspect these first before blaming app code.
