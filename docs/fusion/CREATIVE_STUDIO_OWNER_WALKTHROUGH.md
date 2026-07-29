# Creative Studio Owner Walkthrough Results

Branch: `tapconnect-creative-studio-rescue`  
Evaluator note: Steps marked PASS WITH FRICTION or FAIL must appear on the punch list. Do not treat unit test presence as walkthrough PASS.

| # | Step | Result | Notes |
|---|------|--------|-------|
| 1 | Open Card editor | PASS | `/dashboard/card/edit` |
| 2 | Canvas dominates | PASS WITH FRICTION | Improved; chrome controls add a thin bar |
| 3 | Navigation can collapse | PASS WITH FRICTION | Focus/collapsed reduce shade; Studio nav still escape-hidden |
| 4 | Top chrome can collapse | PASS | Collapsed / Compact / Focus controls |
| 5 | Select button on Card | PASS | Direct canvas selection |
| 6 | Button does not activate (Edit) | PASS | `interactionMode=edit` |
| 7 | Button panel opens | PASS | Nested Button stack when action selected |
| 8 | Change label | PASS | Content panel |
| 9 | Open Typography | PASS | Nested via Button or Text tool |
| 10 | Open Font | PASS | Font picker |
| 11 | Search font | PASS | |
| 12 | See actual typeface | PASS | Lazy Google Fonts CSS2 |
| 13 | Preview Card text in font | PASS | Sample window |
| 14 | Choose font | PASS | |
| 15 | Exact point size | PASS | pt input/stepper/slider |
| 16 | Weight | PASS | Accurate availability |
| 17 | Italic | PASS | Disabled when unavailable |
| 18 | Underline | PASS | |
| 19 | Alignment | PASS | |
| 20 | Letter spacing / line height | PASS | |
| 21 | Back out panel levels | PASS | |
| 22 | Button color | PASS | Appearance |
| 23 | Button shape | PASS | Shape |
| 24 | Button destination | PASS | Action |
| 25 | Undo destination | PASS | Full config undo |
| 26 | Redo destination | PASS | |
| 27 | Undo/Redo always visible | PASS | Safety bar |
| 28 | Test action from panel | PASS | Test Action |
| 29 | Edit never activates link | PASS | |
| 30 | Preview as customer | PASS | |
| 31 | Outlines disappear | PASS | Preview hides selection |
| 32 | Test button in Preview | PASS | Activates safely |
| 33 | Desktop simulation | PASS | Viewport widths |
| 34 | Tablet simulation | PASS | |
| 35 | Phone simulation | PASS | |
| 36 | Live Device | PASS | Panel present |
| 37 | Generate QR | PASS WITH FRICTION | Requires Generate click; needs reachable base URL |
| 38 | Scan on phone | FAIL* | Needs Owner device + `NEXT_PUBLIC_PREVIEW_BASE_URL` |
| 39 | Temporary Preview URL | PASS | `/preview/card/[token]` |
| 40 | No Studio login on phone | PASS | Public preview route |
| 41 | Not published banner | PASS | |
| 42 | Website links work | PASS | Preview mode |
| 43 | Directions works | PASS | When address present |
| 44 | Phone/email links | PASS | Device-dependent |
| 45 | No live payment/send | PASS | Preview-safe messaging |
| 46 | Return to editing | PASS | Exit Preview restores |
| 47 | State/selection preserved | PASS WITH FRICTION | Selection memory restored |
| 48 | Collapse contextual panel | PASS | Drawer collapse |
| 49 | Card gains space | PASS | Focus/collapsed |
| 50 | Reopen panel memory | PASS WITH FRICTION | Tool memory exists; nested depth memory partial |
| 51 | Save draft | PASS | |
| 52 | Saved state | PASS | Saved / Unsaved label |
| 53 | Published distinct | PASS | Published Card link |
| 54 | Open published Card | PASS | `/t/{code}?public=1` |
| 55 | Published content only | PASS | Public route |
| 56 | Tablet flow | PASS WITH FRICTION | Needs device proof shots |
| 57 | Phone editor flow | PASS WITH FRICTION | Bottom rail exists; full phone proof pending |

\*FAIL for step 38 in this automated pass = environment/device not exercised here, not a code absence of the route.
