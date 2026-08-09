# Writing Assist — external blocker

## Classification

**EXTERNALLY BLOCKED** for real model inference in the local certification environment.

## Evidence

- Route: `POST /api/creative/magic-write` → `runMagicWrite` (`lib/services/magic-write.ts`)
- When ready: OpenAI `chat.completions` with `OPENAI_API_KEY` / `OPENAI_KEY` (server-side only)
- When missing: `{ ok: false, code: "not_configured" }` HTTP 503
- Local `.env.local` at Badger continuation: `GOOGLE_FONTS_API_KEY` present; **no** `OPENAI_API_KEY`

## Owner UI (still real)

- Customer-facing labels: **Writing Assist** / **Write** / **Proofread**
- Apply / Try again / Cancel remain Owner-controlled
- Do not claim fixture/mock as real AI

## Unblock

Add server-side `OPENAI_API_KEY` (or alias `OPENAI_KEY`) to the certification/runtime environment. Never expose the key client-side.
