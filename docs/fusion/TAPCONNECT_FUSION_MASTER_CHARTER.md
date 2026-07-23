# TAPCONNECT STUDIO — COMPLETE V1-BASED FUSION MASTER CHARTER

**Status:** Authoritative build charter (floor plan, not ceiling)  
**Workspace:** `/Users/rcs/Development/tap-connect-studio-fusion`  
**Branch:** `tapconnect-v1-v2-fusion`  
**Execution:** Local only — no push, merge, deploy, or production changes  
**Captured:** 2026-07-23

This document is the consolidated product floor plan: every V1 capability, Cody spine import rules, all pillars, Admin control plane, integrations, file formats, freeform design, AI replacement, and activation-through-Admin model.

---

## 0. EXECUTIVE MANDATE

Build the complete premium TapConnect platform by fusing:

1. Every functioning V1 capability and behavior
2. The strongest useful parts of Cody’s V2 architectural spine
3. All approved new pillars, products, workflows, integrations, data flows, automation, AI, Admin controls, analytics, and future-platform capabilities
4. A major UX redesign that improves configuration without decreasing capability
5. A complete feature-control plane so built capabilities may be enabled, disabled, staged, beta-tested, plan-gated, provider-gated, or paused through Admin

**Governing equation:**

COMPLETE V1 FUNCTIONALITY + CLEANER PREMIUM UX + STRONG V2 ARCHITECTURE + ALL NEW PILLARS + COMPLETE ADMIN CONTROL PLANE + EXTENSIBILITY = TAPCONNECT STUDIO

**Absolute product-owner rule:** Everything in V1 stays functionally available. V2 may rearrange, modernize, streamline, automate, re-label, group, progressively disclose, or reimplement — but must not reduce capability. Expected: `V2 capability ≥ V1 capability`.

**V1 AI exception:** REPLACE CLEANLY. Preserve useful entry points and intent; do not preserve V1 AI architecture or output quality as the V2 standard.

**Build everything; activate through Admin.** Construction may be modular. Activation of a ready feature is an Admin action. A toggle may not falsely represent unfinished, unsafe, unconfigured, uncertified, or dependency-blocked features as ready.

Feature availability scopes include: globally disabled, internal only, alpha, private/public beta, plan/workspace/business/location/role/user/provider/region/device/security-gated, temporarily paused, generally available.

---

## 1. REFERENCE WORKTREES AND PROTECTED SOURCES

| Role | Path | Branch / commit | Access |
|------|------|-----------------|--------|
| Fusion (writable) | `/Users/rcs/Development/tap-connect-studio-fusion` | `tapconnect-v1-v2-fusion` | WRITE |
| Cody V2 spine | `/Users/rcs/Development/tap-connect-studio` | `tapflow-tapsave-architecture` @ `50f56049ff59c1cf9f928eff663c44383549f8da` | READ ONLY |
| Cursor UX Design Lab | `/Users/rcs/Development/tap-connect-studio-cursor` | `cursor-ux-design-lab` | READ ONLY |

**Protected:** `main`, Railway production, production DBs/credentials/device routing/Clerk users/customer data/public URLs, any other worktree. Never reveal secrets.

---

## 2. SOURCE-OF-TRUTH PRIORITY

1. Running V1 product and source — functional/customer-output truth  
2. Full Git history — archaeology of controls, blocks, deleted features  
3. Approved specs / parity matrices / UX plans / this charter — future architecture truth  
4. Cody V2 — candidate architecture/infrastructure  
5. Cursor Design Lab — candidate UX patterns only  

Conflicts: preserve V1 functionality → prefer stronger V2 underneath → improve UX → preserve pillar compatibility → log decisions in `PRODUCT_OWNER_DECISIONS.md`.

---

## 3–44. DIRECTIVE SECTIONS (BOUND)

This charter incorporates in full the pasted Master Build Directive sections:

