# UX & Rollout Assessment (Independent)

**Inspector role:** Independent product inspector (read-only)  
**Repo tip:** `9965c8a`  
**Method:** Code + IA review of `app/dashboard/**`, studio shells (`nav`, `studio-top-bar`, hub sections), Create/search surfaces, readiness ledger scent, empty/credential patterns. No live headed browser session in this pass; no implementation.  
**Scope rule:** TikTok evaluated only as one TapCast channel (not a disproportionate focus).  
**Not a self-certification:** Platform remains **not OWNER-READY**. This doc does not argue OWNER-READY reasons.

Companion defect inventory: `docs/fusion/INDEPENDENTLY_DISCOVERED_DEFECT_INVENTORY.md`  
Owner-reported ledger (do not conflate): `docs/fusion/OWNER_WALKTHROUGH_DEFECT_LOG.md`  
Truth map / sequence: `docs/fusion/PRODUCT_TRUTH_MAP.md` · `docs/fusion/COST_CONSCIOUS_IMPLEMENTATION_SEQUENCE.md` (J1 “find the door” classification for ID-001–ID-007)

---

## 1. First impression

**What lands well**

- Brand shell is coherent: dark `#050814` / `#070b14`, lime primary accents, Tap Connect mark in sidebar, business name in chrome — aligns with branding rules and feels closer to a shipped ops product than a marketing mock.
- Skip link + `main#main-content` exist on the dashboard layout.
- Home opens on an **operations thesis** (“What needs attention…”) rather than a generic KPI theater wall — closer to Linear’s “inbox of work” than Amplitude’s analytics-first home.

**What undercuts finish**

- Most primary destinations (`/dashboard/experiences`, `/assets`, `/audience`, `/settings`, `/tap-points`) are **hub directories** (`StudioHubSections` + stats) rather than the actual work surface. First click often yields a long list of labeled pillars with readiness badges — more Feature Registry catalog than Pages/Keynote “open and make.”
- Top bar can show **“Studio ready”** when outbox dead-letter count is zero (`app/dashboard/layout.tsx` + `StudioTopBar`). That reads as product readiness; it is only an alert proxy. Reference families (Stripe, Shopify) use restrained “account status” language tied to real setup, not a green sparkle for “no failed jobs.”
- Hardcoded **“All locations”** beside the business chip implies multi-location switching that does not exist.

**Coherence vs reference families (finish level, not clone checklist)**

| Family | Closest resonance | Gap at this tip |
|--------|-------------------|-----------------|
| Pages / Keynote | Card/campaign builders aspire to Format + WYSIWYG | Builders are the strongest “make something” path; hubs around them feel like a second product |
| Canva / Figma | Create + search + asset inheritance | Create often jumps to lists/hubs; Assets hub is thin vs Brand Kit depth |
| Linear / Notion | Seven permanent destinations + command palette | Secondary section density exceeds Linear’s progressive disclosure; many labels alias to one route |
| Front / Intercom | Inbox / cases under Audience | Operator path exists; Help control does not open help |
| ManyChat / Klaviyo | Journeys + email + audience | Comms/email readiness is honest on Settings; Create→Email does not start a send |
| Amplitude | Insights views + provenance | Insights is comparatively mature; Home does not compete with it (good) |
| Shopify / Stripe | Setup scent + billing honesty | Billing page is candid about Stripe gate; onboarding checklist omits providers/team |

**Verdict (first impression):** Credible dark Studio chrome; **not yet “open and ship”** for a new owner — first sessions lean catalog/readiness over creation.

---

## 2. Navigation IA

**Structure**

- Permanent rail: Home · Experiences · Tap Points · Audience · Insights · Assets · Settings (`lib/fusion/studio/ia.ts` `STUDIO_NAV`).
- Secondary sections appear in the **desktop** sidebar when a destination is active; mobile gets only the seven primary chips (`MobileDashboardNav` — no secondary rail).
- Platform Admin correctly lives under Settings (not primary rail) — good progressive privilege.

**Strengths**

- Alias folding of V1 routes into hubs preserves old URLs without seven competing top-levels.
- TapCast rule is explicit: social channels (including TikTok) live **inside** TapCast, not as Experiences siblings — correct product boundary.

**Weaknesses**

