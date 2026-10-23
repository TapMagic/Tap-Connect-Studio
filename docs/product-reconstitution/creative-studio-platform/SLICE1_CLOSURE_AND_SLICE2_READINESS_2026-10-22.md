# Slice 1 closure and Slice 2 readiness — 2026-10-22

Status: **Slice 1 remains NOT ACCEPTED. Select and Resize with Confidence is approved for local implementation only. Production functional regression is accepted by Rich; hash verification remains BLOCKED. Slice 2 retains its approved Text Editing Truth scope but remains gated and is excluded from the current implementation. No production changes or deployment authorized.**

This report preserves historical evidence below. Current scope and execution guidance are in [the revised implementation prompt](STUDIO_UX_IMPLEMENTATION_PROMPT_2026-10-22.md). GitHub synchronization does not close any acceptance gate. Historical source counts, server availability and test results are dated observations, not current certification. The later corrective run reported 35 passed and 2 failed (nested geometry unit round-trip and a source-based handle assertion); those results were not rerun during documentation synchronization.

## Current Product Owner disposition — supersedes earlier retrieval instructions

Rich accepted the production functional regression checks as reported and directed that their observed state become the verified baseline. Browser/authentication troubleshooting is stopped. The bounded search for an existing server-side or administrative hash method is complete; no new verification subsystem or production change is warranted.

Verified baseline: document `[production-document-id omitted]`, Draft **1896**, Published **21**, publication **PUBLISHED/active**, Access **ON**, current QR `[credential-id omitted]` **PERMANENT/ACTIVE**, stable destination `/everencore/love-and-theft`. Home rendering, Music/Live/Vault navigation, locked Founder Tier notice, dismissal/focus restoration and unchanged lifecycle indicators after inspection passed. This records the observed functional baseline, not a historical content-hash comparison. Local-only machine-readable evidence (not included in this documentation commit): `proofs/phase1-slice1-layered-precision/production-functional-baseline.json`.

### Existing administrative/server-side method assessment

- `lib/fusion/publication/snapshots.ts:getPublicationSnapshot` uses a scoped Prisma `findFirst` and returns `contentHash` and manifest. This is an existing read-only code method, but invoking it requires a confirmed production database/session context not established in this task.
- `CardCreativeDocument` stores draft JSON and revision, with no stored draft hash. A draft hash would need to be calculated from a read-only payload with an explicit serialization policy. Publication hashes use the existing canonical manifest algorithm (sorted keys, label excluded, truncated SHA-256), not an interchangeable raw-JSON SHA-256.
- The Experience publication GET intentionally projects revision metadata without `contentHash` or manifest. The older `/api/publication` GET exposes hashes but validates only `card` and `campaign`; passing this Experience as a Card is invalid and would test the wrong authority.
- The production runbook documents Railway operations, not a ready read-only hash command. Neither `railway` nor `psql` was found on PATH; no Railway/database query connector was available. Focused script and administrative-source searches found no existing Experience hash-export operation.
- Conclusion: no straightforward, already available production read mechanism was found. **Draft hash: BLOCKED. Published hash verification: BLOCKED.** No credentials were extracted, tooling installed, production connection constructed, browser restriction bypassed, endpoint added, or production change made. Stop retrieval here as directed.

The accepted functional baseline satisfies the functional production regression portion of this assignment. Hash evidence remains an explicit limitation; it is neither silently waived nor a reason to keep troubleshooting. Final hands-on Slice 1 acceptance remains outstanding; the conditional Slice 2 scope approval does not authorize its execution during the current corrective candidate.


## Conditional Slice 2 approval — binding execution gate

Rich explicitly approved **Text Editing Truth** and foundations **B1 shared Text transaction semantics** and **B2 rendered Text bounds reconciliation**. The approved scope and B1/B2 foundations are preserved. The current local authorization is only Select and Resize with Confidence; Text Editing Truth remains excluded until its applicable execution gates are satisfied. Hands-on acceptance is currently **PENDING**. Favorable initial visual review, automated tests, and accepted production functional regression do not satisfy it. Until acceptance is recorded, Text Editing Truth remains in preparation only. This does not prevent the separately approved local Slice 1 corrective candidate.