- **3** Initial safety & discovery (this docs set + continue to first milestone)
- **4** Exhaustive V1 capability preservation
- **5** Verified V1 Tap Card Builder — preserve and expand
- **6** Premium creative UX benchmarks (Pages/Keynote/Canva/Figma/etc.)
- **7** Apple Pages-style Format system
- **8** Universal attribute contracts (Text, Color, Media, Layout, Divider, Spacer, Action, Form)
- **9** V1 block system — preserve, redesign access, expand families + Block Library
- **10** Structured + Advanced Freeform design + visual-reference-to-layout
- **11** V1 media/logo/icon/saved libraries (Pexels, Unsplash, Logo.dev, R2, etc.)
- **12** Brand Kit under Assets
- **13** Campaigns, Groups, calendar, resolution, fallbacks, time-travel, orchestration
- **14** Scan Mode (desktop/phone/remote/local)
- **15** Devices, Tap Points, Sets, Rotations, provisioning vocabulary
- **16** Cody spine selective import (tenancy, immutable publication, DeviceUnit/TapPoint, outbox, audit, etc.)
- **17** Final Studio IA: Home, Experiences, Tap Points, Audience, Insights, Assets, Settings
- **18** TapSave, MyTap, retention, Wallet, Moments
- **19** TapFlow, TapTrail, whiteboard-to-execution
- **20** Contacts, relationships, consent
- **21** Email marketing
- **22** Messaging, ManyChat, Channel Guardian, comment funnels
- **23** TapInbox, TapCase, TapGuide
- **24** TapCast and social
- **25** TapLoop, purchase proof, TapCommerce
- **26** Autopilot and Automation Team (replace V1 AI)
- **27** TapProof, TapTrust, TapSense, TapGraph, TapReach
- **28** Pulse
- **29** Insights and multi-view intelligence
- **30** Provider-neutral integrations + productivity connectors
- **31** Admin control plane (Workspace Admin + TapMagic Platform Admin)
- **32** Feature registry and dependency-aware toggles
- **33** Platform Admin dashboard + Stripe-ready billing
- **34** File and data format platform (widest safe formats)
- **35** Templates, reusable content, packs, marketplace readiness
- **36** Data binding
- **37** Collaboration, security, accessibility, localization
- **38** Landing page last
- **39** Implementation modules A–L
- **40** First integrated milestone
- **41** Environment / tokens / provider requirements
- **42** Requirements traceability
- **43** Acceptance standard — NO DECREASE, EXPECTED INCREASE
- **44** Execution map then continue without waiting for another architecture prompt

**Operating rule:** Define the complete product envelope now. Implement in controlled modules. “Future” means fully defined but not yet production-activated — never vague, forgotten, or bolted on later.

**Admin activation rule:** Build capability → validate readiness → control availability through Admin → enable without redesign. An on-switch cannot bypass missing credentials, failed validation, security requirements, or uncertified providers.

---

## MACHINE / VOCABULARY NOTE (PO DEFAULT)

Prefer product vocabulary over internal jargon in host UI:

| Prefer | Avoid as primary host label |
|--------|-----------------------------|
| Tap Point | Opaque URL / NFC endpoint |
| Device / Tap Device | DeviceUnit (keep in schema) |
| Card | Digital business card synonym spam |
| Experience | Mini page / campaign page (map carefully; Campaign remains initiative) |
| Automation Team / Workers | Generic “AI” as product name |
| Scan Mode | NFC writer jargon |

Do not market NFC/QR as the secret sauce on customer-facing sales surfaces where the charter already directed restraint; physical tap remains the product motion.

---

## ACCEPTANCE

Not complete because a button, label, schema, mock, provider name, toggle, or happy path exists. Completion requires real function, V1 parity or better, preview/persist/render/recover, permissions, feature/Admin control, tests, traceability, and local PO inspection.

**NO DECREASE. EXPECTED INCREASE. Build the beast.**
