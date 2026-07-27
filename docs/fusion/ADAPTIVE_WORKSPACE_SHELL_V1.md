# Adaptive Workspace Shell V1

**Date:** 2026-07-26  
**Branch:** `tapconnect-v1-v2-fusion`  
**Starting HEAD:** `2046d53a2261d0eb6d4318972985ba425a1a94f4`  
**Maturity:** **IMPLEMENTED BUT NOT OWNER-READY**

## Purpose

One reusable workspace-shell system for complex TapConnect workspaces:

**Adaptive Command Shade** (above) → **Adaptive Task Drawer** (beside) → **Live Work Surface** (always visible)

Brand Kit is the primary proving ground. Card authoring is a second consumer of the shared Command Shade contract without redesigning the Card editor.

## Anatomy

| Layer | Role |
|-------|------|
| Command Shade | Workspace identity, saved/dirty, primary green action, Return, Open in new tab, pin/auto/focus, warnings |
| Task Drawer | One tool/topic at a time; sized by task (compact / balanced / library / expanded / custom) |
| Live Work Surface | Real-time preview hero; stays mounted across drawer switches |

## Shared contract

- `lib/fusion/authoring/workspace-shell.ts` — modes, shade resolution, Esc priority, drawer sizing
- `lib/fusion/authoring/workspace-shell-persist.ts` — session restore (honest: not durable save)
- `lib/fusion/authoring/workspace-tools.ts` — tool registry (Brand + Card)
- `components/fusion/authoring/command-shade.tsx`
- `components/fusion/authoring/adaptive-task-drawer.tsx`
- `components/fusion/authoring/adaptive-workspace-shell.tsx`
- Extends (does not replace) `AuthoringWorkspaceShell`

## Esc priority

1. Close modal  
2. Downgrade expanded drawer  
3. Exit Focus mode  
4. Close ordinary drawer  
5. Exit workspace (DashboardChrome)

## Explicit non-goals (this wave)

- Campaign Format migration  
- Wallet / email / social migration  
- Live Brand discovery / durable Brand sync  
- Multi-user collaboration  
- Full Canva parity  
- Owner-ready / Owner-accepted claim  

## Consumers

| Workspace | Adoption |
|-----------|----------|
| Brand Kit `/dashboard/brand/edit` | Full AdaptiveWorkspaceShell |
| Card `/dashboard/card/edit` | Command Shade chrome + existing builder panes |
| Campaign `/dashboard/campaigns/[id]` | Full AdaptiveWorkspaceShell + shared visual adapter (Format Migration) |

## Honest maturity

This wave is **implemented but not Owner-ready**. It does not yet migrate Campaign Format, provide a universal tool catalog for every medium, durable cross-device drafts, or complete semantic-zone color rollout.
