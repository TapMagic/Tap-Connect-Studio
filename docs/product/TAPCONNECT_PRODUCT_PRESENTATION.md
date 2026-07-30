# TapConnect Product Presentation

Status: repository-grounded presentation package  
Audited source: `0fafda9b77701b8747b3579a88324a010e2bc8a9`  
Companion source of truth: `docs/product/TAPCONNECT_FEATURE_INVENTORY.md`

## Presentation rules

- TapConnect is the living Card.
- TapConnect Studio is the operating system and capabilities surrounding the Card.
- Studio does not imply every capability is included in every plan.
- Candidate, in-progress, credential-gated, mock, and deferred capabilities remain labeled.
- Screenshots use scrubbed demonstration businesses, never invented customer proof.
- Do not present demonstration metrics as customer results.

## Slide 1 — TapConnect: your business, ready to tap

- **Core message:** TapConnect learns about the business, prepares the Brand, and creates the first living Card.
- **Supporting copy:** Every tap can lead to a useful customer action and a relationship the customer can return to.
- **Visual composition:** A large living Card occupies the right two-thirds; a tap ripple enters from the left and resolves into one useful action and one retained-relationship signal.
- **Route or screenshot:** `/`; hero living Card visual.
- **Speaker notes:** Lead with the outcome, not NFC, QR, or software categories. The Card is the product center.
- **Claims requiring qualification:** The first Card is a draft; discovery and Brand suggestions require Owner confirmation.
- **Audience relevance:** All audiences; strong opening for sales, partners, advisors, and demonstrations.

## Slide 2 — The business problem

- **Core message:** Customer attention arrives in a moment, but business information and follow-up are usually fragmented.
- **Supporting copy:** Links go stale, contact details scatter, promotions replace rather than strengthen the destination, and the business has little evidence of what the moment accomplished.
- **Visual composition:** A left-to-right contrast: fragmented links and tools on the left; one stable Card destination on the right.
- **Route or screenshot:** Product map from `/`; no customer metrics.
- **Speaker notes:** Avoid claiming every business has the same problem. Frame this as the operating condition TapConnect is designed to improve.
- **Claims requiring qualification:** No unsupported market-size, conversion, or failure-rate statistics.
- **Audience relevance:** Sales, strategy, investors/advisors.

## Slide 3 — TapConnect is the living Card

- **Core message:** The Card is a persistent customer destination, not a disposable profile or QR landing page.
- **Supporting copy:** It can hold approved business information and configured actions while the Owner continues improving drafts separately.
- **Visual composition:** Full-height public Card with callouts for identity, practical actions, current Spotlight, and Keep Card.
- **Route or screenshot:** `/marketing/product/public-card.webp`; public route `/t/[deviceCode]`.
- **Speaker notes:** A QR code or NFC Tap Point can open the Card, but neither is the product.
- **Claims requiring qualification:** Actions appear only when configured; public readiness remains verification-pending.
- **Audience relevance:** All audiences.

## Slide 4 — TapConnect Studio works around the Card

- **Core message:** Studio helps create, connect, retain, operate, communicate, reuse, and understand the relationship around the same Card.
- **Supporting copy:** Owners can add appropriate operating capabilities without rebuilding the customer destination.
- **Visual composition:** Card in the center; seven restrained spokes for Brand/Assets, Tap Points, Campaigns, Audience, Autopilot, Communications, and Insights.
- **Route or screenshot:** `/dashboard`; `public/marketing/product/home-card-command-center.webp`.
- **Speaker notes:** “Studio” describes the surrounding operating system, not one all-inclusive package.
- **Claims requiring qualification:** Capability availability varies by plan, role, configuration, provider, and release status.
- **Audience relevance:** Product alignment, partners, strategic and sales conversations.

## Slide 5 — Tell us about your business

- **Core message:** Acquisition begins with the business, not a blank editor.
- **Supporting copy:** The Owner supplies core details and may choose website intake; discovered facts are organized as suggestions.
- **Visual composition:** A simple business intake on the left, governed fact suggestions on the right.
- **Route or screenshot:** `/onboarding`, stage one; `components/onboarding/card-first-onboarding-workspace.tsx`.
- **Speaker notes:** Business Knowledge is durable product context, but its standalone post-onboarding workspace remains in progress.
- **Claims requiring qualification:** Website extraction can be fixture- or live-provider dependent. Discovery never equals approval.
- **Audience relevance:** Prospective Owners, sales demonstrations, onboarding alignment.

## Slide 6 — We found your Brand

