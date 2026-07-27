# Shared Visual Authoring Core V0 + Brand Kit Focused Workspace

**Date:** 2026-07-26  
**Branch:** `tapconnect-v1-v2-fusion`  
**Starting HEAD:** `f2402d18c5685dbed9a6eedd6e6b044a499ef67d`  
**Maturity:** **IMPLEMENTED BUT NOT OWNER-READY**

## Purpose

Introduce one reusable Shared Visual Authoring Core and prove it through:

1. a premium focused Brand Kit workspace (`/dashboard/brand/edit`)
2. Card preview consuming the same property resolver (`SharedCardPreview` + `TapConnectCard` ActionPill)

## Explicitly not included

- Live website discovery / web search / AI models
- Durable Brand sync across saved objects
- Full rights governance / video DAM / crop canvas
- Complete application preview matrix / Canva parity
- Full Campaign visual-tool migration
- Owner-ready or Owner-accepted designation

## Entry

- Assets → Open Brand Kit → focused workspace
- Classic Brand Kit form remains at `/dashboard/brand` as compatibility fallback

## Shared contract

See `lib/fusion/authoring/` — property stacks resolve Brand → Surface → Preset → Item with provenance.
