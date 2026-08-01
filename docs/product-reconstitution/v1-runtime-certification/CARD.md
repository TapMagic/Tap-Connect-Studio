# Card

Result: **CONDITIONALLY CERTIFIED** — runtime behavior passed; screenshot/recording evidence is unavailable.

## Executed journey

1. `GET /onboarding` visibly rendered “Set up your business,” Business name, Website, Phone, and Create.
2. `POST /api/business` created Business `cms9tg6cw0001me9kbmc7rdng`, BrandKit `cms9tg6d00003me9kd9pre54d`, and Location `cms9tg6d20004me9klcnbm66u` for the local dev Owner.
3. `GET /dashboard/card` established the before state.
4. `PATCH /api/brand` changed Business contact fields, Brand colors, and `tapCard` sections: identity, call, and website actions.
5. A later `GET /dashboard/card` visibly contained “V1 Certification Café,” “Certified Card Persistence,” “Call Certification Line,” and “Open Certification Site.”
6. For direct public proof, the fixture was returned to an ordinary active assignment and the Campaign was saved with V1's supported enabled `digital_card` block. `GET /t/54872e3fd3e0c69446df?public=1` visibly rendered “Public V1 Card,” the saved Card identity, “Certified Card Persistence,” “Call Certification Line,” and “Open Certification Site.” This proves the actual V1 public composition: a Campaign page projects the Business Card; an unassigned Tap Point instead uses the Brand end experience, not a standalone Card fallback.

## Persistence and authority

`BrandKit.tapCard` is both the saved and public Card authority. Final SQL shows `#123456` primary, `#ff5500` accent, the three exact sections/actions, and persisted `socialLinks`; Business email/website/phone also persisted. Exact models: `Business`, `BrandKit`, `DeviceSlot`.

Code path: `app/dashboard/card/page.tsx` → `components/card/tap-card-builder.tsx` → `app/api/brand/route.ts` → `BrandKit.tapCard`; public `app/t/[deviceCode]/page.tsx` → `components/tap/campaign-renderer.tsx` (`digital_card`) → `ContactCardSurface`/`TapConnectCard`.

Evidence:

- `/private/tmp/tapconnect-v1-cert-evidence/http/{onboarding-before,business-create,card-before,brand-before,brand-save,card-after,card-public-campaign-save,card-public-campaign-assign,card-public-result}.*`
- `/private/tmp/tapconnect-v1-cert-evidence/db/final-state.txt`

Known limitation: V1 Save directly changes the Card object consumed by public Campaign composition; it has no separate ordinary draft, immutable publication, or rollback contract. A Tap Point without an eligible Campaign renders an end experience rather than the Card alone. The UI result and DB are proven, but required screenshots/recording are blocked because no in-app browser was available.