- **Core message:** TapConnect prepares a Brand foundation for review rather than silently selecting an identity.
- **Supporting copy:** Logo candidates, colors, typography, and business facts remain decisions the Owner can approve, reject, or lock where permitted.
- **Visual composition:** Candidate assets flow into an explicit review gate, then into the Card.
- **Route or screenshot:** `/dashboard/brand/edit`; onboarding Brand stage.
- **Speaker notes:** This is an assistance-and-governance story, not “AI invents your Brand.”
- **Claims requiring qualification:** Logo.dev and other live provider behavior requires setup; imported assets require approval and rights context.
- **Audience relevance:** Owners, Brand partners, agencies, product teams.

## Slide 7 — Here is your first Card

- **Core message:** The Owner receives a useful Card draft instead of an empty canvas.
- **Supporting copy:** Confirmed knowledge and approved Brand decisions prepare a starting structure the Owner can Preview and refine.
- **Visual composition:** Three frames: prepared draft, Preview, Owner refinement.
- **Route or screenshot:** `/dashboard/card/preview`; `/dashboard/card/edit`.
- **Speaker notes:** Keep “draft,” “Preview,” and “public” visually distinct.
- **Claims requiring qualification:** Preview does not publish. Full authoring remains implementation-in-progress under the repository readiness policy.
- **Audience relevance:** Prospective Owners, sales, onboarding and product alignment.

## Slide 8 — What happens when a customer taps

- **Core message:** The customer reaches the current public Card and chooses a useful configured action.
- **Supporting copy:** Examples include Save Contact, phone, Email, website, directions, a Google review link, an approved offer, or a support question.
- **Visual composition:** Tap ripple enters the Card; action choices radiate out without leaving the Card visually behind.
- **Route or screenshot:** `/t/[deviceCode]`; `public/marketing/product/public-card.webp`.
- **Speaker notes:** Describe the Card as the stable destination and Campaign/Spotlight as timely emphasis.
- **Claims requiring qualification:** Not every action is configured or included for every Owner. Native booking is deferred.
- **Audience relevance:** Sales, partners, business demonstrations.

## Slide 9 — The Card remains useful afterward

- **Core message:** Updated approved information and return paths keep the destination valuable beyond the first visit.
- **Supporting copy:** The Owner can refine drafts, manage current emphasis, and keep unfinished work separate from the public Card.
- **Visual composition:** Same Card shown at three moments with stable identity and changing approved emphasis.
- **Route or screenshot:** `/dashboard/card`; `/dashboard/card/preview`; `/t/[deviceCode]`.
- **Speaker notes:** The value is continuity, not constant messaging.
- **Claims requiring qualification:** Changes require the appropriate workflow and state transition.
- **Audience relevance:** Owners, retention-focused partners, advisors.

## Slide 10 — TapSave: keep the business in your pocket

- **Core message:** TapSave creates a customer-controlled return path to the living Card.
- **Supporting copy:** A customer can keep the Card and return to useful approved information or experiences later.
- **Visual composition:** First tap → Keep this Card → MyTap return, connected by one quiet line.
- **Route or screenshot:** `/mytap/[relationshipId]`; `components/tap/keep-card-cta.tsx`; `/marketing/product/audience-relationships.webp`.
- **Speaker notes:** Position TapSave as usefulness and continuity, not a lead-extraction trick.
- **Claims requiring qualification:** TapSave does not authorize spam, surveillance, or automatic Campaign sending. Live wallet passes remain unverified.
- **Audience relevance:** Owners, CRM/retention partners, sales.

## Slide 11 — Autopilot reduces Owner workload

- **Core message:** Autopilot organizes unfinished work and prepares safer next steps.
- **Supporting copy:** It can identify missing or contradictory information, organize Business Knowledge, prepare recommendations and drafts, and surface readiness problems.
- **Visual composition:** Messy knowledge signals enter; an ordered decision queue exits; the Owner approval gate remains visible.
- **Route or screenshot:** `/marketing/product/autopilot.webp`; outcome and prepared-outcome workspaces.
- **Speaker notes:** Autopilot is operational assistance, not merely copy generation.
- **Claims requiring qualification:** It does not invent approved facts, publish, send, spend, or silently replace approved decisions. Live model paths require credentials and entitlement.
- **Audience relevance:** Owners, operations leaders, strategic and investor/advisor discussions.

## Slide 12 — Business Knowledge stays under Owner control

