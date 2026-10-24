# Slice 1 desktop acceptance and source baseline — October 23, 2026

## Product Owner decision

Rich explicitly accepted Frame and Page Truth and **Slice 1 desktop interaction quality** in the current conversation. This supersedes the earlier OPEN / NOT ACCEPTED desktop status in historical reports. Acceptance is a Product Owner decision, not inferred from automated tests.

Physical touch, real mobile software keyboard/IME, any explicitly unverified modifier interactions, exact comparison with the separately requested but unavailable reference image, and other documented device/release checks remain open at their respective gates. Production hash verification remains **BLOCKED**. Neither desktop acceptance nor this source handoff authorizes staging, publishing, production changes or deployment.

The accepted local fixture remains `http://127.0.0.1:3050/dashboard/card/edit?experience=cmvlqtmjb01fodf9kz8q2eml7`. Preserve it for review; Slice 2 uses a separate unpublished local fixture.

## Source baseline preparation

Repository: `TapMagic/Tap-Connect-Studio`. Existing development branch: `codex/studio-reconstitution-slice-1`. Starting HEAD: `59f76cc0d1e1569958953cf9711df6aab14f13d4`. No branch switch, reset, history rewrite, merge or deployment.

The accepted canonical geometry, parent/clipboard, group, selection, pointer/keyboard, frame diagnostics, Inspector and renderer source changes are included as ordinary source files, with their focused tests and existing acceptance fixture. Earlier source patches remain historical evidence; they are not a substitute for this integrated baseline.

Unrelated Experience Library/family classification, discovery labels, navigation, existing map proof images, planning WIP, generated acceptance output, local TypeScript output-directory additions and pnpm files are excluded and preserved in the working tree. The committed npm lockfile remains the dependency authority.

Verification uses a clean export of the committed starting tree overlaid only with the intended source files, without local environment files or unrelated WIP. Results and reproduction instructions will be appended before handoff.

## Separate high-priority defect

[Issue #1 — Experience cloning / empty native-page projection](https://github.com/TapMagic/Tap-Connect-Studio/issues/1) tracks the reusable demo workflow defect. The canonical page versus legacy root projection mismatch is a demonstrated symptom; its precise normalization stage remains to be traced. No cloning fix is included in this slice.

## Slice 2 authorization

After the source baseline is verified and synchronized, Rich authorizes the previously approved **Text Editing Truth** scope and B1 shared Text transaction semantics / B2 rendered Text bounds reconciliation. The binding requirements in the closure/readiness report remain applicable. Manual Canvas and Inspector editing must share canonical commands/history and exact source content; case transforms are presentation-only. Future tApIt consumes the same authorities without speculative AI implementation.

No font-browser expansion, unrelated typography, responsive authoring, Surface redesign, business-domain work, staging or production deployment is authorized. Slice 2 still requires its own evidence and Product Owner review.

## Integrated verification results

- Focused geometry/clipboard/group/interaction/Curated suite: **135 passed, 0 failed** from the isolated source export.
- Wider Studio + parent-authority suite: **510 passed, 1 failed**. The failure is the historical Cabinet Noir handoff-byte test requiring untracked `tmp/Cabinet Noir v1/Cabinet_Noir_Cody_Handoff` source assets. It is not a passing check; public asset/runtime assertions otherwise passed. Reproduction of that source-handoff check requires the original asset package.
- Production build: **PASS**, `DATABASE_URL=<documented local development database> NEXT_TELEMETRY_DISABLED=1 npm run build -- --webpack`; Prisma client generation, optimized compilation, TypeScript and all 100 static pages completed. No database migration or deployment. Initial sandbox attempt could not resolve Google Fonts; retry with approved network access succeeded.
- Standalone `tsc --noEmit`: **PASS** in the isolated export.
- Existing installed dependencies were reused through a symlink; the committed `package-lock.json` supplies the clean-install dependency specification. A fresh `npm ci` was not performed. The build had no local environment files or production credentials.
- Source SHA-256 manifest and logs: [verification evidence](proofs/slice1-source-baseline-2026-10-23/). All unrelated input WIP files remain byte-identical.

To reproduce, check out the baseline commit in a separate directory, run `npm ci`, set only local development/build environment, run the ten focused test files listed in the focused log / prior Frame and Page Truth report, then `npm run build -- --webpack`. No `.next-*`, environment files or database content form part of the source baseline. The desktop fixture and earlier native screenshots remain available through the Frame and Page Truth report.
