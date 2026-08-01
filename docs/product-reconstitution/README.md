TapConnect V1 was a functioning product core.

This reconstitution audit exists to restore and protect that core while preserving and reconnecting valuable later capabilities.

# Product Reconstitution Audit

Audit source: `d67d1399a064834d476a0675642c294cf13478e3`
Audit branch: `tapconnect-product-reconstitution-audit`
V1 candidate: `7357fd9806d56d07d9ded68eef2beec5ea578052` (`main` / `origin/main` / `pre-tapflow-tapsave-2026-07-21` in the audited Git object database)

This is a documentation-only audit. It made no implementation, test, schema, migration, production-data, publication, send, payment, customer-contact, merge, deployment, reset, or force-push change.

## Documents

- [TapConnect Product Constitution](TAPCONNECT_PRODUCT_CONSTITUTION.md) — canonical concepts, ownership boundaries, product laws, and the property-resolution contract.
- [Canonical Glossary](CANONICAL_GLOSSARY.md) — visible/internal vocabulary, duplicates, canonical names, dispositions, and affected paths.
- [Current Product Map](CURRENT_PRODUCT_MAP.md) — routes, components, APIs, services, models, tests, authority candidates, conflicts, and dormant implementations by capability.
- [Source-of-Truth Map](SOURCE_OF_TRUTH_MAP.md) — current property flows, precedence systems, draft/Preview/public paths, confirmed conflicts, and the recommended canonical contract.
- [Workflow Traces](WORKFLOW_TRACES.md) — static/current evidence for Card appearance/buttons/Brand, Campaign, Tap Trace, Email, Ask, Control Room, Demo, and internal marketing loops.
- [Reconstitution Matrix](RECONSTITUTION_MATRIX.md) — component-level KEEP/REWIRE/MERGE/RETIRE/REPLACE/UNKNOWN decisions, dependencies, risks, and implementation waves.
- [V1 Baseline and Regression Report](V1_BASELINE_AND_REGRESSION_REPORT.md) — exact V1 candidate/range, commit/code/database/Owner-flow proof, V1-current comparisons, regressions, and restoration boundary.
- [TapConnect Rescue Plan](TAPCONNECT_RESCUE_PLAN.md) — dependency-aware Waves 0–8 and the recommended first vertical slice.
- [V2 Extension Map](V2_EXTENSION_MAP.md) — every meaningful post-V1 system mapped to its V1 parent, allowed authority, present classification, disposition, and rescue wave.
- [V1 Runtime Certification](v1-runtime-certification/README.md) — isolated historical and current runtime proof, journey records, evidence index, and decision gate.

## Executive findings

1. The strongest coherent V1 reference is exact commit `7357fd9806d56d07d9ded68eef2beec5ea578052`; the smallest construction range is Phase 1 `f5ea2b0ab7f9cec398c4adff10039dc50824715f` through that tip.
2. That tree contains Card direct save/public behavior, Campaign create/edit/status, day/time and Group scheduled Campaigns, TapEvent/ClickEvent-backed Analytics (the Tap Trace function), and Campaign-scoped Email draft/Preview/send.
3. The highest-risk current regression is Card lifecycle authority: Save writes `BrandKit.tapCardDraft`, Preview reads the draft, public reads `BrandKit.tapCard`, and ordinary Studio exposes no canonical publish transition.
4. The highest-risk state conflict is Brand/property authority: session “inheritance,” visual property stacks, flattened object JSON, Business defaults, Knowledge/prefill, and AI proposals do not persist one complete value/source/link/lock/save contract.
5. The most misleading current control is Ask TapConnect Apply: global use has no mutation callback; Card use has an empty callback; the drawer can still state that a reversible draft was applied.
6. The highest-value later systems to preserve are governed Card drafts, shared renderers, durable Assets, Knowledge/approval provenance, Audience/consent, TapSave, rich authoring, Autopilot governance, Control Room safety, and immutable Demo publication/binding.
7. The first implementation slice should prove the entire Card→Campaign→schedule→Tap Trace→Email→Control Room→Demo publish/bind/rollback loop in one isolated Demo Workspace before AI or Landing Page V2 work.
8. The V2 Extension Law prohibits standalone islands and parallel Card, Campaign, Email, schedule, media, publication, draft, AI-truth, Business-identity, or customer-relationship authorities.

## Runtime addendum

The exact V1 candidate was subsequently executed in a clean detached worktree against isolated PostgreSQL. Card, Campaign, device/Group scheduling, Tap Trace, Email, and their integrated flow passed through real routes, APIs, resolver calls, and database rows. The current tree was separately migrated and exercised against its own isolated database. The current full suite passed **909/909**, including all nine previously canceled Email & Replies Prisma durability subtests, with zero failed, canceled, or skipped tests.

The decision remains conditional because the required in-app browser had no available browser instance, preventing screenshots and short recordings. See the certification index for the precise evidence boundary; static-only statements elsewhere in the original audit are superseded by that addendum where they conflict.

## Review order

1. Approve or amend the Constitution and Glossary.
2. Approve the V1 candidate for isolated runtime certification.
3. Review confirmed authority conflicts and workflow classifications.
4. Approve component dispositions and migration assumptions.
5. Approve Rescue Plan waves and the first vertical slice.
6. Only then authorize a separate implementation branch/pass.

V1 RUNTIME BASELINE CONDITIONALLY CERTIFIED — HUMAN DECISION REQUIRED