- **Core message:** Confirmed facts become durable context; discovered facts remain proposals.
- **Supporting copy:** Approval and rejection protect the Card from unverified website or provider information.
- **Visual composition:** Proposed → approved/rejected → eligible for Card draft.
- **Route or screenshot:** Onboarding stages one and two; `/api/business/knowledge` as supporting boundary, not primary visual proof.
- **Speaker notes:** Use the visible onboarding workflow as proof, not the API.
- **Claims requiring qualification:** A dedicated Knowledge hub is not yet a complete Owner workflow.
- **Audience relevance:** Product, trust/governance, advisors, enterprise prospects.

## Slide 13 — Brand Starter Kit

- **Core message:** The Card begins from an approved identity foundation.
- **Supporting copy:** Owners can work with logo, color, typography, and multi-surface previews, then promote approved decisions.
- **Visual composition:** Brand controls on one side; live Card preview on the other.
- **Route or screenshot:** `/dashboard/brand/edit`; Brand Kit workspace.
- **Speaker notes:** Show the approval step and impact dialog.
- **Claims requiring qualification:** Brand vocabulary and some assisted suggestions remain alpha or provider-dependent.
- **Audience relevance:** Owners, agencies, Brand partners, product.

## Slide 14 — A professional Creative Platform

- **Core message:** Creative capabilities support the Card and customer journey; they are not the product center.
- **Supporting copy:** Shared media, provider search, gradients, backgrounds, masks, frames, image treatment, shapes, typography, layers, and composition controls are present across Owner workflows.
- **Visual composition:** Large authentic Card/Campaign authoring screenshot with a narrow annotated tool strip.
- **Route or screenshot:** `/dashboard/card/edit`; `/dashboard/assets`; `public/marketing/product/campaign-workbench.webp`.
- **Speaker notes:** Avoid the “Canva clone” framing. Lead with coherence and reuse.
- **Claims requiring qualification:** Creative Platform classification is implementation-in-progress; freeform canvas is internal/scaffolded; live Pexels/Logo.dev require setup.
- **Audience relevance:** Owners, creative partners, agencies, product.

## Slide 15 — Create once, reuse across Card, Email, and Campaign

- **Core message:** Approved Brand assets and creative resources can move across customer-facing work.
- **Supporting copy:** Shared resources reduce repeated uploads and help the Card, Email authoring, and Campaign work stay visually related.
- **Visual composition:** One approved asset in the center feeding three real screenshot crops.
- **Route or screenshot:** `/dashboard/assets`; `/marketing/product/public-card.webp`; `/marketing/product/email-workspace.webp`; `/marketing/product/campaign-workbench.webp`.
- **Speaker notes:** Reuse is governed; it does not mean every composition automatically synchronizes.
- **Claims requiring qualification:** Email delivery and some providers require configuration. Authoring does not send.
- **Audience relevance:** Owners, agencies, marketing and operations teams.

## Slide 16 — Core actions and customer outcomes

- **Core message:** Each Card action should answer a real customer need.
- **Supporting copy:** Save Contact preserves identity; phone/Email support direct contact; website/directions support discovery; reviews support reputation; offers support timely action; TapSave supports return.
- **Visual composition:** Action/outcome pairs in an editorial list, not a feature grid.
- **Route or screenshot:** Public Card renderer.
- **Speaker notes:** Ask the audience which actions matter for their business; do not imply every Card needs every action.
- **Claims requiring qualification:** Only configured actions render. Google Reviews is a destination link.
- **Audience relevance:** Sales discovery, demonstrations, solution partners.

## Slide 17 — Offers, Coupons, Reviews, and appointment links

- **Core message:** The Card can carry timely calls to action while remaining the durable destination.
- **Supporting copy:** Campaign offer/coupon blocks and Card Spotlight binding are visible in current workflows; Google review links are supported; external booking links can be represented.
- **Visual composition:** Card Spotlight attached to the Card, with review and external booking-link examples clearly secondary.
- **Route or screenshot:** `/dashboard/card?wire=offer`; Campaign Workbench.
- **Speaker notes:** Keep native booking out of the current-capability claim.
- **Claims requiring qualification:** Offer fuse is in progress; checkout may be simulated; native appointments/booking are deferred.
- **Audience relevance:** Retail, hospitality, services, sales.

## Slide 18 — Tap Points and distribution

- **Core message:** Physical and digital entry points wake the same living Card.
- **Supporting copy:** Owners can manage Tap Points/devices, use Scan Mode, assign Campaigns, and review fleet health.
- **Visual composition:** Three Tap Points converge on one Card; plan limits appear as a small footnote.
- **Route or screenshot:** `/dashboard/tap-points`; `/dashboard/devices`; `/dashboard/scan`.
- **Speaker notes:** Tap Points are distribution, not the product identity.
- **Claims requiring qualification:** Active limits vary by plan; advanced Tap Point spine remains in development; hardware inclusion is not promised.
- **Audience relevance:** Partners, location operators, field teams, sales.

