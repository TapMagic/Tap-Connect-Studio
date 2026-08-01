# Email

Result: **CONDITIONALLY CERTIFIED** — draft/Preview/safety behavior passed; screenshot/recording evidence is unavailable.

The primary Campaign save persisted:

```json
{"emailResponse":{"enabled":true,"subject":"V1 certified follow-up","body":"This response configuration persisted safely without sending."}}
```

`GET /dashboard/campaigns/cms9tipld0007me9kmd5vms80/email` returned 200 and visibly included “Email offer builder,” “Email settings,” the saved subject, and saved body, proving reload/Preview input. Storage authority is `Campaign.formSettings.emailResponse`; the builder is `components/campaign/email-builder.tsx`; save is `PATCH /api/campaigns/assign`.

A deliberately fake `nobody@example.invalid` request to `POST /api/email/send` was made with no Resend credentials. The request stopped before provider delivery with HTTP 503 and `{placeholder:true,feature:"branded_email"}`. No provider key was configured and no Email was sent.

Evidence:

- `/private/tmp/tapconnect-v1-cert-evidence/http/{campaign-primary-save,email-builder,email-send-blocked}.*`
- `/private/tmp/tapconnect-v1-cert-evidence/db/final-state.txt`

Known limitations: Email is Campaign-scoped JSON, not a first-class document/delivery authority; no Email schedule or durable outbound delivery history exists. Provider-block behavior is certified, not a live send.
