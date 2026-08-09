# Baseline → Final inventory diff (Badger continuation)

**Baseline SHA:** `b4d903c92884cff68d6122dc7cc8dff4942a0023`  
**Product work through:** continuation commits after `b4d903c` (Visual Plane, media cert storage, physical proofs)

## Intentional additions

| Change | Why |
| --- | --- |
| Shared `VisualPlaneStudio` for Page / Surface / Container | One Visual Plane authority, three independent targets |
| Container Background door + composition replace write path | Container kind changes must land (selection soft-fail bypass) |
| `data-media-asset-id` / `data-font-family` on composition nodes | Physical identity proof without evaluate mutation |
| Pattern tile `data-testid=surface-pattern-*` | Finite catalog exhaustion |
| Full Background pattern list (no silent 12-cap) | Finite library completeness |
| Local durable media under `TAPCONNECT_DEV_AUTH` / fixture | Production-style cert without R2 |
| Font browser `font-browser-search` / `font-browser-results` / `font-family-*` | Actual-face browser proof |
| Writing Assist naming (not Magic Write / TapBot) | Customer language |
| Semantic rail accents + decision doc | Orientation without rainbow noise |
| Safe SVG sanitize pipeline | Professional logos + hostile fixture proof |
| Physical e2e: visual-plane, media-direct, pattern-exhaustion, fonts, providers, chaos | Certification evidence |

## Intentional renames / label shifts

| Before | After |
| --- | --- |
| Magic Write (Host-facing) | Writing Assist / Write / Proofread |
| Quick patterns (12) | Patterns (N catalog) |

## External blockers (not inventory removals)

| Capability | Blocker |
| --- | --- |
| Real Writing Assist inference | No `OPENAI_API_KEY` in local cert env |
| Live Pexels/Logo.dev exhaust | Optional; fixture mode proves UI routes when keys absent |

## Removals

None intentional. No Host-facing capability was deleted to green tests.