### Prepared implementation sequence and acceptance mapping

| Requirement | Implementation commitment after the gate opens | Required evidence |
| --- | --- | --- |
| One Text authority | Canvas and Inspector adapt to the same canonical source, transaction lifecycle, validation and renderer. Future AI/typography consumers must use that path. | Equivalent edits from both current surfaces produce the same canonical value, history and Preview result; no consumer-specific normalization or rendering semantics. |
| Exact underlying content | Preserve source characters, Unicode, spaces, tabs and line breaks across entry, editing, save/reload and cancellation. Case remains a presentation property. Define browser clipboard/DOM newline conversion explicitly; never trim/collapse text or apply Unicode/case normalization silently. | Mixed case, repeated whitespace, empty content, trailing newline, Unicode/emoji and paste fixtures; every case mode preserves source. Content-changing operations require explicit user intent. |
| Transaction extensibility | Reuse `useLabeledUndoRedo` begin/preview/commit/cancel and canonical patches in `tap-card-builder.tsx`. Address the semantic target by stable document/Page/node identity; keep focus, caret and composition state transient. The same lifecycle can group future supported text-property patches or an explicitly accepted replacement without a new undo system. | Commit produces one labeled history entry; cancel/no-op produces none; cancellation cannot be recommitted by blur; stale/deleted target and Page changes restore coherent context. No AI service, fit algorithm, responsive schema or typography feature is added. |
| Predictable Text height | Reconcile actual Text measurements through the existing layout/frame authority. Preserve authored normalized geometry and height policy separately from rendered extent. | Auto grows/shrinks, Minimum honors its floor, Fixed honors explicit overflow in Flow/root Layered/nested Layered. Reflow/font readiness/measurement does not silently change authored x/y/w/h or serialize measurement noise. |
| Real 390px editing UX | Keep caret, editing target and controls reachable while the software keyboard is open; preserve focus and native selection/paste/composition behavior. | Inspect at 390px; exercise keyboard opening/closing, caret visibility after scrolling, focus return, selection, paste and IME composition. Emulation proves layout only; real mobile keyboard/IME evidence is required and any unavailable device evidence stays pending. |
| Canonical lifecycle and parity | Route Text source and presentation changes through existing commands, validation, history, persistence and renderer projections. | Undo/Redo, validation rejection without content loss, save/reload, Page switching, Preview/Edit return and shared runtime parity. Existing drafts remain unchanged on passive open. |
| Production/domain boundaries | Preserve recorded Love & Theft baseline and identity, publication, credential, Access and Campaign authorities. Test mutations only in an isolated fixture. | Baseline remains the accepted functional reference; hashes remain BLOCKED. No production writes/redemption/deploy or artist-specific generic logic; no new domain fields, tables or navigation. |
| Bounded foundations | Implement only Text lifecycle/frames necessary for this slice. Future memberships, fan relationships, collectibles, entitlements and commerce extend their canonical domains. | Review changed files and persisted-field diff for scope; stop and seek Product Owner approval for any necessary expansion. |

Execution order after explicit acceptance: (1) identify the exact source candidate and preserve the existing fixture; (2) unify transaction behavior and selected/caret entry/exit through existing commands; (3) expose presentation-only case control; (4) reconcile Text height/frame behavior; (5) prove the complete 390px and desktop journey, persistence and Preview parity; (6) report tests, visual evidence, changed files, limitations and discovered architectural risks. This is an implementation plan, not work already performed.

Dependencies already inspected: canonical Text role/height contracts and keyboard ownership; inline and Inspector adapters; `tap-card-builder.tsx` uses `useLabeledUndoRedo` for live transactions and normalized canonical configuration. The existing Text E2E includes Escape and phone editing but is not sufficient evidence for real software-keyboard or IME acceptance. Reuse and extend these authorities after the gate opens.

No demonstrated A-class architectural blocker has emerged. The B1/B2 foundations are approved. Cross-organization Person identity, membership lifecycle, collectible ownership/provenance and production commerce remain explicit deferred domain work, not capabilities claimed complete by this Text slice.

## 1. Historical checkout and closure evidence

