# Tap Trace

Result: **CONDITIONALLY CERTIFIED** — runtime and attribution passed; screenshot/recording evidence is unavailable.

Two real `GET /t/54872e3fd3e0c69446df?public=1` requests traversed the public resolver and produced two `TapEvent` rows. One was attributed to the scheduled Campaign and one to the Group-default primary Campaign. `DeviceSlot.totalTapCount` became 2 and `lastTappedAt` advanced.

`POST /api/tap/click` with action `certification_cta`, `blockId=cert-action`, and exact Business/Device/Campaign IDs returned `{success:true}` and produced a `ClickEvent` row with the same attribution.

`GET /dashboard/analytics` visibly rendered Total taps = 2 and `[V1] Certification Device` = 2 taps (raw HTML text is stored). Models: `TapEvent`, `ClickEvent`, `DeviceSlot`; code: `app/t/[deviceCode]/page.tsx`, `lib/services/devices.ts:logTapEvent`, `app/api/tap/click/route.ts`, `app/dashboard/analytics/page.tsx`.

Relationship proven: DeviceSlot `cms9tipi80006me9kwp0wyz93` → Group/schedule resolver → Campaign ID → TapEvent; supported CTA block → ClickEvent. Card fallback attribution has Business/Device context but no immutable Card revision ID.

Evidence:

- `/private/tmp/tapconnect-v1-cert-evidence/http/{public-scheduled,public-group-default,click-event,analytics}.*`
- `/private/tmp/tapconnect-v1-cert-evidence/db/final-state.txt`

Known limitations: Owner naming is Analytics rather than Tap Trace; deletion logic may null historical Campaign IDs; Card-revision attribution is absent.
