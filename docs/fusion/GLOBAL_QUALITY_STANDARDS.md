# Global Quality Standards — TapConnect Studio Fusion

**Status:** Authoritative platform-wide craftsmanship and quality contract  
**Scope:** All Studio, public, Admin, Pulse, API-backed, and automation surfaces on branch `tapconnect-v1-v2-fusion`  
**Relationship:** Complements `TAPCONNECT_FUSION_MASTER_CHARTER.md`, `PILLAR_CATALOG.md`, and readiness honesty rules. Does not replace the charter’s capability floor or activation-through-Admin model.  
**Rule:** Named products below are **quality and capability benchmarks**, not visual cloning instructions. Do not copy proprietary appearance, trademarks, marketing copy, icons, layouts, or protected assets.

---

## 0. Purpose

TapConnect Studio must feel like a premium operations and creative platform: complete in function, elegant in workflow, honest in readiness, and delightful in purposeful detail.

These standards establish platform-wide expectations for:

- premium appearance
- complete functionality
- workflow elegance
- responsiveness
- accessibility
- discoverability
- performance
- reliability
- extensibility
- thoughtful user delight

Every important surface is judged against the applicable benchmark category below **and** against TapConnect’s product purpose (physical tap → experience → relationship → operations). Where a benchmark capability is irrelevant to TapConnect’s purpose, apply the principle without forcing feature-for-feature parity.

---

## 1. Benchmark application rule

When implementing or hardening any surface, the team **must**:

1. Identify the closest benchmark category (or categories) in this document.
2. Document which interaction principles apply to the work.
3. Translate those principles into **TapConnect-native** behavior, vocabulary, and IA.
4. Trace acceptance criteria and proofs to the applicable quality benchmark.
5. Refuse cloning of proprietary UI chrome, brand marks, copy, or protected assets.

Familiarity must come from mature interaction patterns users already trust — not imitation of a competitor’s skin.

---

## 2. Cross-cutting quality expectations

These apply to every pillar and journey unless an explicit, documented exception exists.

### 2.1 Premium appearance

- Coherent Tap Connect visual language: dark Studio atmospheres, high-contrast type, neon lime accent used with restraint, brand-first chrome where branded.
- Composition over catalog clutter: primary work surfaces invite making and deciding, not registry tourism.
- No generic admin-dashboard look. No endless nested cards. No decorative complexity that does not serve meaning.
- Typography, spacing, alignment, and motion must feel intentional at every breakpoint.

### 2.2 Complete functionality

- A control that is visible must work, be honestly disabled with reason, or not be shown.
- Create / manage / complete / reopen / evidence / analytics / recovery are part of completeness — not optional extras.
- Feature flags and Admin toggles must not falsely represent unfinished, unsafe, unconfigured, or uncertified capability as ready.

### 2.3 Workflow elegance

- Each important workflow has one clear entry, one primary job per section, and an obvious path to outcome.
- Progressive disclosure: beginners succeed quickly; experts reach depth without leaving the product.
- Smart defaults reduce effort without removing control or inventing business facts.
- Host cognitive load stays low; platform complexity stays internal.

### 2.4 Responsiveness

- Desktop, tablet, and phone are first-class. Mobile is not a compressed desktop.
- Primary actions remain reachable at 200% CSS zoom and under realistic OS zoom.
- Touch targets, overflow, sticky chrome, and keyboard focus order must survive real layouts.

### 2.5 Accessibility

- Keyboard operability, visible focus, named controls, meaningful labels, live-region honesty where status changes matter.
- Color is never the sole signal. Contrast meets WCAG intent for interactive and text content.
- True VoiceOver / NVDA attestation remains required for OWNER ACCEPTED claims; proxies do not substitute forever.
- Delight never interferes with clarity, SR output, or reduced-motion preferences.

### 2.6 Discoverability