- Branch: `codex/studio-reconstitution-slice-1`, 15 commits ahead of its local remote-tracking reference. No network refresh was performed.
- HEAD: `10719bcfb9a32da2a6c0dfc4ae4edb07bc0514f0` — Present locked access notices above Experience UI.
- Checkout is dirty: at inspection, 19 tracked files changed (240 insertions, 48 deletions, including four binary proofs), plus untracked planning documents, Slice 1 modules/test/proofs, three acceptance build directories, and pnpm files. HEAD alone is not the acceptance candidate.
- Existing modifications were not reset, staged, committed, or rewritten. Input file SHA-256 values are recorded in `proofs/phase1-slice1-layered-precision/closure-input-manifest.json`; build directories are excluded. This identifies reviewed source inputs, not database content or production state.

The working tree contains the Slice 1 implementation: shared `selection-geometry.ts`, `geometry-units.ts`, `frame-semantics.ts`, position capability updates, canonical inspector controls, shell multi-selection toolbar, and canvas diagnostics. These reuse existing composition operations, Group and parent authorities. No responsive schema is established by these changes.

Historical verification from the original closure review (not rerun for this synchronization):

| Check | Result |
| --- | --- |
| `layered-precision-selection-truth.test.ts` | 11 passed |
| `production-studio-authority.test.ts` | 5 passed |
| `studio-text-authoring.test.ts` | 3 passed |
| Production browser authentication | Subsequently confirmed signed in; see production follow-up below |
| Existing local acceptance server, port 3050 | No listening process found |
| New end-to-end/visual certification, TypeScript, lint, build | Not rerun; no product code changed by this review |
| Product Owner final interaction acceptance | Outstanding, per current direction |

Earlier technical-green and favorable initial visual-review statements are Product Owner-provided history, not newly reproduced certification. Static source tests cannot establish hands-on interaction quality.

### Dedicated acceptance fixture preservation

Existing fixture source `e2e/studio-layered-precision-selection-truth.spec.ts` and its two proof images remain intact. Fixture composition ID: `phase1-slice1-layered-precision`; named root and nested nodes use `precision-*` identities. The test is gated by `STUDIO_LAYERED_PRECISION_ACCEPTANCE=1`; its `finally` restores the previous draft unless `STUDIO_LAYERED_PRECISION_LEAVE_FIXTURE=1`.

The test was **not rerun**, because it seeds and saves a draft. No fixture was replaced or cleaned up. A persisted dedicated Experience ID, revision and draft hash could not be independently recovered from the available proof files; the existing local server is unavailable. Do not represent preservation of source as verification of persisted database state. Before resuming UAT, restart the same isolated acceptance environment, locate the existing fixture without reseeding, record its document ID/revision/hash, and open its canonical Experience editor URL. Keep its draft and database volume available throughout Rich's review. If the fixture is absent, report that before proposing recreation.

### Remaining Slice 1 gates

1. Rich completes the real fixture interactions: root/nested selection, align/distribute/match/tidy, node/Group rotation, exact px/% edits, frame diagnostics, Undo/Redo, save/reload, Preview/Edit return and phone controls. Physical Live Device verification remains human evidence where applicable.
2. **Functional production regression accepted by Rich:** verified baseline recorded above. Hash comparison is **BLOCKED**, retained as an explicit limitation.
3. Pin the actual accepted working-tree/source identity; the current dirty checkout contains changes beyond Slice 1.

Do not declare formal closure while hands-on acceptance is outstanding. Functional production checks are accepted; hash verification remains BLOCKED and must stay visible in any closure decision. Any product correction requires affected checks again.

## 2. Love & Theft production regression

**Result: PARTIALLY VERIFIED — authenticated UI evidence captured; hash comparison remains blocked.** Rich signed in during follow-up. Chrome showed the authenticated admin session and Experience Library. Direct navigation to the inspected inventory GET `/api/experiences` failed with Chrome `ERR_BLOCKED_BY_CLIENT`. Safari was subsequently offered by Rich, but Computer Use returned “Computer Use was not approved to use Safari”; that session could not be inspected. No historic revision identifier is adopted as current.