- **Label collision:** Under Experiences, a secondary item is also named **“Experiences”** and points at `/dashboard/workbench`, while the primary destination is Experiences → `/dashboard/experiences`. Owner language and “workbench” diverge.
- **Alias fan-in:** Many distinct labels (Contacts, Relationships, Consent, TapSave, MyTap, TapGuide, Calendar, Sets, Rotations, Referrals, Bookings, Invoices, TapTrail, Whiteboard, …) resolve to the same handful of routes (`/dashboard/audience`, `/dashboard/groups`, `/dashboard/workbench`, `/dashboard/experiences/orders`, `/dashboard/insights`). Feels like a roadmap index painted as navigation.
- **Readiness chip truncation** in the sidebar shows only the first word of the derived label (e.g. “FUNCTIONAL”, “VERIFIED”, “DEVELOPMENT”) — honest intent, but cryptic without opening the hub badge detail.
- Footer copy (“V1 routes remain available inside hubs…”) is engineer-facing, not operator-facing.

---

## 3. Naming

- **Tap\*** vocabulary is dense (TapPoint, TapCast, TapFlow, TapLoop, TapCanvas, TapTrail, TapProof, TapCase, …). Internally consistent with the pillar catalog; externally closer to a platform taxonomy than Shopify’s plain “Products / Orders / Customers.”
- **Automation Team** vs **Autopilot** vs feature id `ai.autopilot` — Home section says Automation Team but links to workbench; Settings gates on Autopilot. Operators will search the wrong noun.
- **Card** vs **Campaign** vs **Experience** vs **Workbench** — Create offers Card / Experience / Campaign / Offer / Form with overlapping destinations. Pages-like clarity exists mainly inside the Card builder itself.
- Marketing comparison tables still use “Coming soon” language (`lib/marketing/landing-content.ts`) — acceptable on marketing; Studio should not echo that pattern for live chrome (mostly avoided, with exceptions like template “coming soon”).

---

## 4. Home usefulness

**Useful for operators**

- Decision queue: dead-letter count → Settings recovery; Tap Point health rollup; active device count.
- Onboarding checklist until complete (brand, first campaign, device, assign).
- Recent campaigns list with status.

**Weak for owners / creatives**

- No primary “continue editing” or “publish next” creative queue beyond recent campaigns.
- Automation Team entry is a hub link, not a decision item.
- When onboarding is complete, Home can feel sparse relative to the rest of the IA’s ambition — Linear would still show assigned issues; here the queue can be empty while dozens of scaffolded pillars remain listed below.

**Rollout note:** Home is a plausible **ops dashboard**, not a **studio start**. That is a coherent choice if messaging matches; current subtitle still sells “Fusion pillars live under…” which sounds like a map, not a queue.

---

## 5. Create

- Global **+ Create** menu groups actions (Experiences / Audience / Tap Points / Assets) with maturity via `safeDisplayLabel` — good that static `owner_ready` does not print “OWNER-READY.”
- Many Create rows are **navigation to an existing surface**, not a create mutation:
  - Email → `/dashboard/campaigns`
  - Form / Offer / Reusable section / Whiteboard → `/dashboard/workbench`
  - Template → `/dashboard/campaigns`
  - Booking → orders (scaffolded maturity)
- TapCanvas / Whiteboard appear as Create targets at alpha — appropriate maturity label, but still discoverable as “create” for unfinished graph/scaffold work.
- TikTok content Create correctly nests under TapCast path (`/dashboard/experiences/tapcast/tiktok`) — proportional, not a top-level product.

**vs Canva/Figma:** Create should open a blank or template-bound editor with an obvious save path. Here Create often opens a **list or hub**, then the user must find the real New action.

---

## 6. Onboarding

- Post-business-create: thin `OnboardingForm` (name / website / phone) → `/dashboard`.
- Home checklist: Brand → Campaign (workbench) → Device → Assign. Solid **minimum live path**.
- **Missing scent:** integrations/providers, team/roles, billing, email readiness, Brand Kit depth beyond “logo & colors,” Inbox/Guardian, wallet credentials.
- Checklist **disappears when complete** — good progressive hide; no recurring “provider health” strip replaces it (except top-bar alert proxy).

---

## 7. Brand Kit / team / provider setup scent

| Concern | Where it lives | Scent strength |
|---------|----------------|----------------|
| Brand Kit | `/dashboard/brand` under Assets alias | Medium — onboarding links here; Assets hub itself is mostly section list + Keywords panel |
| Team / roles | Settings permission matrix section | Weak — not in onboarding; not a first-class “Invite team” Create |
| Providers | Settings → Integrations + email readiness panel | Medium on Settings; weak from Home |
| Billing | Settings card + `/dashboard/billing` | Honest Stripe gate copy — good Stripe-like candor |
| Platform Admin | Settings card → `/admin/platform` | Appropriate burial for business owners; strong for admins |

Assets hub subtitle claims Brand Kit / media / templates, then surfaces **KeywordsSuggestPanel** with `defaultChannel="instagram"` — odd first scent for an Assets destination (channel tooling before brand files).

---

## 8. Empty / loading / error / credential states

**Positive patterns**