- Operators must find the real door to first-value paths without memorizing URLs.
- Labels name the real surface. Aliases must not oversell scaffolds as destinations.
- Create actions start real authoring or are honestly labeled as hubs/lists.
- Readiness chrome reflects real setup/health — never vanity “ready” from a narrow proxy.

### 2.7 Performance

- Perceived speed: optimistic where safe, honest loading where not.
- Avoid jank in builders, canvases, public tap, and Insights drill.
- Prefer incremental work over full-page freezes for long operations; surface progress and cancel where reasonable.

### 2.8 Reliability

- Persistence, idempotency, retries, dead letters, and recoverable failures for consequential workflows.
- Provider health and credential honesty are visible; failure classes are understandable.
- No silent data loss. No silent policy bypass. No invented success.

### 2.9 Extensibility

- Shared contracts over parallel islands (renderers, feature registry, Tap Point address, outbox, Guardian).
- Provider-neutral cores with adapters. New pillars register in the Feature Registry with Admin control.
- Anticipate realistic future use without speculative frameworks.

### 2.10 Thoughtful user delight

- Purposeful, subtle, accessible, performant.
- Creates the reaction: “Of course it works that way.”
- Never novelty for its own sake; never interference with clarity or trust.

---

## 3. Benchmark categories and detailed expectations

### 3.1 Rich text and document formatting

**Benchmarks:** Apple Pages · Microsoft Word

TapConnect formatting tools must feel **complete rather than simplified**. Where formatting applies (Card text, Campaign rich text, email bodies, notes, templates), support the maturity users reasonably expect from Pages-class tools:

- Typography: families, sizes, weight, style, tracking/leading where the medium supports it
- Reusable styles and paragraph styles where content is document-like
- Paragraphs, spacing before/after, indentation
- Lists (ordered, unordered, nested where applicable)
- Tables where tabular content is a real operator need
- Inline media with predictable placement and wrapping
- Alignment and wrapping that match live preview and public/email output
- Contextual formatting for the current selection
- Full keyboard operation for common formatting actions
- Undo / redo that matches operator expectation within session; durable undo where the product claims it
- Accessibility: semantic structure, readable contrast, SR-friendly content where published

Do **not** claim literal Word/Pages feature parity for every ribbon command. Do claim: formatting never feels like a toy subset when the surface is document-grade.

---

### 3.2 Presentation and visual composition

**Benchmarks:** Apple Keynote · Microsoft PowerPoint

For freeform canvas, composition boards, overlays, and presentation-like Experiences:

- Intelligent alignment, snapping, and guides
- Layers, grouping, arrange forward/back
- Resize, rotation, and arrangement with smooth object manipulation
- Reusable layouts and master-like patterns where they reduce repeated work
- Animation and transitions **where appropriate** to the medium (never gratuitous motion on ops-critical screens)
- Stable selection, multi-select, and transform affordances that feel continuous rather than brittle

Translate presentation craft into TapConnect canvases and cards — not into a slide-deck clone.

---

### 3.3 Creative building

**Benchmarks:** Canva · Adobe Express

Cards, Experiences, email, social assets, templates, reusable sections, and campaigns must be:

- Approachable for non-designers
- Smooth and visual (drag-and-drop where it clarifies structure)
- Contextual (tools follow selection)
- Reusable (sections, templates, brand inheritance)
- Undoable
- Responsive and immediately previewable (editor ↔ public / channel preview fidelity)

Builders are flagship surfaces. Dead controls, silent metallic finishes, and preview mismatch are quality defects.

---

### 3.4 Professional design systems

**Benchmarks:** Figma · Framer · Webflow · Wix Studio

Platform design craft must include:

- Design tokens (color, type, space, radius, elevation, motion) used consistently
- Responsive constraints and breakpoints with inheritance where sensible
- Components, variants, and reusable sections
- Preview fidelity to published output
- Advanced controls available without trapping beginners
- Progressive disclosure **without reducing capability** (charter: V2 ≥ V1)