| Required observation | Current result |
| --- | --- |
| Draft revision / hash | Current authenticated UI: **1896**; hash unavailable |
| Current published revision / hash | Current authenticated UI: **21**; hash unavailable |
| Publication state / current snapshot identity | **PUBLISHED**, publication active; immutable snapshot ID unavailable |
| Access state | **ON** |
| QR credential identity / type / status / expiry / usage | Current ID `[credential-id omitted]`; **PERMANENT / ACTIVE**; expiry and usage not exposed by inspected UI |
| Permanent public destination behavior | `/everencore/love-and-theft` rendered Love & Theft Home, content/actions and Home/Music/Live/Vault navigation; no QR redemption or action activation |
| Before/after regression comparison | Library revision/publication/access/current QR summary unchanged after inspection and reload; full hash and historical regression comparison remains incomplete |

No production saving, publishing, rollback, normalization, Access changes, QR rotation/replacement, deployment, or content editing was performed.

Historical inspected document ID: `[production-document-id omitted]`, named **Love & Theft Sales Demo** in The Monkey Cage workspace. The current credential ID was read from the displayed credential URL; its bearer proof is deliberately omitted. The View QR panel loads existing credential metadata; Show QR, Copy, Download, rotation and revocation controls were not used. The public destination was inspected before the Library: repository registration logic returns the existing destination without creation. Deployed code identity was not independently verified. These observations establish current UI state, not a cryptographic no-change proof or retrospective baseline.

Retrieval disposition: the earlier proposed export path was not available through a straightforward existing method. Per Rich’s latest direction, further retrieval attempts stop; hashes remain BLOCKED. Safari is not a prerequisite.

### Important read-only boundary

Repository `app/x/[credential]/route.ts` invokes `redeemExperienceCredential()` on GET. That implementation increments `redemptionCount`, writes `lastUsedAt`, and may persist `EXPIRED` status. Thus opening even a permanent QR URL is not strictly read-only. No QR URL was opened. This is a code finding, not proof of the deployed build.

Historical retrieval procedure — superseded by Rich’s stop instruction; do not execute further:

1. **Completed:** Rich signed in to production Chrome. Resolve the read mechanism limitation above for raw document/snapshot evidence; no credential sharing is needed.
2. Use inspected read-only detail/publication/credential reads for the actual Love & Theft document; avoid opening the editor if its load path can normalize or save. Existing repository GET detail and credential handlers use reads; confirm deployed behavior before relying on them. Discover the actual document identity, never substitute the seed's logical Experience ID.
3. Capture document ID, timestamp, deployed build identifier if available, current draft revision and raw payload SHA-256, current publication snapshot ID/version/manifest hash, publication and Access flags, public destination identity/slug, credential ID/type/state/expiry/limits/count/last-used time. Do not place bearer QR URLs or token material in proof documents.
4. Keep raw payload hashing and canonical publication-manifest hashing explicitly separate; use the same algorithm/serialization for each before/after comparison. Compare with the prior authenticated baseline if one exists. Without one, a current snapshot establishes a new baseline and cannot retrospectively prove no changes since earlier implementation.
5. Verify the permanent slug destination via a confirmed non-mutating path and inspect redirect/routing contracts for QR linkage without redeeming the credential. If actual QR traversal is required for acceptance, the current implementation conflicts with strict read-only verification: report the limitation and obtain a separate decision, rather than silently consuming it or changing production code.
6. Repeat the read-only captures after inspection and require unchanged revisions, hashes, flags, destination and credential state. Record expected dormant/locked behavior from actual Access state, not from assumptions that the Experience must be public.

Successful authentication does not solve the QR traversal conflict, supply missing hashes, or provide a historical baseline. Rich subsequently accepted the functional checks; the unverified hash portion remains BLOCKED.

## 3. Roadmap authority and exact Slice 2 objective

The current consolidation package, `STUDIO_CONSOLIDATION_PHASE1_IMPLEMENTATION_PLAN.md` sections 3 and 20.2, identifies **Text Editing Truth**. Its locked-decision confirmation treats D1–D14 as accepted constraints. The older `PHASE_1_SLICE_1_IMPLEMENTATION_PLAN.md` and similarly named historical E2E files describe earlier reconstitution work and do not determine this next slice. The constitution and interaction specification continue to govern. No newer conflicting consolidation plan was found in this checkout; these planning documents are currently untracked and their approval history is not independently established by Git. Rich has now conditionally approved the exact scope below; execution awaits explicit Slice 1 hands-on acceptance.

