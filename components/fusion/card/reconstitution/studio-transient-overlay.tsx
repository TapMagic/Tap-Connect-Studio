"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

const OPEN_EVENT = "tapconnect:studio-transient-overlay-open";

export function StudioTransientOverlay({
  open,
  onClose,
  ownerRef,
  kind,
  children,
}: {
  open: boolean;
  onClose: () => void;
  ownerRef: RefObject<HTMLElement | null>;
  kind: "menu" | "browser";
  children: ReactNode;
}) {
  const id = useId();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const task = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(task);
  }, []);
  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id }));
    const onOpen = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      document.removeEventListener("keydown", onKey);
    };
  }, [id, onClose, open]);
  useEffect(() => {
    if (!open) ownerRef.current?.focus();
  }, [open, ownerRef]);
  if (!mounted || !open) return null;
  return createPortal(
    <div data-studio-transient-overlay={kind} data-overlay-owner={id}>{children}</div>,
    document.body,
  );
}

export function StudioTransientMenu({
  label,
  children,
}: {
  label: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const close = () => setOpen(false);
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({ left: Math.max(8, Math.min(window.innerWidth - 184, rect.left)), top: Math.min(window.innerHeight - 120, rect.bottom + 8) });
  }, [open]);
  return <>
    <button ref={(node) => { triggerRef.current = node; }} type="button" onClick={() => setOpen((current) => !current)} className="grid h-9 w-9 place-items-center rounded-full text-white/62 transition hover:bg-white/8 hover:text-white" aria-label={label} aria-haspopup="menu" aria-expanded={open}>•••</button>
    <StudioTransientOverlay open={open} onClose={close} ownerRef={triggerRef} kind="menu">
      <div className="fixed z-[6500] min-w-44 rounded-xl border border-white/10 bg-[#0b111b] p-1.5 text-white shadow-2xl" style={position} role="menu" aria-label={label} onPointerDown={(event) => event.stopPropagation()}>{children(close)}</div>
    </StudioTransientOverlay>
  </>;
}
