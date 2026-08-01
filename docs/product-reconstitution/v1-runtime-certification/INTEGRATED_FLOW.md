# Integrated Flow

Result: **CONDITIONALLY CERTIFIED** — the integrated data/runtime chain passed; screenshot/recording evidence is unavailable.

The executed chain was:

`DeviceSlot 54872e3fd3e0c69446df` → Group first / device schedule second / active assignment third → primary or scheduled `Campaign` → public renderer → `TapEvent` → CTA `ClickEvent` → Campaign-owned `formSettings.emailResponse` visible in the Email builder → provider-blocked Email command.

The Card remained the Business public-presentation authority through `BrandKit.tapCard`, projected by a supported Campaign `digital_card` block. Campaign Group default selected the primary Campaign outside the slot; the Group slot selected the scheduled Campaign inside it. Tap rows carry Device, Business, and resolved Campaign. The supported action carried the same identifiers plus block ID. Email was related exactly as V1 implemented it—inside the primary Campaign—not invented as a separate relationship.

Cross-checks:

- public route changed selected Campaign according to the real resolver;
- both public resolutions incremented the same DeviceSlot and created separately attributed taps;
- Analytics agreed with the DB count;
- the Campaign row retained Email content through activation and public taps;
- the fake-address send path stopped at provider readiness.

Evidence index: `/private/tmp/tapconnect-v1-cert-evidence/http`, resolver transcript `/private/tmp/tapconnect-v1-cert-evidence/logs/schedule-boundary-resolver.jsonl`, consolidated rows `/private/tmp/tapconnect-v1-cert-evidence/db/final-state.txt`.