Objective: a Host can deliberately enter Text caret editing, type exact case and whitespace, commit or cancel predictably, continue editing immediately, and obtain the same saved Text and height behavior in Inspector, Canvas and runtime surfaces.

Included: unmistakable selected versus caret states; deliberate entry and stable exit; None/Uppercase/Lowercase/Capitalize as presentation only; Space, Enter, multiline, selection, paste, IME, blur, Escape, native undo/redo and Studio history; Auto/Minimum/Fixed Text frame truth in Flow and Layered contexts.

## 4. Existing engines and minimum vertical delivery

Reuse:

- `creative-composition-canvas.tsx`: `InlineEditableText`, phase-based preview/commit/cancel callbacks, keyboard ownership and existing renderer `textTransform`.
- `studio-composition-inspector.tsx`: transactional Text textarea, declared height modes and existing precision controls.
- `platform/keyboard-ownership.ts`: shared editable-descendant ownership and focused-wrapper activation guard.
- `platform/text-authoring.ts`: six Text roles, height/overflow contracts, Brand defaults and authoring declarations.
- Builder model's existing begin/preview/commit/cancel live adjustments and canonical patch/history path.
- `platform/layered-region.ts`, parent authority, selection geometry and frame semantics: existing layout and bounds authority.
- `experience-pages.ts`, canonical Draft persistence, immutable publication snapshots, public renderer and signed Live Device projections.

Smallest credible vertical: one existing Text Box in the preserved fixture → explicit caret entry → mixed-case multiline editing → shared live preview → one labeled commit or exact cancellation → Inspector reflects the same value → one Studio Undo/Redo → save/reload → Draft Preview parity. Repeat for Flow and nested Layered and all three height modes. Expand coverage to compatible existing inline Text consumers without advertising unsupported inputs or adding separate editing machinery. No font-browser or typography catalog expansion.

## 5. Architectural compatibility review

Classification is relative to this proposed Text slice. A deferred domain gap is not a claim that its future implementation is already complete.

| Envelope / actual evidence | Classification and guardrail |
| --- | --- |
| Text transactions exist in separate DOM and textarea handlers; inline reads `innerText`, Inspector reads textarea value | **B1**: shared transaction contract and whitespace policy over the existing command path; details below |
| Auto Text renderer can grow; diagnostic frame helper derives visual bounds from normalized placement plus estimated overflow | **B2**: derive measured Text bounds through existing layout/measurement authority; do not persist measurements or introduce geometry engine |
| Responsive authoring: current phone model and 512 runtime cap; roadmap reserves versioned responsive state for Slice 5 | **C**: Text semantic content/case source remains global; future responsive allowlist governs presentation, not parallel documents |
| Flow/true Layered, parent-relative transforms, stable node/Page identities | **C**: use current engines; preserve IDs and parent relationships during edit/history |
| Advanced typography/materials and reusable resources | **C**: current Text and material/resource authorities remain owners; no local font catalog or material projection |
| AI surfaces and shared assets | **C**: future accepted results enter existing asset/resource and canonical material authorities with provenance; no generation services now |
| Conditional/personalized states | **C**: future resolver projects canonical Experience data; no evaluated/personal data written into Text source |
| Publishing/migration and contextual/detachable tools | **C**: preserve unknown fields and immutable snapshots; editor task state stays transient and context-addressable, not DOM handles persisted in drafts |
| Audience Person and multiple artist/org relationships | **C, real later gap**: `Contact` is explicitly business-scoped; `CustomerRelationship` is unique by business/contact. This is not already global cross-organization Person identity. Future identity work must reconcile through Audience, not create a Studio/EverEncore Person table. Text slice does not touch it |
| External mappings, consent/preferences, memberships/tiers/enrollment/renewals | **C**: Audience contracts, `ConsentRecord`, relationships and loyalty enrollment are existing anchors; they do not establish a complete membership or external-identity model. Dedicated future domain design required; no fields in composition props |
| Collectible editions/numbered units, provenance/ownership, activation/claims, gifting/replacement/transfer/revocation, authenticity | **C**: Tap Point and independent Experience credential/destination identities provide boundaries, not a complete collectible ledger. Keep physical unit ownership distinct from replaceable credential and content IDs |
| Purchases/subscriptions, entitlements, member/event access, offers, preorders/fulfillment/pickup/redemption | **C**: existing Commerce wiring is explicitly mock/sandbox; platform plan entitlements and subscriptions are not proof of fan membership eligibility. Extend canonical Commerce/Access later with deterministic eligibility; no text-derived permission checks |
| Segmentation, targeted/scheduled/triggered campaigns, attribution/analytics | **C**: canonical Campaign/Audience/Insights and publication event/outbox boundaries remain owners; preserve analytics and action identities; no second targeting or event store |
| Hive/SET/Stripe/future integrations | **C**: integration maturity registry distinguishes works-now/setup/test/planned; provider-neutral contracts and external references remain future domain work, not proof providers are production-ready |
| Building membership tables, a global Person migration, collectible ledger, commerce adapters or campaign engine during Text work | **D**: speculative expansion; excluded |