## Slide 19 — Draft, Preview, Publish, and Public

- **Core message:** State clarity protects the customer experience.
- **Supporting copy:** Owners edit drafts, inspect Preview, take explicit publication actions where supported, and keep unfinished work away from the public Card.
- **Visual composition:** Four clearly separated states with arrows only where an explicit action exists.
- **Route or screenshot:** `/dashboard/card/edit`; `/dashboard/card/preview`; preview-token route; `/t/[deviceCode]`.
- **Speaker notes:** Use this slide to answer “Does it publish automatically?” with a direct “No.”
- **Claims requiring qualification:** Card and Campaign lifecycles differ; never imply one universal publish switch.
- **Audience relevance:** Owners, trust/governance, product, enterprise prospects.

## Slide 20 — Analytics and proof of value

- **Core message:** TapConnect helps Owners understand what the Card and surrounding work accomplished.
- **Supporting copy:** Analytics and Insights provide trends, KPI and drill views, top Campaign/Tap Point context, evidence classes, and export.
- **Visual composition:** Authentic Insights screenshot with evidence labels emphasized and demonstration values de-emphasized.
- **Route or screenshot:** `/dashboard/insights`; `/dashboard/analytics`; `/marketing/product/insights-tapproof.webp`.
- **Speaker notes:** Explain evidence classes before showing numbers.
- **Claims requiring qualification:** Screenshot values are scrubbed demo data, not customer metrics. Dedicated messaging/social analytics are not implemented.
- **Audience relevance:** Owners, executives, advisors, partners.

## Slide 21 — Representative business uses

- **Core message:** Different businesses use different actions, but the operating pattern stays coherent.
- **Supporting copy:** Local service: tap → call/directions → keep. Restaurant/hospitality: tap → current details/offer → return. Beauty/wellness: tap → contact/review/external booking link → keep. Professional service: tap → Save Contact/Email/support → consent-aware relationship.
- **Visual composition:** Four horizontal story lines, each ending at a retained relationship rather than an industry-photo wall.
- **Route or screenshot:** Landing `#solutions`; public Card.
- **Speaker notes:** These are representative scenarios, not customer case studies.
- **Claims requiring qualification:** No fabricated brands, testimonials, logos, or outcomes.
- **Audience relevance:** Sales and partner demonstrations.

## Slide 22 — Trust, consent, provenance, and approval

- **Core message:** Owner control is part of the product, not a disclaimer.
- **Supporting copy:** Facts and imported assets require confirmation; source and rights context remain visible where captured; roles control approvals; drafts remain separate; customer communication is not sent during setup.
- **Visual composition:** A visible trust rail beneath Knowledge → Brand → Draft → Preview → Public.
- **Route or screenshot:** Onboarding, Brand decisions, Asset library, Settings permission matrix.
- **Speaker notes:** Avoid unsupported compliance badges or broad security claims.
- **Claims requiring qualification:** Roles and tenancy are implementation-in-progress; source metadata depends on provider/import path.
- **Audience relevance:** Enterprise prospects, partners, advisors, product and governance teams.

## Slide 23 — Pricing and tier positioning

- **Core message:** Plans scale operating capacity around the Card; they do not redefine what TapConnect is.
- **Supporting copy:** Basic $19/month: 1 active Tap Point, 3 active Campaigns. Studio $49: 10/10. Pro $99: 50/50. Growth $199: 150/150.
- **Visual composition:** Four simple columns with monthly price and the two enforced numeric limits; the Card baseline runs beneath all four.
- **Route or screenshot:** `/pricing`; source `lib/plans.ts`; derived entitlements `lib/fusion/billing/plans.ts`.
- **Speaker notes:** Keep plan names and numeric limits exact. Use the canonical Pricing page for comparison.
- **Claims requiring qualification:** No trial, annual savings, hardware inclusion, sending volume, or guarantee. Live checkout and subscription activation are deferred. Studio features can also depend on role/configuration.
- **Audience relevance:** Buyers, sales, partners, advisors.

## Slide 24 — Competitive distinction

- **Core message:** TapConnect combines a durable living Card with the operating system that prepares, distributes, retains, and measures the relationship.
- **Supporting copy:** The distinctive product frame is Card-first onboarding, stable destination continuity, TapSave retention, governed knowledge/Brand, reusable creative work, explicit states, and evidence-aware operations.
- **Visual composition:** A single connected lifecycle rather than a competitor checklist.
- **Route or screenshot:** Landing page full narrative.
- **Speaker notes:** Compare operating models, not unsupported superiority. Avoid “first,” “only,” “best,” or “impossible to copy.”
- **Claims requiring qualification:** Do not imply every surrounding capability is fully verified or included in all tiers.
- **Audience relevance:** Strategy, sales, partners, investors/advisors.

