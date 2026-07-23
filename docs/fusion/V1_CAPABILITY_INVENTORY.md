# V1 Capability Inventory

**Branch:** `tapconnect-v1-v2-fusion`  
**HEAD at inventory:** `7357fd9806d56d07d9ded68eef2beec5ea578052` → verify with `git rev-parse HEAD`  
**Rule:** Do not mark preserved unless it works, previews, persists, renders, recovers, and remains accessible.

## Verified V1 surfaces (must remain available)

| Area | Primary paths | Status |
|------|---------------|--------|
| Overview | `app/dashboard/page.tsx` | Preserve |
| Studio IA hubs | `app/dashboard/experiences`, `tap-points`, `audience`, `insights`, `assets` | Wired — V1 aliases preserved |
| Workbench | `components/workbench/*`, `lib/types/campaign.ts` | Preserve + expand |
| Campaigns | `app/dashboard/campaigns/**`, `lib/services/campaigns.ts` | Preserve |
| Tap Card Builder | `components/card/tap-card-builder.tsx`, `lib/brand/tap-card.ts` | Preserve + Pages Format |
| Campaign Groups | `components/campaign/group-manager.tsx`, slots + seeds | Preserve |
| Devices | `components/devices/*`, `DeviceSlot` | Preserve; TapPoint bridge wired (`lib/fusion/devices/tap-point-bridge.ts`) |
| Leads | `components/leads/*`, `Lead` + public capture | Preserve; dual-write to Contact/Consent on capture |
| Analytics | `lib/services/analytics.ts`, Tap/Click events | Preserve; Insights hub + TapProof readiness panel |
| Brand Kit | `components/brand/brand-kit-form.tsx` | Preserve; Assets hub links to Brand Kit |
| Integrations | `lib/config/integrations.ts` | Preserve env gates; add Feature Registry |
| Scan Mode | `components/scan/*`, `lib/services/scan.ts` | Preserve; claim path ensures TapPoint bridge |
| Billing UI | `app/dashboard/billing/page.tsx` | Preserve UI; Stripe-ready domain |
| Platform Admin | `app/admin/*` (landing CMS) | Expand to TapMagic Platform Admin |
| Public tap | `app/t/[deviceCode]`, resolvers | Preserve; TapPointAddress fallback in resolver |
| MyTap (stub) | `app/mytap/[relationshipId]` | Privacy-safe projection; no PII in URLs |
| Media | R2 upload, Pexels, Unsplash, Logo.dev, libraries | Preserve providers |
| Email | Resend paths, campaign email builder | Preserve + Audience email pillar |
| AI (V1) | `lib/services/ai-generate.ts` | REPLACE CLEANLY |

## Block archaeology (Campaign Workbench)

`hero_image`, `hero_video`, `headline`, `rich_text`, `button_group`, `product_details`, `image_gallery`, `offer_coupon`, `email_capture`, `feedback_form`, `google_review`, `map_location`, `vcard_download`, `social_links`, `disclaimer`, `age_gate`, `faq`, `action_block`, `upcoming_schedule`, `digital_card`, `spacer`, `columns`, `banner`

**Gaps to close:** `age_gate`, `feedback_form`, `image_gallery` exist as types but are not in ADDABLE_BLOCKS — restore to Block Library (no silent loss).

## Tap Card section archaeology

`promo_header`, `hero`, `identity`, `action`, `action_row`, `image`, `logo_block`, `special_offer`, `text`, `spacer`, `footer_cta`

## Style roles to preserve

Accent, Surface, Text, Pill fill, Pill text, Neon glow, Gradient start/end/direction 0–360°, finishes, shapes, layouts (stack / two-column / icon-row), collapsible shell, transparency/opacity.

## Inventory maintenance

Update this file as archaeology finds more Git history / deleted controls. Each capability needs: name, V1 path, ranges, persistence, preview, public runtime, fusion equivalent, PO decision, test, local proof.