Advanced power emerges; capability is never deleted to look simple.

---

### 3.5 Analytics and intelligence

**Benchmarks:** Microsoft Power BI · Tableau · Looker · Mixpanel · Amplitude

Insights must answer, for the operator’s real question:

1. What happened?
2. Why did it happen?
3. Why does it matter?
4. What changed?
5. What should the user do next?
6. How confident is the platform?

Required craft:

- Authoritative data with clear freshness
- Provenance and evidence classes (TapProof mindset)
- Drill-down and drill-through
- Filtering, comparison, saved views
- Attribution, funnels, cohorts where the product collects the underlying events
- Anomaly explanation when the platform can support it honestly
- Export
- Actionable next steps linked to real Studio destinations

**No KPI theater.** Vanity tiles without provenance, action, or confidence are defects.

---

### 3.6 Email marketing

**Benchmarks:** Klaviyo · Mailchimp · HubSpot Marketing · ActiveCampaign · Brevo

Email capability expectations:

- Complete responsive email builder
- Reusable sections and templates
- Personalization with honest missing-field behavior
- Audience rules, exclusions, consent, and suppression
- Previews (client/device realism as far as the platform supports)
- Testing, scheduling, approval
- Sequences and automation hooks into journeys where applicable
- Deliverability states; bounce / complaint / unsubscribe handling
- Analytics, attribution, and recovery paths for failed sends

Missing DNS or provider credentials must surface as readiness — never as fake “sent.”

---

### 3.7 Messaging, conversational funnels, and customer service

**Benchmarks:** ManyChat · Intercom · Front · Zendesk · Help Scout · Meta Business Suite Inbox

Expectations:

- Omnichannel continuity and conversation history
- Assignments, automation, templates, triggers, branching
- Human takeover, escalation, and case creation (TapCase)
- Contact timeline, tagging, search
- Consent enforcement and Channel Guardian decisions (**deterministic — never an AI coin-flip**)
- Audit trails
- Provider capability awareness (what this channel can/cannot do)

Live transports remain credential-gated until certified; mock ladders must still teach the full operator workflow.

---

### 3.8 Work management and productivity

**Benchmarks:** monday.com · Asana · ClickUp · Linear · Jira · Trello · Notion

For ExternalWorkItem, cases, approvals, and connector-backed work:

- Flexible views: board, table, calendar, timeline where useful
- Assignment, status, priority, dates, dependencies
- Comments, approvals, automation, saved filters, search
- Deep integration with Inbox/TapCase/Canvas work

**Limit:** Do not create a competing project-management product or second source of truth. Work management serves TapConnect operations.

---

### 3.9 Automation and journey building

**Benchmarks:** Zapier · Make · n8n · HubSpot Workflows

TapFlow (and related journey surfaces) must remain approachable to beginners while supporting expert depth:

- Triggers, conditions, branches, waits
- Bounded loops, retries, timeouts
- Subflows, approvals, human handoff
- Simulation, debugging, execution history
- Safe retry and failure recovery
- Analytics overlays on execution

Complexity lives in the graph engine and guardians — not in forcing hosts to become integration engineers on day one.

---

### 3.10 CRM and relationship management

**Benchmarks:** HubSpot CRM · Salesforce · Pipedrive

Audience and relationship craft:

- Contacts, relationships, lifecycle state
- Consent, preferences, suppression
- Source attribution and activity timelines
- Segmentation and custom properties where modeled
- Communications, purchases, bookings, cases, loyalty
- Authorized actions only; no invented customer facts

TapSave owns relationship; MyTap/Wallet are projections — not competing CRMs.

---

### 3.11 Commerce, payments, booking, and billing

**Benchmarks:** Shopify · Stripe · Square · Calendly · Toast (where relevant)

Expectations:

- Offers, products, services, bookings
- Orders, invoices, payments, subscriptions where applicable
- Discounts, receipts, refunds, reconciliation, fulfillment
- Provider health and understandable recovery
- Analytics tied to real commerce events