**A: no demonstrated immediate architectural blocker to the proposed Text slice.** Slice 1 acceptance and production verification are release/approval gates, not evidence requiring a domain redesign.

### B1 — One Text edit transaction contract

- Risk: divergent direct/Inspector handlers can commit after cancel, lose whitespace, or mix native editing history with Studio history. Source shows separate inline `innerText` and textarea value handling and a cancel-then-blur sequence; this is a risk to verify, not a reproduced data-loss claim.
- Affected: `InlineEditableText`, Inspector Text control, builder live adjustments, keyboard ownership.
- Minimal change: one shared adapter for begin/snapshot/preview/commit/cancel and exact restoration, including a documented plain-text newline/whitespace policy. Keep transient caret/composition state outside Draft. Reuse canonical commands; do not add a second history engine.
- Why now/defer cost: Slice 2 edits both paths; independently completing them entrenches inconsistent transaction semantics before later typography work.
- Tests: exact spaces/tabs/newlines, CRLF/paste policy, cancel+blur commits nothing, repeated entry, target deletion/Page change, IME composition, native undo inside entry, one Studio history item after commit, accessible focus restoration.

### B2 — Text frames use existing measurement authority

- Risk: Auto/Minimum rendered height can exceed normalized placement; current `resolveStudioFrameSemantics` computes an expanded placement estimate, not a measured glyph/paint frame. A diagnostic can therefore overstate visual truth.
- Affected: existing Text render/measurement paths, `layered-region.ts`, `frame-semantics.ts`, canvas selection overlays and Inspector height controls.
- Minimal change: expose/consume existing measured Text extent in the shared frame projection when necessary; distinguish measured versus estimated diagnostics. Preserve authored normalized placement and height policy; no new stored pixels, target overrides or geometry engine.
- Why now/defer cost: Text editing changes line count and height immediately. Deferring reconciliation would make the core Slice 2 outcome untrustworthy and force repeated selection/runtime repairs.
- Tests: Auto growth/shrink, Minimum floor, Fixed visible/scroll/clip, width-driven wrapping, font readiness, root/nested Flow/Layered, rotated bounds and action hit areas where applicable; diagnostics never alter serialized Draft.

## 6. Expected files/modules

Likely runtime changes, only after approval: `components/fusion/creative-studio/creative-composition-canvas.tsx`; `components/fusion/card/reconstitution/studio-composition-inspector.tsx`; canonical shell/model and `components/card/tap-card-builder.tsx` only where callback wiring requires; `lib/fusion/creative-studio/platform/keyboard-ownership.ts`, `text-authoring.ts`, `frame-semantics.ts`, `layered-region.ts`; existing public/Preview projection only if shared renderer parity demands it. A small shared Text transaction helper is justified only if it replaces duplicated lifecycle semantics.

Tests: extend `studio-text-authoring.test.ts`, shared keyboard/transaction/frame suites, production editor authority and a focused Text Editing Truth E2E. No Prisma migration, new primary navigation or independent editor.