- Feature-disabled components (`FeatureDisabledState`) on gated Autopilot budget.
- Pulse disabled state explains `ops.pulse` and offers Scan Mode exit.
- Freeform canvas uses **honest disabled** copy when flag off (`freeform-honest-disabled`).
- TapCast hub surfaces `VERIFIED — CREDENTIALS REQUIRED` status label.
- Settings email readiness shows mock vs live + missing env vars.
- Insights distinguishes empty vs error snapshots.
- Hub readiness badges expand to what works / what does not / next action — best honesty mechanism in the shell.

**Gaps**

- Notifications bell: badge can light from dead letters, but the control has **no navigation/handler** — dead control with live affordance.
- Help (`CircleHelp`) links to Settings with aria “Help and settings” — not help content; missing dedicated exit/docs.
- Pulse **enabled** path still ships claim/rotation/offline **stubs**.
- Template gallery: “Save as user template (coming soon)” — disabled/coming-soon chrome inside an otherwise live builder area.
- Commerce/orders openly mock — good honesty in copy; Create Order still invites mock commerce as a first-class create.

---

## 9. Progressive disclosure

**Working**

- Seven primary destinations.
- Cmd+K palette.
- Readiness detail expanders on hubs.
- Feature flags + kill-switch mental model for admins.

**Not working**

- Secondary section lists expose **scaffolded / alpha / alias** items at the same visual weight as Cards/Campaigns/Devices.
- Create menu length rivals a product sitemap.
- Sidebar maturity chips compress to one truncated word — disclosure without comprehension.

Ideal reference bar (Notion/Linear): ship the GA nouns first; park DEVELOPMENT items behind “Labs” or Admin. Fusion currently **shows the whole graph** with badges as apology.

---

## 10. Desktop / tablet / mobile

| Breakpoint | Observation |
|------------|-------------|
| Desktop `lg+` | Full sidebar + secondary sections; main scroll inside constrained height shell |
| Tablet | Primary rail hidden until `lg`; mobile top chips only — secondary IA lost |
| Mobile | Horizontal primary chips OK; no Create prominence in mobile header strip beyond top bar; hub lists long; builders (not fully re-audited here) historically stressed layout (owner D-016/D-022 FIXED locally — not re-certified here) |

**Rollout risk:** Field operators on phone get Scan/Pulse intent, but Pulse is stub-heavy and mobile cannot browse Tap Points secondary sections without opening the hub page body.

---

## 11. Perspectives

### Owner (business principal)

- Wants: brand → first card/campaign → device live → see taps.
- Gets: checklist + strong builders + device paths; diluted by hub catalogs and Tap\* naming.
- Risk: “Studio ready” + long FUNCTIONAL lists → false confidence before credentials/VO residuals.

### Operator (day-to-day)

- Wants: assign, scan, inbox reply, loyalty adjust, recover failures.
- Gets: Home queue + Inbox/TapLoop/Scan surfaces; weak notifications; Pulse stubs; mobile IA incomplete.
- Risk: alias labels that don’t open dedicated tools → “where is TapGuide / Referrals?”

### Admin (platform)

- Wants: kill switches, audit, feature registry, outbox.
- Gets: Settings → Platform Admin; readiness/feature language is engineer-grade (good for this persona).
- Risk: Business owners clicking Platform Admin from Settings cards without authz clarity (authorized-only copy exists but is easy to miss).

---

## 12. UX rollout verdict

**Not ready for broad owner rollout as a finished Studio.**  
**Plausible for guided internal / PO walkthrough** on isolated DB with explicit coaching: use Cards, Campaigns, Groups, Devices, Scan, Brand, Insights; treat hub section lists and Create aliases as a map, not a promise.

**Highest UX risks before any external cohort**

1. False readiness chrome (“Studio ready”, truncated FUNCTIONAL badges, Create maturity vs actual create).
2. IA alias fan-in presenting scaffolded nouns as destinations.
3. Mobile secondary-nav absence for operator workflows.
4. Dead or misleading chrome (notifications bell, help→settings, coming-soon template save, Pulse stubs).

**What is closest to reference-grade finish**

- Brand shell + seven-destination spine.
- Builder honesty mechanisms (readiness ledger, honest freeform disable, credential labels on TapCast/email).
- Insights provenance/drill posture (relative to Amplitude-like expectations).
- Billing/Stripe gate candor.

**Independent defects:** see `INDEPENDENTLY_DISCOVERED_DEFECT_INVENTORY.md` (IDs `ID-*`, distinct from owner `D-*`).  
**Sequence / J1 discoverability:** see `COST_CONSCIOUS_IMPLEMENTATION_SEQUENCE.md` (J1 blockers vs UX spine for ID-001–ID-007).
