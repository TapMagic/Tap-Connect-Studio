# Magic Write Selection Scope

**Client:** Text library Magic Write panel (`magic-write-panel`)  
**API:** `POST /api/creative/magic-write`  
**Service:** `lib/services/magic-write.ts` + `lib/fusion/creative-studio/magic-write.ts`  
**Provider:** existing OpenAI integration (`isAiReady` / `OPENAI_API_KEY`)

## Scope

- Single Text selection → one target
- Group / multi-selection → `textDescendantsInScope` collects all relevant Text nodes
- Default: rewrite each block separately (`coordinated` optional)

## UX

Operations: Rewrite, Shorten, Expand, Improve clarity, Change tone, Fix grammar.

Shows original + proposed per target; Apply / Cancel. Apply uses `patchCompositionNode` (Undoable).

## Failure states

Honest responses — never silent:

- `not_configured` (503) — provider not configured
- `provider_error` (502) — empty/invalid/upstream failure
- `empty` / `invalid` (400)

UI: `data-testid="magic-write-error"`.
