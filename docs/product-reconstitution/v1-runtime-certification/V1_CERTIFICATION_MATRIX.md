# V1 Certification Matrix

| Requirement | Route/API | Model/table evidence | Result | Remaining condition/limitation |
|---|---|---|---|---|
| Card create/open | `/onboarding`, `/api/business`, `/dashboard/card` | Business, BrandKit, Location created | **CONDITIONALLY CERTIFIED** | screenshots/recording blocked |
| Card info/appearance/actions Save/reload | `PATCH /api/brand`, repeated `/dashboard/card` | exact `BrandKit.tapCard`, colors, socialLinks | **CONDITIONALLY CERTIFIED** | direct Save is public |
| Card public result | `/t/54872e3fd3e0c69446df` | resolver reads `BrandKit.tapCard` fallback | **CONDITIONALLY CERTIFIED** | no Card revision attribution |
| Campaign create/edit/Save | `/api/campaigns`, PATCH `/api/campaigns/assign` | Campaign blocks/theme/form JSON | **CONDITIONALLY CERTIFIED** | endpoint overload |
| Campaign status/assign/activate | POST `/api/campaigns/assign` | active DeviceAssignment; Campaign LIVE; Device ACTIVE | **CONDITIONALLY CERTIFIED** | assignment mutates lifecycle |
| Device scheduled Campaign | `/api/schedule`, public `/t` | ScheduleRule + scheduled Campaign | **CONDITIONALLY CERTIFIED** | DRAFT is playable |
| Group scheduled Campaign | `/api/groups/**`, resolver service | Group/slot/default + before/during/after output | **CONDITIONALLY CERTIFIED** | runtime FK ensure noise |
| Public tap evidence | repeated public `/t` | two TapEvent rows; Device count 2 | **CONDITIONALLY CERTIFIED** | screenshots blocked |
| Supported action | `/api/tap/click` | attributed ClickEvent | **CONDITIONALLY CERTIFIED** | event API accepts optional IDs |
| Owner analytics | `/dashboard/analytics` | visible total/device count matches DB | **CONDITIONALLY CERTIFIED** | no first-class trace list |
| Email edit/save/reload/Preview | Campaign save + `/campaigns/[id]/email` | `formSettings.emailResponse` | **CONDITIONALLY CERTIFIED** | Campaign-scoped only |
| Safe send path | `/api/email/send` | HTTP 503 provider placeholder; no delivery row | **CONDITIONALLY CERTIFIED** | live send intentionally not tested |
| V1 automated suite | none | no committed V1 test suite | **NOT PRESENT** | runtime evidence used |
| Screenshot/recording bundle | in-app Browser | no browser instance available | **BLOCKED** | required for unconditional gate |

Overall: **V1 RUNTIME BASELINE CONDITIONALLY CERTIFIED — HUMAN DECISION REQUIRED**.