## Slide 25 — Current visible capability candidates

- **Core message:** The repository has substantial visible Owner workflows, with final readiness verification still open.
- **Supporting copy:** Strongest candidates include Card assembly/Preview, Card-first onboarding, Brand Kit, Assets, Tap Points/Scan, Campaign authoring, TapSave/MyTap, Leads/Audience, Analytics/Insights, and selected Autopilot activation paths.
- **Visual composition:** A restrained readiness list grouped around the Card, each labeled “verification pending.”
- **Route or screenshot:** Routes referenced in `TAPCONNECT_FEATURE_INVENTORY.md`.
- **Speaker notes:** The repository verification ledger currently reports zero fully OWNER-READY VERIFIED subsystems.
- **Claims requiring qualification:** Candidate does not equal production-certified. Credential and assistive-technology gates remain for several paths.
- **Audience relevance:** Internal alignment, advisors, diligence conversations, implementation partners.

## Slide 26 — In progress and intentionally deferred

- **Core message:** The product boundary is explicit.
- **Supporting copy:** In progress: Business Knowledge hub, full Creative Platform verification, Card offer fuse, Email/replies delivery, Inbox/cases, roles/tenancy, integrations, wallet, TapFlow, TapCanvas, TapCast, TapCommerce, Pulse. Deferred/not current: native appointments, referrals, completed multi-location management, live wallet passes, production checkout activation, autonomous sending/publication.
- **Visual composition:** Two columns: “in progress” and “not a current promise.”
- **Route or screenshot:** Feature inventory; no aspirational mockups.
- **Speaker notes:** This slide protects the integrity of every earlier slide.
- **Claims requiring qualification:** Provider setup can move individual capabilities between local/test and live without changing overall readiness classification.
- **Audience relevance:** Product, partners, advisors/investors, enterprise diligence.

## Slide 27 — Recommended call to action

- **Core message:** Tell us about your business. We will help prepare the Brand and create the first Card.
- **Supporting copy:** Signed-out visitors create an account. Signed-in Owners resume incomplete onboarding or continue to the correct Studio destination.
- **Visual composition:** The living Card resolves from three quiet stages: Business → Brand → Card. One green action only.
- **Route or screenshot:** Signed out `/sign-up`; signed in `/auth/continue`; onboarding `/onboarding`; completed Owner `/dashboard`.
- **Speaker notes:** Explain exactly what happens after the click. Do not route the primary acquisition action directly to payment.
- **Claims requiring qualification:** The created Card begins as a draft; Preview does not publish.
- **Audience relevance:** All audiences; close for sales and demonstrations.

## Authentic screenshot index

| Presentation use | Asset or route | Status |
| --- | --- | --- |
| Public living Card | `public/marketing/product/public-card.webp` | Scrubbed demo capture |
| Home Card command center | `public/marketing/product/home-card-command-center.webp` | Scrubbed demo capture |
| Campaign Workbench | `public/marketing/product/campaign-workbench.webp` | Scrubbed demo capture |
| Audience relationships | `public/marketing/product/audience-relationships.webp` | Scrubbed demo capture |
| Email authoring | `public/marketing/product/email-workspace.webp` | Scrubbed demo capture |
| Email & Replies setup | `public/marketing/product/email-replies-setup.webp` | Scrubbed demo capture |
| Autopilot | `public/marketing/product/autopilot.webp` | Scrubbed demo capture |
| Integrations maturity | `public/marketing/product/integrations-maturity.webp` | Scrubbed demo capture |
| Insights/TapProof | `public/marketing/product/insights-tapproof.webp` | Scrubbed demo capture |
| Public landing | `/` | Capture from final responsive proof |
| Card-first onboarding | `/onboarding` | Capture only in isolated seeded/dev-auth environment |
| Brand Kit | `/dashboard/brand/edit` | Capture only in isolated seeded/dev-auth environment |
| Card Preview | `/dashboard/card/preview` | Capture only in isolated seeded/dev-auth environment |

## Presenter close

TapConnect is the living Card customers can use and keep. TapConnect Studio is the governed operating system around it. The acquisition promise is concrete: tell us about the business, review the Brand foundation, and receive a useful first Card draft—with the Owner in control before anything becomes public.

