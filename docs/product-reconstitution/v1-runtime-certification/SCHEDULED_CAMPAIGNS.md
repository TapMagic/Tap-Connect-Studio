# Scheduled Campaigns

Result: **CONDITIONALLY CERTIFIED** — deterministic runtime behavior passed; screenshot/recording evidence is unavailable.

## Device schedule

`POST /api/schedule` created enabled rule `cms9tjkc6000ame9kzohfbj57` for all seven days, `00:00–23:59`, priority 100, selecting scheduled Campaign `cms9tipm30008me9kmgmyp6mq`. A real public request rendered “Scheduled Certification” and “V1 scheduled campaign active in test window,” overriding the active default assignment. Direct `resolveScheduledCampaign` at `2026-07-31T16:30:00Z` returned that Campaign and rule.

## Group schedule

`POST /api/groups`, Group PATCH, slot POST, and Group PUT created `cms9tk05j000cme9kjf6evn1m`, set the primary Campaign as default, created the scheduled Campaign slot `12:00–13:00 America/New_York`, and attached the DeviceSlot. Deterministic real resolver calls returned:

| Instant | Local | Result |
|---|---|---|
| `2026-07-31T15:00:00Z` | 11:00 | default — primary Campaign |
| `2026-07-31T16:30:00Z` | 12:30 | slot — scheduled Campaign |
| `2026-07-31T18:00:00Z` | 14:00 | default — primary Campaign |

Group has precedence over per-device rule, then the active assignment. Exact code: `lib/services/devices.ts:getDeviceWithActiveCampaign`, `lib/services/schedule.ts:{resolveGroupCampaign,resolveScheduledCampaign}`, `app/api/schedule/route.ts`, `app/api/groups/**`. Exact tables: `ScheduleRule`, `CampaignGroup`, `CampaignGroupSlot`, `DeviceAssignment`.

Evidence:

- `/private/tmp/tapconnect-v1-cert-evidence/http/{schedule-create,public-scheduled,group-create,group-configure,group-slot-create,group-device-attach,public-group-default}.*`
- `/private/tmp/tapconnect-v1-cert-evidence/logs/schedule-boundary-resolver.jsonl`
- `/private/tmp/tapconnect-v1-cert-evidence/db/final-state.txt`

Known limitations: the resolver considers `DRAFT`, `READY`, `SCHEDULED`, and `LIVE` playable. Runtime `ensure*Table` helpers repeatedly attempt existing foreign keys and log PostgreSQL `42710`; resolution still completes. Device rules use process time helpers while Groups apply an explicit Business/Group timezone.