## 7. Tests, visible acceptance and responsive proof

- Keyboard-only and pointer entry clearly expose selected/caret states; focus belongs to the actual editor. Escape restores exact original content and exits cleanly. Blur commits once. IME remains intact.
- Source `MiXeD  Case` remains unchanged under every case transform; None restores its literal presentation. Line breaks/paste/selection/native undo work in both entry paths.
- One edit commit is one labeled Studio history entry; cancel is zero. Undo/Redo after commit is independent of native undo during editing.
- Save/reload, Page switch, preview return and target deletion leave coherent editing context with Save/Preview/Undo accessible. No hybrid workspace remains.
- Auto/Minimum/Fixed match visible behavior and selection frames; no silent clipping. Existing content/actions/analytics/access/credential/publication IDs stay unchanged.
- Browser matrix: 390×844, 430×932, current 512 cap; 768×1024, 1024×768 and 1280×800 verify workspace reachability and current capped runtime only. These are not new Tablet/Desktop authoring targets. Exercise phone software keyboard/selection and real IME with human evidence; automation alone cannot certify them.
- Capture font-ready Canvas, Draft Preview and signed Live Device where available from the same dedicated fixture, viewport, build and Draft identity. Public rendering parity uses an isolated fixture, never publishing Love & Theft.
- Run meaningful transaction/keyboard/frame contracts, focused E2E, editor-authority regression, TypeScript and ESLint. Run production build when renderer/model boundaries change. Follow constitution certification requirements before making certification claims.

## 8. Regression, rollback and deferrals

Snapshot the dedicated fixture before implementation; record exact source identity and restrict changes to the Text capability. Preserve existing drafts byte-for-byte on passive open and preserve unknown fields. Re-run Slice 1 selection/geometry/rotation tests and Curated/Compact Action Grid regressions when shared canvas paths change. Use actual current production baseline values, never a hardcoded revision 1.

Rollback uses the existing rollout mechanism or reversible control exposure in the canonical shell, retaining readable existing Text data and immutable publications. No legacy workspace routing, destructive normalization, database migration, production rollback or deploy is authorized. A failed parity or history check stops the candidate.

Deferred: full font browser/variants (Slice 3), advanced spacing and professional treatment reachability (Slice 4), responsive inheritance/schema and wide activation (Slice 5/separate release gate), cockpit redesign, detachable windows, dynamic personalization, AI surfaces, membership/collectibles/commerce/campaign integrations and all domain expansions above.

## 9. Historical Slice 2 prompt — superseded execution gate

The current [implementation prompt](STUDIO_UX_IMPLEMENTATION_PROMPT_2026-10-22.md) governs. The following retains the Text scope for reference; do not execute it under the current Slice 1-only approval.

