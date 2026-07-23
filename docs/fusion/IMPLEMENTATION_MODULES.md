# Implementation Modules

Lock core contracts first, then ship modules without empty shells.

## Core contracts (lock first)

Tenancy · Card/Experience/publication · blocks · attributes · assets/media · Campaign/calendar/resolver · contacts/consent · events/analytics · integrations · permissions · feature registry · search · file formats

## Modules

| ID | Scope | Parallel-safe notes |
|----|-------|---------------------|
| **A** | V1 preservation, Builder, blocks, formats, media, Brand Kit | Owns builder UI + attribute contracts |
| **B** | Campaigns, Groups, schedules, fallbacks, devices, Scan Mode | Owns schedule/resolver; coordinate Tap Point schema with C |
| **C** | Contacts, TapSave, MyTap, Wallet, Moments | Owns audience models |
| **D** | Knowledge, Autopilot, Automation Team | Replaces V1 AI; do not regress entry points |
| **E** | Email, messaging, ManyChat, TapInbox, TapCase, TapGuide | Provider adapters + Guardian |
| **F** | TapFlow, TapTrail, whiteboard | Import Cody journey spine carefully |
| **G** | TapCast / social | Capability registry + partial failure |
| **H** | TapLoop, purchase proof, TapCommerce | Ledger + no raw card data |
| **I** | Insights, TapProof, multi-view | Evidence classes required |
| **J** | Admin, integrations, plans, permissions, operations | Feature registry owner |
| **K** | TapSense / TapGraph / TapReach / TapTrust readiness | Wired, Admin-hidden until ready |
| **L** | Landing / commercial packaging | **Last** — after product is real |

## First integrated milestone (Module A + B foundation)

Full V1 Card Builder/block parity · Pages-style Format · centered subject + independent panes · media/logo/icon libraries · Brand Kit · Structured + Freeform · visual-reference-to-layout · Campaign/Group schedule/fallback · permanent Tap Point + immutable publication foundation · Device/Scan foundation · contact capture · Feature/Admin registration · time-travel preview · analytics · tests/local review

## Parallel rules

Use parallel subagents/worktrees only with non-overlapping core files. One integration owner manages shared contracts.