Never store raw card data. Stripe (and peers) are connectors; TapConnect remains authoritative for entitlements and plan truth where the billing domain says so.

---

### 3.12 Social publishing and engagement

**Benchmarks:** Sprout Social · Buffer · Hootsuite · Later · Metricool

TapCast and channel workspaces:

- Coordinated calendar
- Channel-specific variants and previews
- Scheduling, media, approval
- Comments and engagement routing into conversation/case flows where applicable
- Analytics
- Provider-specific capability declarations (including honest mock-only channels)

TikTok and peers live **inside** TapCast — not as permanent Experiences siblings. Do not overweight one channel versus foundations.

---

### 3.13 Knowledge, assets, and collaboration

**Benchmarks:** Notion · Confluence · Google Drive · Dropbox · Frame.io (where relevant)

Assets, Brand Kit, templates, Autopilot knowledge, and collaboration:

- Search, metadata, organization
- Reusable knowledge and brand vocabulary with provenance
- Rights, versions, comments, approvals
- Where-used analysis
- Archive / restore
- Permissions and collaboration without losing auditability

---

### 3.14 Administration and operations

**Benchmarks:** Stripe Dashboard · GitHub · Vercel · Cloudflare · Linear

Administration must be powerful without clutter:

- Searchable, permission-aware, auditable, reversible where safe
- Explainable actions with required reasons for consequential changes
- Status-conscious (health, credentials, kill-switches, rollout)
- Operationally trustworthy (Feature Registry, Platform Admin, outbox recovery)

Toggles never launder unfinished work as GA.

---

### 3.15 Observability and reliability

**Benchmarks:** Sentry · Datadog · Grafana

Important workflows must expose:

- Health, errors, freshness
- Retries, evidence, dead letters
- Recovery actions
- Understandable operational context for hosts and Platform Admin

Observability is part of the product, not an afterthought for engineers alone.

---

### 3.16 Mobile and field operations

**Benchmarks:** Apple Human Interface Guidelines · Material Design · Square POS field workflows (where useful)

Pulse and responsive Studio:

- Intentionally mobile — thumb reach, offline/claim honesty when claimed, large primary actions
- Not a squeezed desktop sidebar
- Field workflows optimize for speed, confirmation, and error recovery under real conditions

Stub or scaffold Pulse must be honestly labeled or disabled — never presented as fleet-ready.

---

### 3.17 AI and governed assistance

**Benchmarks:** ChatGPT Projects · Claude Projects · Cursor · GitHub Copilot · Notion AI

Automation Team / Autopilot / Keywords assistance **must**:

- Use approved context only
- Preserve provenance of proposals and applied changes
- Explain proposed changes
- Identify uncertainty and ask concise clarifying questions
- Support compare / accept / partial accept / reject / undo
- Expose cost and model information when applicable
- **Never invent** business facts, consent, policy, customer records, prices, legal terms, or provider capability

AI replaces V1 AI architecture cleanly; it does not replace Channel Guardian, consent, or Admin policy.

---

## 4. PRODUCT-OWNER AUTHORITY TO IMPROVE

The Product Owner authorizes the implementation team to improve **beyond the documented minimum** when the improvement clearly:

- preserves all approved functionality
- increases useful capability
- improves UX and visual polish
- reduces host effort and cognitive load
- improves discoverability
- improves accessibility
- improves responsiveness
- improves performance
- improves consistency
- improves reliability
- improves maintainability
- improves extensibility
- improves security and privacy
- improves auditability
- improves testing
- improves recovery
- improves provider neutrality
- anticipates realistic future use
- creates thoughtful delight
- strengthens commercial value

The team **should** anticipate foreseeable uses, identify missing relationships between objects and journeys, close disconnected workflows, and propose or implement the superior TapConnect-native solution when that improvement is clearly consistent with the Fusion Master Charter and these standards.

