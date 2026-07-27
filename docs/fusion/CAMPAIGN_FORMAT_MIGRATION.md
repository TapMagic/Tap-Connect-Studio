# Campaign Format Migration

**Date:** 2026-07-26  
**Branch:** `tapconnect-v1-v2-fusion`  
**Starting HEAD:** `b2ca2f09a1e428d96851feb49cddf97aee82a487`  
**Maturity:** **IMPLEMENTED BUT NOT OWNER-READY**

## Purpose

Prove Shared Visual Authoring Core + Adaptive Workspace Shell travel beyond Brand Kit and Card by adopting them in Campaign Workbench — without a new builder, property model, media library, history system, or shell.

## Inheritance classification (honest)

**Mixed**

| Property | Class |
|----------|--------|
| Theme colors / fontStyle | Snapshot into `themeOverrides` at create/save |
| Missing theme keys on public `/t` | Runtime Brand Kit fallback |
| Contact / logo chrome | Runtime Brand/Business |
| Durable linked Brand sync | **Not in this wave** |

Editing preview uses the shared resolver. Saved drafts and published output remain snapshot-flattened into existing `themeOverrides` / `contentBlocks` JSON.

## Shared contracts reused

- `lib/fusion/authoring/campaign-visual-resolve.ts` — Campaign adapter
- `workspace-tools` → `CAMPAIGN_AUTHORING_TOOLS` (`campaign-authoring`)
- `AdaptiveWorkspaceShell` + Command Shade + Adaptive Task Drawer
- Session labeled history for visual edits
- Existing `CampaignPageRenderer` (authoring + public)

## Explicit non-goals

Wallet · email builder · social/TapCast · durable Brand sync · custom font upload · full DAM · Canva parity · Owner-ready

## Docs / proofs

- Unit: `lib/fusion/authoring/__tests__/campaign-visual-resolve.test.ts`
- Headed: `e2e/campaign-format-migration.spec.ts`