```text
Implement ONLY Studio Consolidation Phase 1 Slice 2: Text Editing Truth.

Prerequisites: Rich has conditionally approved this scope and B1/B2. Confirm that Rich has explicitly recorded Slice 1 hands-on acceptance before changing application or test code; do not treat conditional approval as that acceptance. Production functional regression is already accepted against the recorded baseline (Draft 1896 / Published 21 / Access ON / active permanent QR); hash verification is BLOCKED and must not be relabeled PASSED or retried without new direction. If explicit Slice 1 hands-on acceptance is absent, remain in preparation only. Once recorded, check the latest execution authorization; the current corrective approval explicitly excludes Text Editing Truth.

Read AGENTS.md, PRODUCT_STEWARD_CONSTITUTION.md, STUDIO_RECONSTITUTION_INTERACTION_SPEC.md, STUDIO_CONSOLIDATION_PHASE1_IMPLEMENTATION_PLAN.md (Slice 2), and SLICE1_CLOSURE_AND_SLICE2_READINESS_2026-10-22.md. Read relevant installed Next.js guides before any Next.js code change. Confirm branch/HEAD/dirty state and preserve unrelated work and the existing dedicated acceptance fixture. Pin a reproducible source baseline.

Obey every requirement in the Conditional Slice 2 approval section of the readiness report, including its acceptance mapping. Preserve one canonical Text editing/rendering authority for current Canvas/Inspector and future typography or AI consumers. Make the transaction lifecycle compatible with future supported property patches and explicit text replacements through existing commands; do not implement those future capabilities. Maintain exact source content, keep case presentation-only, and prevent measured bounds from silently changing authored geometry. Treat real 390px keyboard, caret, focus, selection/paste, IME and control accessibility as required UX evidence.

Use CardStudioReconstitutionWorkspace as the sole editor. Reuse Text source/height contracts, shared keyboard ownership, builder live adjustments/history, existing parent/layout/geometry measurements, canonical persistence and renderer projections.

Deliver unmistakable selection versus caret states, deliberate entry, coherent commit/cancel/exit and focus restoration. Direct and Inspector editing share exact plain-text/whitespace and transaction semantics. Protect Space, Enter/multiline, selection, paste, IME, blur, Escape and native editing undo/redo. One committed edit makes one labeled Studio history entry; cancellation makes none. Present None/Uppercase/Lowercase/Capitalize via existing textTransform without rewriting source. Resolve Auto/Minimum/Fixed Text frame behavior through existing measurement authority in root/nested Flow and Layered; do not store measurement noise or introduce a geometry engine. Address only B1/B2 foundations demonstrated by implementation evidence.

Prove the complete journey in the preserved isolated fixture: select → caret edit → mixed case/multiline/paste → commit/cancel → Inspector/Canvas agreement → Studio Undo/Redo → save/reload → Preview/Edit return. Inspect real runtime visuals and phone interaction. Test 390/430/current 512 runtime behavior and wide workspace reachability without claiming responsive target state. Verify existing actions, identities, Access, analytics, Curated assemblies and publication state remain intact. Test shared contracts and focused E2E; run TypeScript/ESLint and a production build if model/renderer boundaries change. Report actual source identity, tests, runtime evidence, unresolved defects and human verification separately.

Do not build fonts/catalog expansion, spacing precision, responsive state, cockpit redesign, membership, commerce, collectibles, campaigns, integrations or speculative tables. Do not modify Love & Theft, redeem QR credentials, publish, deploy or normalize production content. Preserve unknown fields and rollback through canonical exposure without changing immutable publications. Stop after the slice and request Rich's hands-on acceptance; tests do not constitute acceptance.
```

Scope and B1/B2 foundations: CONDITIONALLY APPROVED by Rich. Execution remains gated; the current approval authorizes only Select and Resize with Confidence. Explicit Slice 1 hands-on acceptance is still required for Slice 2. Retain BLOCKED hash verification as a disclosed limitation. Do not extend scope without Product Owner approval.

## Chrome continuation — authenticated public interaction proof

Rich directed continued testing in Chrome. Direct navigation to the known document GET `/api/experiences/[production-document-id omitted]` also returned `ERR_BLOCKED_BY_CLIENT`. An unauthenticated header-only network diagnostic reached the server and returned HTTP 307 to sign-in with Clerk signed-out status; it does not provide authenticated payload evidence and does not explain Chrome's block. No cookies or session tokens were extracted or transferred.

Read-only public UI journey completed in Chrome:

- Home → Music changed the URL to `/everencore/love-and-theft/music` and displayed Music content.
- Music → Live changed the URL to `/everencore/love-and-theft/live` and displayed event details and the map activation surface. External links and the map were not activated.
- Live → Vault changed the URL to `/everencore/love-and-theft/vault` and displayed the locked Backstage Acoustic Session.
- Activating the locked item displayed “Locked Access Required” and “Requires Founder Tier access or higher.” Visual inspection confirmed the notice above the dimmed Experience. “Got It” dismissed it and focus returned to the locked trigger. This checks notice behavior, not membership eligibility implementation.
- Returning to the authenticated Library still showed Draft v1896, Published v21, Access ON and PERMANENT Active QR.

These checks passed at the existing browser viewport. They are not a responsive matrix or cryptographic regression pass. Draft/publication hashes, full credential usage state, a trustworthy historical baseline and Rich's Slice 1 fixture acceptance remain outstanding. No production content or lifecycle mutation was requested or performed; no QR redemption, publication, deployment or Slice 2 implementation occurred.
