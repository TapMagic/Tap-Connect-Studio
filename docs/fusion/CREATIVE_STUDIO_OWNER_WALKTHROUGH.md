# Creative Studio Owner Walkthrough Results

Branch: `tapconnect-creative-studio-rescue` (clean line from `ff8c6c1`)  
**Classification:** `IMPLEMENTATION IN PROGRESS`

Evaluator note: Unit/e2e PASS is not a substitute for physical Live Device PASS.

| # | Step | Result | Notes |
|---|------|--------|-------|
| 1 | Open Card editor | PASS | Related e2e green |
| 2 | Canvas dominates | PASS WITH FRICTION | Floating chrome overlay |
| 3 | Navigation can collapse | PASS WITH FRICTION | |
| 4 | Top chrome can collapse | PASS | Chrome states e2e |
| 5 | Select button on Card | PASS | Outline/canvas |
| 6 | Button does not activate (Edit) | PASS | |
| 7 | Button panel opens | PASS | Nested stack e2e |
| 8–28 | Nested Text/Button edit, fonts, undo, test action | PASS WITH FRICTION | Covered by unit + e2e; full manual font compare shot partial |
| 29 | Edit never activates link | PASS | |
| 30–35 | Preview + viewports | PASS | creative-studio e2e |
| 36 | Live Device panel | PASS WITH FRICTION | Panel present |
| 37 | Generate QR | PASS WITH FRICTION | API session create ok on LAN |
| 38 | Scan on phone | FAIL | Physical device not exercised |
| 39–45 | Preview URL safety / no login / not published / no live send | PASS WITH FRICTION | LAN HTTP phone-sim + token proofs; not camera-proven |
| 46–47 | Return to editing / state | PASS | e2e |
| 48–57 | Collapse, save, published distinct, responsive | PASS WITH FRICTION | Device proof shots partial |

## Companion automation

- Loop regression tests PASS
- Related Playwright 26/26 PASS including J1 ID-001, ID-005, responsive, a11y
- Physical phone: still open on punch list P2
