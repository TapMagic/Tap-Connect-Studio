# Slice 2 — Text Editing Truth implementation and review candidate

## Authority and status

Rich accepted Slice 1 **desktop interaction quality** on October 23, 2026, explicitly leaving physical-touch and other unverified release gates open. The integrated, pushed Slice 1 baseline is [`3bda89b502e629e867cd5daa6b13050a0f4bcb3c`](https://github.com/TapMagic/Tap-Connect-Studio/commit/3bda89b502e629e867cd5daa6b13050a0f4bcb3c), on `codex/studio-reconstitution-slice-1` in `TapMagic/Tap-Connect-Studio`. [Acceptance and verification record](SLICE1_DESKTOP_ACCEPTANCE_SOURCE_BASELINE_2026-10-23.md).

After that baseline was built, tested, pushed and independently checked on GitHub, work proceeded under the bounded Text Editing Truth approval. This is a **Slice 2 review candidate**, not Product Owner acceptance or release authorization. No staging/production deployment, publication, Access, credentials, permanent QR, membership, commerce or AI implementation changed. Production hash verification remains **BLOCKED**.

## Findings and corrections

| Finding | Correction through existing authorities |
| --- | --- |
| Canvas contenteditable read rendered `innerText`; presentation case, whitespace and browser markup could affect persisted source. Inspector had a separate transaction lifecycle. | Canvas and Inspector use `StudioTextEntry`, a native plain-text textarea, and `createTextEditTransaction`, a lifecycle adapter to existing preview/commit/cancel commands. Exact source remains in `props.text`; letter case remains `props.textTransform` in the shared renderer. No new history or document engine. |
| Selection updated on pointer-down, making the following click look like a second click and unexpectedly enter text editing. | Single click selects. Double-click, Enter on the selected Text, or the visible Edit text control enters caret editing. Done, blur or Cmd/Ctrl+Enter completes; Escape/Cancel restores the transaction source. |
| A completed/cancelled session could receive blur/cleanup again. Input and document undo need distinct focus ownership. | The adapter closes once, ignores stale events and emits no operation for an unchanged edit. Native textarea owns caret, selection, deletion, paste and native Undo/Redo while focused; completion contributes one existing Studio history entry. Composition defers preview until composition-end. |
| Auto inherited retained minimum height, fixed/flow wrappers could compete with Text's own height, and the inline text imposed its own tight line height. | One `studioTextBoxStyle` policy governs Auto/Minimum/Fixed in the shared renderer. Auto uses actual content; Minimum honors its floor; Fixed retains explicit height and existing visible/clip/scroll overflow. Authored line height is used. |
| Text visual diagnostics used Placement dimensions even when content grew beyond them. Content extent could include manipulation controls. | ResizeObserver measures the shared Text box and visible overflow; diagnostics explicitly label measured Text bounds plus an estimated effect envelope. Content extent observes Text rather than Done/Cancel controls. Measurements never persist back into authored placement. |
| Explicit vertical Layered resizing of Fixed/Minimum Text could disagree with its Text height property. | The existing `applyLayeredResize` command updates the applicable Text height property in that same operation. Auto content growth remains observational and does not rewrite geometry. |

Native editing does not rewrite textarea value during an active session. React `defaultValue` is omitted so React input restoration does not rewrite its backing text node. Early native Redo attempts failed; the final test passed after this change and explicit native focus correction. The evidence does **not** isolate all early failures to one browser cause: AX clicks sometimes failed to focus the visible input, and rapid HMR also interrupted tests. Those attempts are retained as failures, not passing evidence.

## Exact source changes

- `components/fusion/creative-studio/studio-text-entry.tsx`: shared native editor, focus/caret visibility, IME lifecycle, 44px Done/Cancel controls.
- `lib/fusion/creative-studio/platform/text-edit-transaction.ts`: source-preserving preview/commit/cancel adapter; no history storage.
- `components/fusion/creative-studio/creative-composition-canvas.tsx`: thin Text editing adapter, deliberate entry, shared height rendering and measurement observers.
- `components/fusion/card/reconstitution/studio-composition-inspector.tsx`: shared editor and canonical history callbacks, presentation-case controls, truthful diagnostic wording.
- `lib/fusion/creative-studio/platform/text-authoring.ts`: shared height policy.
- `lib/fusion/creative-studio/platform/layered-region.ts`: explicit resize reconciles existing Fixed/Minimum height property.
- `components/fusion/creative-studio/studio-frame-diagnostics.tsx`: measured renderer diagnostics, without authoring mutations.
- `components/fusion/creative-studio/use-layered-parent-size.ts`: actual Text content extent and clipping.
- `lib/fusion/creative-studio/__tests__/text-editing-truth.test.ts`: seven source/transaction/height/geometry regressions.
- `e2e/fixtures/studio-text-editing-truth.ts`: deterministic Flow and Layered fixture composition, including a padded nested Layered Container.

## Verification

Final source was overlaid onto an isolated export of the accepted baseline, excluding unrelated application WIP and all environment files. The installed dependency directory was reused; a fresh `npm ci` was not run. The committed npm lockfile is the dependency specification.

- **107/107 focused tests passed**: Text authoring/truth, familiar interactions, Frame and Page Truth, Layered precision, editor/group semantics, clipboard, Group authority, Curated extension and parent authority.
- **517 passed / 1 failed** in the broader Studio and parent-authority suite. The same baseline Cabinet Noir handoff-byte test requires an untracked original asset package under `tmp/Cabinet Noir v1/Cabinet_Noir_Cody_Handoff`. This remains a failed reproducibility check, not a pass.
- **Production build passed**: Prisma client generation, optimized webpack compilation, TypeScript and 100 static pages. Build environment used only the explicit isolated local development database, with no migrations. Existing Google Fonts build dependencies required network access.
- Standalone TypeScript passed. New shared editor, diagnostics and transaction files passed ESLint. Full touched-file lint retains an independently confirmed baseline `setState`-in-effect finding in `use-layered-parent-size.ts` and existing Canvas warnings; no blanket lint-pass claim.
- Seven new tests cover exact Unicode/whitespace/source, one canonical completed edit and Undo/Redo, Escape followed by blur, no-op/native Undo back to source, CRLF, stale cleanup, height modes and geometry reconciliation.

[Logs, source manifest, preservation hashes and native observations](proofs/text-editing-truth-2026-10-23/).

Reproduce focused tests with `node --import tsx --test` and these files:

```
lib/fusion/creative-studio/__tests__/studio-text-authoring.test.ts
lib/fusion/creative-studio/__tests__/text-editing-truth.test.ts
lib/fusion/creative-studio/__tests__/familiar-interactions.test.ts
lib/fusion/creative-studio/__tests__/frame-page-truth.test.ts
lib/fusion/creative-studio/__tests__/layered-precision-selection-truth.test.ts
lib/fusion/creative-studio/__tests__/editor-context-and-group-semantics.test.ts
lib/fusion/creative-studio/__tests__/composition-clipboard.test.ts
lib/fusion/creative-studio/__tests__/group-authority.test.ts
lib/fusion/creative-studio/__tests__/curated-family-neutral-extension.test.ts
lib/fusion/card/__tests__/composition-parent-authority.test.ts
```

Broader suite: `node --import tsx --test lib/fusion/creative-studio/__tests__/*.test.ts lib/fusion/card/__tests__/composition-parent-authority.test.ts`.
Build: `NEXT_TELEMETRY_DISABLED=1 npm run build -- --webpack` with the documented local development database environment only.

## Native interaction and visual evidence

Chrome native controls exercised direct entry, multiline paste, Cancel/Escape, committed Undo/Redo, presentation-only uppercase, Inspector edits, rotated Layered Text, padded nested Text, height modes, overflow, save/reload and Preview. At a 390px viewport, direct editing and Inspector remained accessible, Done/Cancel measured 44px high, and ArrowLeft moved the caret without moving the object.

Measured examples:

- Auto text shrank to about **37.6px** for short content; initial multiline Auto was **80.8px**, Minimum **96px**, Fixed **48px**.
- Layered Auto expanded to **145.6px** with five lines while authored placement height remained **80px** (`0.08 × 1000`). Its visual diagnostic measured approximately **146px**. Rotation was 15°; no content-induced placement mutation.
- Fixed stayed **48px** with visible, clipped and scrollable overflow configurations.
- Final native replacement `Exact  tabs\t🙂\nNative redo\n` survived native Undo/Redo, one completed Studio Undo/Redo, autosave/reload and Preview. An attempted final Save click was disabled because autosave had already completed; it is recorded as not executed, with reload/Preview used for persistence evidence.
- Accepted Slice 1 fixture remained revision **49**, draft SHA-256 `44a7a26da7644d78eb6361b91808d5aa4951c6b4f2ce1711edfe6f60ed52deeb`, byte-identical. The separate unpublished Text fixture reached revision **26**. All **36 unrelated input WIP files** remained byte-identical.

Images are candidate interaction states, not a fabricated pre-implementation comparison:

1. [Selected before editing](proofs/text-editing-truth-2026-10-23/01-selected-before-edit.png)
2. [Direct source under uppercase presentation](proofs/text-editing-truth-2026-10-23/02-direct-source-under-uppercase.png)
3. [Rotated Layered measured bounds](proofs/text-editing-truth-2026-10-23/03-layered-rotated-measured-visual.png)
4. [Layered Preview](proofs/text-editing-truth-2026-10-23/04-layered-preview.png)
5. [390px direct editing](proofs/text-editing-truth-2026-10-23/05-phone-direct-edit.png)
6. [390px Inspector](proofs/text-editing-truth-2026-10-23/06-phone-inspector.png)
7. [Native paste Redo](proofs/text-editing-truth-2026-10-23/07-native-paste-redo.png)
8. [Final saved Preview](proofs/text-editing-truth-2026-10-23/08-final-saved-preview.png)

## Hands-on fixture and open gates

Open [Text Editing Truth locally](http://127.0.0.1:3050/dashboard/card/edit?experience=cmvlsjkq7093adf9k2mzgqf7i). Use the **Flow / Layered** page buttons. Single-click Auto, then Enter or Edit text. Paste text with blank lines; try native Undo/Redo, Escape, Done, then Studio Undo/Redo. Compare Auto, Minimum and Fixed; edit the nested Container's Text. Use Edit for Inspector, Preview for output, and a 390px viewport for narrow editing.

The fixture composition is reproducible from the checked-in TypeScript fixture. Creating the empty local Experience succeeded through native controls, but adding content to its empty projection did not; only this newly created unpublished local fixture was seeded through the explicit local database. This is **not** passing evidence for native first-time creation or cloning. [High-priority issue #1](https://github.com/TapMagic/Tap-Connect-Studio/issues/1) separately tracks cloning/empty projection for reusable demos; no fix is bundled here.

Open release gates: real physical touch, mobile OS keyboard/caret behavior, actual device IME composition, assistive-technology validation and cross-browser/native history testing. Browser viewport emulation is not device acceptance. Exact reference-image comparison remains unavailable. Curved Text retains its existing Inspector-only editing path. Visual diagnostics measure the Text box and overflow, not exact painted glyph pixels; shadows/effects remain estimated.

Native text controls expose LF. An untouched source is byte-preserved, including mixed endings; edited uniform CRLF sources retain CRLF convention. A genuinely edited mixed-line-ending source follows native LF normalization. No trimming, case rewriting, Unicode normalization or whitespace collapsing is applied to stored content.

Future typography, AI rewrite/fit and responsive consumers can use the same canonical Text properties and command phases. No separate AI editor, renderer, measurement persistence, Material system or speculative domain infrastructure was introduced. The next step is independent source review and Product Owner Slice 2 hands-on review, followed by the outstanding device gates. Staging/release still requires separate approval.