**Consequential improvements** (new workflows, IA changes, contract changes, capability expansion, or material UX shifts) **must be documented** with:

- what changed
- why it is superior
- which charter / journey / quality benchmark it serves
- what was preserved
- how it was verified

### Explicit limits

This authority **must never** permit:

- reduction or removal of approved functionality
- silent product-intent changes
- new competing systems or sources of truth
- provider-specific core architecture
- unnecessary abstractions
- speculative complexity
- destructive or production-impacting actions (including unauthorized push, merge, deploy, Railway/production changes, or migrations against non-isolated databases)
- invented readiness or OWNER-READY / OWNER ACCEPTED claims without proof
- hidden limitations
- novelty at the expense of usability
- endless polishing without measurable product benefit

When in doubt: preserve capability, improve honesty, document the decision in `PRODUCT_OWNER_DECISIONS.md` or the relevant fusion ledger, and seek PO review for consequential UX changes.

---

## 5. GLOBAL CRAFTSMANSHIP PRINCIPLES

1. **Build the product users wish already existed**, not merely the smallest product literally described.
2. **Treat each important workflow as a potential flagship feature.**
3. **The expected result is premium in both appearance and function.**
4. **Familiarity should come from mature interaction patterns, not imitation.**
5. **Every workflow should be complete** from entry through outcome, evidence, analytics, and recovery.
6. **Complexity belongs in the platform, not in the host’s daily work.**
7. **Advanced power should emerge through progressive disclosure.**
8. **Smart defaults should reduce effort without removing control.**
9. **Actions should be reversible where reasonably possible.**
10. **Empty, loading, error, permission, provider-unavailable, dependency-missing, success, and recovery states are part of the feature.**
11. **Small details should create the reaction: “Of course it works that way.”**
12. **Delight must be purposeful, subtle, accessible, performant, and never interfere with clarity.**
13. **No generic admin-dashboard appearance.**
14. **No endless nested cards.**
15. **No dead-end plumbing.**
16. **No fake completeness.**

---

## 6. Enforceability

No surface is “done” against these standards by assertion alone. Implementation and verification for consequential work **must** include:

| Requirement | Expectation |
|-------------|-------------|
| Acceptance criteria | Explicit, testable criteria tied to the journey and this document |
| Visual inspection | Premium composition, brand coherence, no fake chrome |
| Responsive inspection | Desktop + mobile (+ tablet where the surface matters) |
| Accessibility inspection | Keyboard, focus, names/labels; SR proxies minimum; true VO/NVDA for OWNER ACCEPTED |
| Workflow completion testing | Entry → outcome → persistence → reopen → evidence |
| Performance consideration | No unacceptable jank or blocking waits on primary paths |
| Failure and recovery testing | Error, provider-off, kill-switch, retry, dead-letter paths where applicable |
| Benchmark traceability | Named category + principles applied (TapConnect-native translation) |
| Product Owner review | Required for consequential UX, IA, or capability-intent changes |

Classifications remain honest: headed proofs ≠ OWNER-READY; mock ladders ≠ live certification; proxies ≠ VoiceOver attestation.

---

## 7. Relationship to readiness honesty

These standards raise the bar for craft. They do **not** authorize:

- labeling scaffolds as GA
- green “Studio ready” without real readiness
- claiming live provider success without credentials and certification
- declaring OWNER-READY / OWNER ACCEPTED without ledger clearance and PO authority

Quality without honesty is still a defect.

---

## 8. Maintenance

Update this document when:

- PO locks a new craftsmanship rule
- a benchmark category’s TapConnect translation is clarified
- enforceability gates change

Do not dilute limits to excuse incomplete work. Do not expand scope into redesign of architecture already locked by the charter.

---

**Confirmation:** Named products are benchmarks for quality and capability maturity only. TapConnect remains TapConnect — fused V1 capability, premium UX, strong spine, Admin control plane, and provider-neutral extensibility.
