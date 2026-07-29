# Creative Studio Rescue

Branch: `tapconnect-creative-studio-rescue`  
Source (immutable): `replit-penthouse-finished-import` @ `f7457a48a3e41d271e6569f54b4b1cde12160821`

## Mission

Make the real Card authoring surface feel like a premium creative studio (Canva / Pages class) without replatforming.

## Laws

- EDIT selects
- PREVIEW activates (safe)
- PUBLIC behaves live
- One canvas · one compact tool rail · one contextual panel stack · one safety bar
- Green = forward action only (Save / Apply / Update Preview)

## What landed in this wave

### Interaction contract
- `lib/fusion/creative-studio/modes.ts`
- `TapConnectCard` `interactionMode` + capture-phase canvas selection in Edit
- In-editor Preview as customer via `CardAuthoringWorkspace` (`data-studio-mode`)

### Nested panels + typography
- `panel-stack.ts` + `ProfessionalTypographyPanel`
- Point sizing (`pt` UI → `px` CSS, documented 1pt = 4/3 px)
- Font catalog: 70+ OFL/Apache Google Fonts families, lazy CSS2 load

### Preview / QR
- Signed HMAC preview tokens (`lib/fusion/creative-studio/preview/tokens.ts`)
- Routes: `POST/PATCH /api/preview/card/session`, `POST /api/preview/card/revoke`
- Public draft surface: `/preview/card/[token]` (no Studio login)
- Localhost QR blocked with honest guidance
- Env: `NEXT_PUBLIC_PREVIEW_BASE_URL`, `PREVIEW_TOKEN_SECRET`, `PREVIEW_TOKEN_TTL_MINUTES`, `PREVIEW_RUNTIME_MODE`

### Wording
- Finish editing · Back to Card overview · Preview as customer · Draft Preview · Published Card

## Dependencies

| Package | Reason | License | Notes |
|---------|--------|---------|-------|
| `qrcode` (existing) | QR generation | MIT | Already in package.json — no new install |
| Google Fonts CSS2 | Lazy typeface load | OFL / Apache-2.0 per family | No npm font package; runtime CSS links |

No Vite / Express / parallel editor introduced.

## Startup

```bash
git checkout tapconnect-creative-studio-rescue
cp .env.example .env.local   # set PREVIEW_* and Clerk/DB as needed
npm run fusion:dev-db        # if needed
npm run dev
# Editor: /dashboard/card/edit
```

For real-phone QR: set `NEXT_PUBLIC_PREVIEW_BASE_URL` to a LAN or hosted URL the phone can reach.

## Classification

**IMPLEMENTED BUT NOT OWNER-READY**

Core contract, fonts, nested type panel, preview tokens, and wording are in place. Remaining for Owner-ready: full nested Button panel drill-ins, config-wide undo labels, polished Focus/chrome collapse UX, complete acceptance walkthrough proof artifacts, and e2e coverage expansion.
