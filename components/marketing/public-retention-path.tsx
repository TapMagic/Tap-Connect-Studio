"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    id: "tap",
    title: "Customer taps",
    detail: "A physical or digital Tap Point opens the living Card.",
  },
  {
    id: "card",
    title: "Living Card opens",
    detail: "Approved actions and information are ready in the moment.",
  },
  {
    id: "choose",
    title: "Customer chooses how to keep it",
    detail: "One retention path at a time — not a pile of unclear icons.",
  },
  {
    id: "saved",
    title: "Saved on their device",
    detail: "Home Screen, contact, or another supported keep path appears.",
  },
  {
    id: "return",
    title: "Return opens the same Card",
    detail: "Later visits reopen the living Card — not a disposable link.",
  },
] as const;

const RETENTION_CHOICES = [
  { id: "homescreen", label: "Add to Home Screen" },
  { id: "contact", label: "Save Contact" },
  { id: "bookmark", label: "Bookmark" },
] as const;

/**
 * One clear retention path for the public acquisition story.
 * Interactive choice + controlled sequence; reduced-motion shows the full story statically.
 */
export function PublicRetentionPath() {
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState<(typeof RETENTION_CHOICES)[number]["id"]>(
    "homescreen"
  );
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % STEPS.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [reduced]);

  const active = STEPS[step] ?? STEPS[0]!;
  const choiceLabel =
    RETENTION_CHOICES.find((c) => c.id === choice)?.label ?? "Add to Home Screen";

  return (
    <div
      className="public-retention-path"
      data-testid="public-retention-path"
      data-step={active.id}
      data-reduced-motion={reduced ? "1" : "0"}
    >
      <div className="public-retention-path__device" aria-live="polite">
        <p className="public-retention-path__phase">{active.title}</p>
        <div
          className={cn(
            "public-retention-path__card",
            active.id === "card" || active.id === "choose" || active.id === "return"
              ? "is-open"
              : null,
            active.id === "saved" ? "is-saved" : null
          )}
        >
          <span className="public-retention-path__badge">Living Card</span>
          {active.id === "choose" || active.id === "saved" ? (
            <p className="public-retention-path__saved-label">{choiceLabel}</p>
          ) : (
            <p className="public-retention-path__hint">{active.detail}</p>
          )}
          {active.id === "saved" ? (
            <div
              className="public-retention-path__home-icon"
              aria-label={`${choiceLabel} shortcut`}
              data-testid="public-retention-home-icon"
            >
              TC
            </div>
          ) : null}
        </div>
      </div>

      <div className="public-retention-path__controls">
        <p className="public-kicker">Choose one keep path</p>
        <div
          className="public-retention-path__choices"
          role="radiogroup"
          aria-label="Retention action"
        >
          {RETENTION_CHOICES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={choice === item.id}
              data-testid={`public-retention-choice-${item.id}`}
              className={cn(
                "public-retention-path__choice",
                choice === item.id && "is-active"
              )}
              onClick={() => {
                setChoice(item.id);
                setStep(2);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <ol className="public-retention-path__steps">
          {STEPS.map((s, index) => (
            <li key={s.id} data-active={index === step ? "1" : "0"}>
              <button
                type="button"
                onClick={() => setStep(index)}
                aria-current={index === step ? "step" : undefined}
              >
                <strong>{s.title}</strong>
                <span>{s.detail}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
