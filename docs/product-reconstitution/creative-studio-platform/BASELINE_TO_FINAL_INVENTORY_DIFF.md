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

## Runtime inventory comparison (physical)

Architectural notes above are not sufficient alone. Physical runtime inventories were captured with the same Owner-sim scrape (normal disclosures opened; disclosure state not mutated for cheat):

| Field | Value |
| --- | --- |
| Baseline SHA | `b4d903c92884cff68d6122dc7cc8dff4942a0023` |
| Baseline unique controls | **398** |
| Final unique controls | **416** |
| Unexplained drift | **0** |
| Gate | `e2e/runtime-inventory-gate.spec.ts` (`OWNER_SIM_INVENTORY_GATE=1`) |
| Explanations | `RUNTIME_INVENTORY_DRIFT_EXPLANATIONS.json` |
| Diff artifact | `tmp/owner-sim-physical-evidence/_manifest/runtime-inventory-baseline-final-diff.json` |

Explained drift families: Visual Plane kinds + pattern catalog, Write / Writing Assist renames (was AI Assist / Magic Write), removal of legacy background swatch/gradient starters, and transient recovery-dialog scrape variance.
