# Slice 3.0 — Start-Document Truth checkpoint

Rich approved increments 3.0–3.2 against proposal `3797f717f0d2637d898cf60789c36febd1425561`. V0 packaging is explicitly excluded. This checkpoint is engineering evidence, not Product Owner acceptance or release certification.

## Correction

`cloneExperienceDocument` committed canonical data as if it were an active editor projection, erasing the default page twice. Legacy conversion is now idempotent on canonical input; only a present legacy projection is committed. Cloning returns its already-canonical page document directly. Explicit empty projected edits still delete content; no normalization resurrects it. Existing identity/reference remapping remains authoritative.

`createBlankExperienceDocument` reuses native Blank Page defaults, creates a genuine empty Flow root, and creates independent page/document identities. The existing create endpoint accepts `startMode: blank | clone`; omitted mode with a sourceId retains cloning compatibility, otherwise defaults to Blank. The Library starts with Blank while retaining explicit source selection. No publication, credential, Access or QR operation is involved.

The prior pure Add probe succeeded, so the historical UI Add no-op was not attributed to the clone function without proof. The corrected native Blank and populated clone both have a legitimate root/parent authority and native insertion now succeeds. No new insertion engine or speculative Add patch was introduced.

## Native evidence

Chrome, existing verified local server on port 3050, isolated `127.0.0.1:5433/tapconnect_fusion_dev`. No database seeding. [Trace and screenshots](proofs/slice3-native-2026-10-23/30-native-trace.json).

1. Library → New Experience → Blank (default), named Slice 3 · Native Surface Studio.
2. Add → Text → Heading; edit text through Inspector, commit, Save.
3. Add → Containers → Brand Color. Undo removes it; Redo restores it.
4. Save/reload/Preview retains the native Text and Container.
5. Library → Clone on that populated document. New clone opens with both objects.
6. Edit cloned text; save/reload/Preview retains the independent change. Original stays at revision 4 with its original text.

Blank fixture: `cmvlvb1b502e7to9k6hzzalc4` (checkpoint revision 4). Clone: `cmvlvcf9402mwto9kyenm87rf` (revision 2). Both unpublished; source/new node and page identities are recorded in the [read-only snapshot](proofs/slice3-native-2026-10-23/30-created-document-snapshot.json). Slice 3.2 will refine the native Blank fixture; this unstyled checkpoint is not visual acceptance.

The initial port 3053 sign-in was blocked by Chrome. No restriction/authentication bypass was attempted. Reused the existing authorized local-development session after verifying its database destination. A Save click timed out after autosave had already disabled it; Saved state and persisted revision were verified. An initial Preview click during hydration had no effect; repeated only after inspecting state, then verified real Preview and captured it.

## Verification and limitations

- New failing clone tests reproduced loss before the repair; focused Page/Library tests now pass (18 in the working tree, including preserved unrelated Library tests).
- Clean intended-source export: **668 passed / 1 failed** across 669 Card/Studio tests. The sole failure is the known missing original Cabinet Noir asset fixture. No test weakened or skipped.
- Working checkout with authentic local originals: **671 passed / 0 failed**; the extra two tests belong to unrelated WIP and are not claimed as committed scope.
- Clean production webpack build: passed compilation, TypeScript and static generation. Explicit local database environment, no migrations. Node dependencies reused from the installed workspace; Google Font build access remains an existing network dependency.
- Fixed a missing required label in the earlier read-only planning probe so repository TypeScript passes. This does not change its recorded historical results.
- Accepted fixtures preserved from start-of-construction snapshots: Slice 1 revision 49 and Slice 2 revision 69 (newer PO edits than the earlier planning snapshot).

Files: `lib/fusion/card/experience-pages.ts`, its Page tests, creation-only hunks in `app/api/experiences/route.ts` and `components/fusion/card/experience-library.tsx`, and the diagnostic probe label. Unrelated classification/navigation WIP is excluded from the intended source export and commit.

Continue within approved 3.1/3.2. Exact reference-image comparison, physical touch/OS keyboard/IME, assistive technology, cross-browser and full release remain open. Production hash verification remains BLOCKED. No V0 packaging, main merge, staging or production deployment.
