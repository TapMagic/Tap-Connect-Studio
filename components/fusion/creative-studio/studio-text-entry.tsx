"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";
import { createTextEditTransaction, type TextEditSink } from "@/lib/fusion/creative-studio/platform/text-edit-transaction";

/** Canvas and Inspector share native plain-text input and one transaction adapter.
 * The DOM owns caret, paste, IME and native undo until the transaction completes.
 */
export function StudioTextEntry({ value, onChange, onFinish, inline = false, multiline = true, style, testId }: {
  value: string;
  onChange?: TextEditSink;
  onFinish?: () => void;
  inline?: boolean;
  multiline?: boolean;
  style?: CSSProperties;
  testId: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const session = useRef<ReturnType<typeof createTextEditTransaction> | null>(null);
  const composing = useRef(false);
  const blurredDuringComposition = useRef(false);
  const callbacks = useRef({ onChange, onFinish });
  useLayoutEffect(() => { callbacks.current = { onChange, onFinish }; });
  const begin = () => {
    session.current ??= createTextEditTransaction(value, (next, phase) => callbacks.current.onChange?.(next, phase));
  };
  const resize = useCallback(() => {
    const element = ref.current;
    if (!inline || !element) return;
    element.style.height = "0px";
    element.style.height = `${element.scrollHeight}px`;
  }, [inline]);
  const finish = (cancel = false) => {
    session.current?.finish(ref.current?.value ?? value, cancel);
    session.current = null;
    if (cancel && ref.current) ref.current.value = value;
    callbacks.current.onFinish?.();
  };
  useLayoutEffect(() => {
    if (!session.current && ref.current && ref.current.value !== value) ref.current.value = value;
    resize();
  }, [value, resize]);
  useEffect(() => {
    if (inline && ref.current) {
      ref.current.focus();
      ref.current.setSelectionRange(ref.current.value.length, ref.current.value.length);
      ref.current.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
    const viewport = window.visualViewport;
    const reveal = () => {
      if (document.activeElement === ref.current) ref.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
    };
    viewport?.addEventListener("resize", reveal);
    const observer = new ResizeObserver(resize);
    if (ref.current?.parentElement) observer.observe(ref.current.parentElement);
    return () => {
      viewport?.removeEventListener("resize", reveal);
      observer.disconnect();
      session.current?.cancel();
      session.current = null;
    };
  }, [inline, resize]);
  const handlers = useRef({ begin, finish, resize, multiline });
  useLayoutEffect(() => { handlers.current = { begin, finish, resize, multiline }; });
  // Initialize/synchronize the native value in the layout effect above. A React
  // defaultValue is rewritten during React input restoration. Avoid changing the
  // backing text node while native undo/redo owns an active editing session.
  const input = <textarea
    ref={ref}
    rows={1}
    aria-label="Edit Text content"
    aria-multiline={multiline}
    data-testid={testId}
    data-inline-editing={inline ? "true" : undefined}
    data-studio-keyboard-owner="text-entry"
    spellCheck
    className={inline ? "block w-full min-w-0 resize-none border-0 bg-transparent p-0 outline-none" : "mt-2 min-h-28 w-full resize-y rounded-xl border border-white/10 bg-white/5 p-3 text-base text-white outline-none focus:border-[#b8ff2c]"}
    style={{ ...style, font: inline ? "inherit" : undefined, letterSpacing: inline ? "inherit" : undefined, textAlign: inline ? "inherit" : undefined, color: "inherit", textTransform: "none", whiteSpace: "pre-wrap", overflowWrap: "anywhere", overflow: inline ? "hidden" : undefined, scrollMarginBlock: 80, minHeight: inline ? "1lh" : undefined }}
    onFocus={() => handlers.current.begin()}
    onPointerDown={event => event.stopPropagation()}
    onChange={event => { handlers.current.begin(); if (!composing.current) session.current?.preview(event.currentTarget.value); handlers.current.resize(); }}
    onCompositionStart={() => { composing.current = true; }}
    onCompositionEnd={event => {
      composing.current = false;
      session.current?.preview(event.currentTarget.value);
      if (blurredDuringComposition.current) { blurredDuringComposition.current = false; handlers.current.finish(); }
    }}
    onBlur={() => { if (composing.current) blurredDuringComposition.current = true; else handlers.current.finish(); }}
    onKeyDown={event => {
      if (event.nativeEvent.isComposing || composing.current) return;
      if (event.key === "Escape") {
        event.preventDefault(); event.stopPropagation();
        const element = event.currentTarget;
        handlers.current.finish(true);
        element.blur();
      } else if (event.key === "Enter" && (!handlers.current.multiline || event.metaKey || event.ctrlKey)) {
        event.preventDefault(); event.currentTarget.blur();
      }
    }}
  />;
  return <>{input}{inline ? <span className="absolute bottom-full left-0 z-40 mb-1 flex max-w-full gap-1 rounded-lg bg-[#0b111b] text-xs font-medium normal-case tracking-normal text-white shadow-lg" data-studio-pointer-owner="text-controls">
    <button type="button" className="min-h-11 min-w-14 rounded-lg px-3 text-[#b8ff2c] focus-visible:ring-2" onPointerDown={event => { event.preventDefault(); event.stopPropagation(); }} onClick={event => { event.stopPropagation(); finish(); }}>Done</button>
    <button type="button" className="min-h-11 min-w-14 rounded-lg px-3 focus-visible:ring-2" onPointerDown={event => { event.preventDefault(); event.stopPropagation(); }} onClick={event => { event.stopPropagation(); finish(true); }}>Cancel</button>
  </span> : null}</>;
}
