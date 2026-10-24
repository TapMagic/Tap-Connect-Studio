# Slice 3 planning evidence

Accepted source inspected: `a7e3dc1e1f722038d737a8239b0ff31662fc6d79`, branch `codex/studio-reconstitution-slice-1`. This directory contains investigation evidence, not a Slice 3 implementation or acceptance result. Unrelated local WIP was present and preserved; the diagnostic authority files themselves match accepted source.

## Reproduce read-only checks

From the repository root, with existing dependencies installed:

```sh
node --import tsx docs/product-reconstitution/creative-studio-platform/proofs/slice3-readiness-2026-10-23/authority-probes.ts
node --import tsx --test lib/fusion/card/__tests__/experience-pages.test.ts lib/fusion/creative-studio/__tests__/material-page-background.test.ts lib/fusion/creative-studio/__tests__/material-surface-parity.test.ts
node --import tsx --test lib/fusion/creative-studio/__tests__/cabinet-noir-registry.test.ts
```

The last command requires the authentic local Cabinet Noir handoff originals at the existing provenance-relative path. It is not currently reproducible from tracked source alone. See the readiness proposal's V0 dependency plan. The probe also reads those originals to verify availability and checksums; it writes no application or database state.

- `authority-probes.json`: demonstrated clone/default-page and Material transition/property-isolation failures; the pure insert-after-clone path succeeds. This does not establish why the previous native Add attempt failed.
- `existing-authority-tests.txt`: 19 passing tests across the three listed existing suites. These do not cover the newly demonstrated failures.
- `cabinet-noir-with-local-originals.txt`: eight passing tests with the existing authentic originals; clean-source 517-pass/1-fail evidence remains unresolved.
- `accepted-fixture-snapshot.json`: local unpublished fixture revisions and draft hashes read without mutation.
- `issue-1-status.json`: independently fetched OPEN issue status.
- `unrelated-wip-preservation.json`: fingerprints confirming 36 unrelated files unchanged during planning.

## UI observations

`01` root, `02` Container Appearance and `03` 390px screenshots record the existing tab before reload. The tab had stale local recovery state. They support navigation/control-organization observations, not an assertion that their composition is the latest saved PO draft. `04` follows reload of the latest accepted fixture (saved revision 66) and shows the recovery conflict clearly. Neither Restore nor Discard was invoked. Only selection, navigation and viewport inspection were performed.

`current-ui-observations.json` records desktop navigation and rendered-control measurements. No full construction timing, percentage improvement, physical touch, native IME, OS keyboard, assistive technology or Safari/WebKit certification was performed. No new production build was required or claimed for this documentation-only pass; accepted build evidence remains linked from the acceptance record.

The exact PO reference illustration was unavailable in the inspected attachment/document set. These are current-application screenshots, not proposed artwork or exact-reference comparisons.
