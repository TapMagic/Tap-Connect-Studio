# Campaigns

Result: **CONDITIONALLY CERTIFIED** — runtime behavior passed; screenshot/recording evidence is unavailable.

## Executed journey

- `POST /api/campaigns` with `product-story` created `cms9tipld0007me9kmd5vms80` in `DRAFT`.
- `PATCH /api/campaigns/assign` saved the renamed title, two exact blocks, theme overrides, and Email response configuration.
- `POST /api/devices` created DeviceSlot `cms9tipi80006me9kwp0wyz93` / code `54872e3fd3e0c69446df`.
- `POST /api/campaigns/assign` created active assignment `cms9tjk9w0009me9ksehyjzd2`, activated the DeviceSlot, and transitioned the Campaign to `LIVE`.
- Public resolution later rendered “Certification Heading,” “V1 primary campaign persisted,” and “Open certified destination” when the Group default selected this Campaign.

Final tables: `Campaign`, `DeviceAssignment`, `DeviceSlot`. The stored Campaign retained `contentBlocks`, `themeOverrides`, and `formSettings.emailResponse` after subsequent routes and reloads.

Code path: `app/api/campaigns/route.ts` → `createCampaignFromTemplate`; `components/workbench/campaign-editor.tsx`; `app/api/campaigns/assign/route.ts` → `assignCampaignToDevice`; public `CampaignRenderer`.

Evidence:

- `/private/tmp/tapconnect-v1-cert-evidence/http/campaign-primary-{create,save,assign}.*`
- `/private/tmp/tapconnect-v1-cert-evidence/http/public-group-default.html`
- `/private/tmp/tapconnect-v1-cert-evidence/db/final-state.txt`

Known limitations: content save and assignment share the misleading `campaigns/assign` endpoint; assignment changes status to `LIVE`; schedule resolver policy treats `DRAFT` as playable. No Campaign/provider send was invoked.
