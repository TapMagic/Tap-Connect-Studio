"use client";

import { useEffect, useId, useRef, useSyncExternalStore, type RefObject } from "react";
import { createPortal } from "react-dom";
import { LockKeyhole, X } from "lucide-react";
import { EXPERIENCE_SHELL_LAYERS } from "@/lib/fusion/card/experience-shell-layers";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");
const subscribeToClientRuntime = () => () => undefined;
const clientRuntimeSnapshot = () => true;
const serverRuntimeSnapshot = () => false;

export type AccessNoticeCta = {
  label: string;
  href?: string;
  internalPageId?: string;
  actionId?: string;
};

export function AccessNoticeOverlay({
  open,
  title,
  message,
  cta,
  onClose,
  returnFocusRef,
}: {
  open: boolean;
  title: string;
  message: string;
  cta?: AccessNoticeCta;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const mounted = useSyncExternalStore(subscribeToClientRuntime, clientRuntimeSnapshot, serverRuntimeSnapshot);
  const panelRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    if (!open) return;
    const returnTarget = returnFocusRef.current ?? (document.activeElement as HTMLElement | null);
    const panel = panelRef.current;
    const focusables = () => panel
      ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => element.getAttribute("aria-hidden") !== "true")
      : [];
    panel?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) {
        event.preventDefault();
        panel?.focus({ preventScroll: true });
        return;
      }
      const first = items[0]!;
      const last = items.at(-1)!;
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      returnTarget?.focus?.({ preventScroll: true });
    };
  }, [onClose, open, returnFocusRef]);

  if (!mounted || !open) return null;
  return createPortal(
    <div
      className="fixed inset-0 flex items-start justify-center overflow-hidden bg-black/58 px-4 backdrop-blur-[2px]"
      style={{
        zIndex: EXPERIENCE_SHELL_LAYERS.accessNotice,
        paddingTop: "max(env(safe-area-inset-top, 0px), min(16dvh, 7rem))",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 1rem)",
      }}
      data-testid="experience-access-notice-layer"
      data-experience-shell-layer="access-notice"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={panelRef}
        tabIndex={-1}
        className="relative flex max-h-[calc(100dvh-max(env(safe-area-inset-top,0px),min(16dvh,7rem))-max(env(safe-area-inset-bottom,0px),1rem))] w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-[#d7ad58]/38 bg-[#100c08]/98 text-[#f8ecd0] shadow-[0_30px_90px_rgba(0,0,0,.72),inset_0_1px_0_rgba(255,255,255,.08)] outline-none backdrop-blur-xl focus-visible:ring-2 focus-visible:ring-[#f5d68c]/65"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        data-testid="experience-access-notice"
      >
        <button type="button" onClick={onClose} className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full text-[#f8ecd0]/55 transition hover:bg-white/8 hover:text-[#f8ecd0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5d68c]" aria-label="Close access notice"><X className="h-4 w-4" /></button>
        <div className="min-h-0 overflow-y-auto px-6 pb-6 pt-7 text-center overscroll-contain">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-[#d7ad58]/38 bg-[#d7ad58]/10 text-[#e7c77a] shadow-inner" aria-hidden><LockKeyhole className="h-5 w-5" /></span>
          <h2 id={titleId} className="mx-auto mt-4 max-w-[15rem] text-balance text-xl font-semibold leading-tight">{title}</h2>
          <p id={messageId} className="mx-auto mt-3 max-w-[18rem] text-pretty text-sm leading-6 text-[#f8ecd0]/72">{message}</p>
          {cta ? cta.internalPageId
            ? <button type="button" onClick={onClose} className="mt-6 min-h-11 rounded-full bg-[#d7ad58] px-5 text-sm font-semibold text-[#1b1209] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" data-internal-page-id={cta.internalPageId} data-action-id={cta.actionId}>{cta.label}</button>
            : <a href={cta.href} target={cta.href?.startsWith("http") ? "_blank" : undefined} rel={cta.href?.startsWith("http") ? "noopener noreferrer" : undefined} onClick={onClose} className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#d7ad58] px-5 text-sm font-semibold text-[#1b1209] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" data-action-id={cta.actionId}>{cta.label}</a>
            : null}
          <button type="button" onClick={onClose} className="mt-3 min-h-11 rounded-full border border-[#f8ecd0]/18 px-5 text-sm font-semibold text-[#f8ecd0]/82 transition hover:bg-white/7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5d68c]">Got It</button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
