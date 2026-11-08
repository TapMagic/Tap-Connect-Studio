import assert from "node:assert/strict";
import test from "node:test";
import { createTextEditTransaction, type TextEditPhase } from "../platform/text-edit-transaction";
import { studioTextBoxStyle } from "../platform/text-authoring";
import { createLabeledHistory, pushLabeledHistory, undoLabeledHistory, redoLabeledHistory } from "../../authoring/session-history";
import { textEditingTruthComposition } from "../../../../e2e/fixtures/studio-text-editing-truth";
import { applyLayeredResize } from "../platform/layered-region";

test("Canvas/Inspector adapter preserves exact characters and coalesces one edit through canonical history", () => {
  const original = { id: "stable", text: "MiXeD  Case\t🙂\n終\n", textTransform: "uppercase" };
  let history = createLabeledHistory(original);
  let present = original;
  const edit = createTextEditTransaction(original.text, (text, phase) => {
    if (phase === "preview") present = { ...original, text };
    if (phase === "commit") history = pushLabeledHistory(history, { ...present, text }, "Edited Text", 50);
  });
  edit.preview("MiXeD  Case\t🙂\n終\nmore");
  edit.preview("MiXeD  Case\t🙂\n終\nmore\n");
  edit.finish("MiXeD  Case\t🙂\n終\nmore\n");
  edit.finish("unexpected blur");
  assert.equal(history.past.length, 1);
  assert.equal(history.present.text, "MiXeD  Case\t🙂\n終\nmore\n");
  assert.equal(history.present.textTransform, "uppercase");
  const undone = undoLabeledHistory(history)!;
  assert.deepEqual(undone.present, original);
  assert.deepEqual(redoLabeledHistory(undone)!.present, history.present);
});

test("Escape followed by blur or unmount cannot commit; cancellation restores exact original", () => {
  const events: [string, TextEditPhase][] = [];
  const edit = createTextEditTransaction("  Original\n", (text, phase) => events.push([text, phase]));
  edit.preview("replacement"); edit.finish("replacement", true); edit.finish("replacement"); edit.cancel();
  assert.deepEqual(events, [["replacement", "preview"], ["  Original\n", "cancel"]]);
});

test("no-op and native undo back to source make zero completed transactions", () => {
  const events: TextEditPhase[] = [];
  const noOp = createTextEditTransaction("x\r\ny\n", (_, phase) => events.push(phase));
  noOp.finish("x\ny\n");
  assert.deepEqual(events, []);
  const edit = createTextEditTransaction("x", (_, phase) => events.push(phase));
  edit.preview("xy"); edit.preview("x"); edit.finish("x");
  assert.deepEqual(events, ["preview", "preview", "cancel"]);
});

test("empty text, tabs, trailing newline and CRLF documents survive native-control projection", () => {
  for (const [source, next, expected] of [["x", "", ""], ["x", " \t\n", " \t\n"], ["a\r\nb", "a\nb\nc", "a\r\nb\r\nc"]]) {
    const events: [string, TextEditPhase][] = [];
    const edit = createTextEditTransaction(source, (text, phase) => events.push([text, phase]));
    edit.preview(next); edit.finish(next);
    assert.deepEqual(events.at(-1), [expected, "commit"]);
  }
});

test("target teardown cancels once and rejects stale follow-up events", () => {
  const events: TextEditPhase[] = [];
  const edit = createTextEditTransaction("one", (_, phase) => events.push(phase));
  edit.preview("two"); edit.cancel(); edit.preview("three"); edit.finish("three");
  assert.deepEqual(events, ["preview", "cancel"]);
});

test("Auto ignores retained minimum, Minimum honors floor, Fixed has independent height; source is untouched", () => {
  const props = { textHeightMode: "auto", textMinHeightPx: 140, textFixedHeightPx: 64 };
  const before = JSON.stringify(props);
  assert.deepEqual(studioTextBoxStyle(props), { minHeight: 0 });
  assert.deepEqual(studioTextBoxStyle({ ...props, textHeightMode: "minimum" }), { minHeight: 140 });
  assert.deepEqual(studioTextBoxStyle({ ...props, textHeightMode: "fixed" }), { height: 64, minHeight: 0 });
  assert.equal(JSON.stringify(props), before);
});

test("explicit Layered frame resizing reconciles Fixed/Minimum Text properties through the geometry command", () => {
  const block = textEditingTruthComposition(true);
  for (const mode of ["Minimum", "Fixed"]) {
    const node = block.nodes.find(node => node.id === `layer-${mode}`)!;
    const next = applyLayeredResize(block, node.id, { ...node, height: .12 }, () => ({ widthPx: 366, heightPx: 1000 }));
    const resized = next.nodes.find(candidate => candidate.id === node.id)!;
    assert.equal(resized.height, .12);
    assert.equal(resized.props[mode === "Fixed" ? "textFixedHeightPx" : "textMinHeightPx"], 120);
    assert.equal(resized.props.text, node.props.text);
    assert.equal(node.height, .08);
  }
});
