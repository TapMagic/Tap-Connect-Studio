"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { TapConnectIcon } from "@/components/fusion/icons/tapconnect-icons";
import type { TapConnectIconId } from "@/lib/fusion/icons/registry";
import {
  ASSEMBLY_CAPABILITIES,
  CAPABILITY_DEMO_BEATS,
  capabilitiesForMode,
  createAssemblyMachine,
  frameFromCardSnapshot,
  isAssemblyActive,
  isTerminalPhase,
  markStudioFirstEntrySeen,
  nextPhase,
  reduceAssembly,
  timingForMode,
  trackAssemblyEvent,
  type AssemblyCardSnapshot,
  type AssemblyCapabilityId,
  type AssemblyPhase,
  type StudioAssemblyMode,
} from "@/lib/fusion/studio-assembly";
import { FULL_VALUE_FRAME_COPY } from "@/lib/marketing/landing-card-centered";
import { ZONE_TOKENS, type StudioZoneId } from "@/lib/fusion/studio/zone-tokens";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";
import "./studio-assembly.css";

const CAP_TO_ICON: Record<AssemblyCapabilityId, TapConnectIconId> = {
  brand: "brand",
  tap_points: "tap_points",
  campaigns: "campaigns",
  tapsave: "tapsave",
  audience: "audience",
  email: "email",
  autopilot: "autopilot",
  insights: "insights",
  integrations: "integrations",
  trust_fabric: "trust_fabric",
};

/** Orbital angles (deg) for desktop — Card stays center. Trust stays low. */
const ORBIT_ANGLES: Partial<Record<AssemblyCapabilityId, number>> = {
  brand: -70,
  tap_points: -30,
  campaigns: 10,
  tapsave: 50,
  audience: 90,
  email: 130,
  autopilot: 170,
  insights: -110,
  integrations: -150,
  trust_fabric: 210,
};

function zoneAccent(zone: StudioZoneId): string {
  return ZONE_TOKENS[zone]?.iconAccent ?? "oklch(0.8 0.04 95)";
}

function cinematicStage(phase: AssemblyPhase): "opening" | "pullback" | "settled" {
  if (
    phase === "complete" ||
    phase === "skipped" ||
    phase === "icons_settle" ||
    phase === "card_forward" ||
    phase === "card_unfold"
  ) {
    return "settled";
  }
  if (phase === "pullback") return "pullback";
  return "opening";
}

function useIsPhoneLayout() {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined") return () => undefined;
      const mq = window.matchMedia("(max-width: 767px)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(max-width: 767px)").matches,
    () => false
  );
}

function measureDestination(destId: string): { x: number; y: number } | null {
  if (typeof document === "undefined") return null;
  const el = document.querySelector(`[data-assembly-dest="${destId}"]`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export type StudioAssemblyProps = {
  mode: StudioAssemblyMode;
  /** tapconnect = core only; studio = full system */
  capabilityScope?: "tapconnect" | "studio";
  card?: AssemblyCardSnapshot | null;
  autoStart?: boolean;
  showReplay?: boolean;
  showContinue?: boolean;
  continueLabel?: string;
  onComplete?: () => void;
  onSkip?: () => void;
  onCapabilitySelect?: (id: AssemblyCapabilityId) => void;
  onPhaseChange?: (phase: AssemblyPhase) => void;
  className?: string;
  /** When true, settling uses measured nav anchors */
  settleToNav?: boolean;
  /** Scroll / external interrupt accelerates pullback → settle */
  accelerateSignal?: number;
};

export function StudioAssembly({
  mode,
  capabilityScope = "studio",
  card = null,
  autoStart = true,
  showReplay = true,
  showContinue = false,
  continueLabel = "Continue to Studio",
  onComplete,
  onSkip,
  onCapabilitySelect,
  onPhaseChange,
  className,
  settleToNav = false,
  accelerateSignal = 0,
}: StudioAssemblyProps) {
  const reducedMotion = usePrefersReducedMotion();
  const phone = useIsPhoneLayout();
  const labelId = useId();
  const statusId = useId();
  const skipRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [state, setState] = useState(() =>
    createAssemblyMachine(mode, reducedMotion)
  );
  const [settleOffsets, setSettleOffsets] = useState<
    Partial<Record<AssemblyCapabilityId, { x: number; y: number }>>
  >({});
  const [emergedCount, setEmergedCount] = useState(0);
  const [demoBeat, setDemoBeat] = useState<string | null>(null);

  const caps = useMemo(
    () =>
      capabilitiesForMode(capabilityScope).filter(
        (c) => !c.crossCutting || capabilityScope === "studio"
      ),
    [capabilityScope]
  );
  const cross = useMemo(
    () =>
      capabilityScope === "studio"
        ? ASSEMBLY_CAPABILITIES.filter((c) => c.crossCutting)
        : [],
    [capabilityScope]
  );
  const allCaps = useMemo(
    () => [...caps.filter((c) => !c.crossCutting), ...cross],
    [caps, cross]
  );

  const frame = useMemo(() => frameFromCardSnapshot(card), [card]);
  const cardView = card ?? {
    cardName: "Your Card",
    publicStateLabel: "Living relationship hub",
    tapPointHealthy: 0,
    tapPointCount: 0,
    spotlightTitle: null,
    tapSaveEnabled: true,
    nextActionLabel: "Open Card",
    proofSummary: "Proof strip",
    safeForPublicAnalytics: true,
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const finish = useCallback(
    (kind: "complete" | "skipped") => {
      clearTimer();
      if (mode !== "LANDING_FULL") {
        markStudioFirstEntrySeen();
      }
      trackAssemblyEvent({
        event:
          kind === "skipped"
            ? "studio_assembly_skipped"
            : "studio_assembly_completed",
        mode,
      });
      if (kind === "skipped") onSkip?.();
      else onComplete?.();
    },
    [mode, onComplete, onSkip]
  );

  const advance = useCallback(() => {
    setState((prev) => {
      if (isTerminalPhase(prev.phase) || prev.phase === "idle") return prev;
      const nxt = nextPhase(prev.mode, prev.phase);
      if (!nxt || nxt === "complete") {
        queueMicrotask(() => finish("complete"));
        return reduceAssembly(prev, { type: "COMPLETE" });
      }
      return reduceAssembly(prev, { type: "TICK", phase: nxt });
    });
  }, [finish]);

  const start = useCallback(() => {
    try {
      clearTimer();
      setFailed(false);
      setDemoBeat(null);
      setState(() => {
        const next = reduceAssembly(
          { ...createAssemblyMachine(mode, reducedMotion), reducedMotion },
          { type: "START" }
        );
        trackAssemblyEvent({ event: "studio_assembly_started", mode });
        return next;
      });
    } catch (err) {
      setFailed(true);
      setState((prev) =>
        reduceAssembly(prev, {
          type: "FAIL",
          reason: err instanceof Error ? err.message : "assembly_failed",
        })
      );
      onComplete?.();
    }
  }, [mode, reducedMotion, onComplete]);

  const skip = useCallback(() => {
    setState((prev) => reduceAssembly(prev, { type: "SKIP" }));
    setDemoBeat(null);
    finish("skipped");
    queueMicrotask(() => {
      const replay = document.querySelector(
        '[data-testid="studio-assembly-replay"]'
      );
      if (replay instanceof HTMLElement) {
        replay.focus({ preventScroll: true });
      }
    });
  }, [finish]);

  const accelerate = useCallback(() => {
    setState((prev) => {
      if (!isAssemblyActive(prev.phase)) return prev;
      trackAssemblyEvent({ event: "studio_assembly_accelerated", mode });
      const next = reduceAssembly(prev, { type: "ACCELERATE" });
      if (next.phase === "complete") {
        queueMicrotask(() => finish("complete"));
      }
      return next;
    });
  }, [finish, mode]);

  const replay = useCallback(() => {
    trackAssemblyEvent({ event: "studio_assembly_replayed", mode });
    start();
  }, [mode, start]);

  useEffect(() => {
    if (autoStart) start();
    return clearTimer;
  }, [autoStart, start]);

  useEffect(() => {
    skipRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    onPhaseChange?.(state.phase);
  }, [state.phase, onPhaseChange]);

  useEffect(() => {
    if (accelerateSignal > 0) accelerate();
  }, [accelerateSignal, accelerate]);

  useEffect(() => {
    if (isTerminalPhase(state.phase) || state.phase === "idle") return;
    const timing = timingForMode(mode, reducedMotion);
    const ms = timing[state.phase] ?? 300;
    if (ms <= 0) {
      advance();
      return;
    }
    clearTimer();
    timerRef.current = setTimeout(advance, ms);
    return clearTimer;
  }, [state.phase, mode, reducedMotion, advance]);

  useEffect(() => {
    if (
      state.phase === "capability_demo" ||
      state.phase === "crescendo" ||
      state.phase === "full_value_frame" ||
      state.phase === "pullback" ||
      state.phase === "icons_settle" ||
      state.phase === "complete" ||
      state.phase === "skipped" ||
      state.phase === "card_forward" ||
      state.phase === "card_unfold"
    ) {
      setEmergedCount(allCaps.length);
      return;
    }
    if (state.phase !== "capabilities_emerge") return;
    if (reducedMotion) {
      setEmergedCount(allCaps.length);
      return;
    }
    setEmergedCount(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setEmergedCount(i);
      if (i >= allCaps.length) window.clearInterval(id);
    }, 180);
    return () => window.clearInterval(id);
  }, [state.phase, allCaps.length, reducedMotion]);

  useEffect(() => {
    if (state.phase !== "capability_demo") {
      if (state.phase !== "crescendo") setDemoBeat(null);
      return;
    }
    if (reducedMotion) {
      setDemoBeat("insights");
      return;
    }
    let i = 0;
    setDemoBeat(CAPABILITY_DEMO_BEATS[0]?.id ?? null);
    const step = Math.max(
      180,
      Math.floor((timingForMode(mode, false).capability_demo ?? 2200) / CAPABILITY_DEMO_BEATS.length)
    );
    const id = window.setInterval(() => {
      i += 1;
      if (i >= CAPABILITY_DEMO_BEATS.length) {
        window.clearInterval(id);
        return;
      }
      setDemoBeat(CAPABILITY_DEMO_BEATS[i]?.id ?? null);
    }, step);
    return () => window.clearInterval(id);
  }, [state.phase, reducedMotion, mode]);

  useEffect(() => {
    if (state.phase !== "icons_settle" || !settleToNav || phone || reducedMotion) {
      return;
    }
    const stage = stageRef.current?.getBoundingClientRect();
    if (!stage) return;
    const next: Partial<Record<AssemblyCapabilityId, { x: number; y: number }>> = {};
    for (const cap of allCaps) {
      const dest = measureDestination(cap.destinationId);
      if (!dest) continue;
      next[cap.id] = {
        x: dest.x - (stage.left + stage.width / 2),
        y: dest.y - (stage.top + stage.height / 2),
      };
    }
    setSettleOffsets(next);
    for (const cap of allCaps) {
      const el = document.querySelector(`[data-assembly-dest="${cap.destinationId}"]`);
      if (el instanceof HTMLElement) {
        el.dataset.assemblyLit = "1";
        window.setTimeout(() => {
          delete el.dataset.assemblyLit;
        }, 900);
      }
    }
  }, [state.phase, settleToNav, phone, reducedMotion, allCaps]);

  const cinematic = cinematicStage(state.phase);
  const orbitRadius = phone
    ? cinematic === "settled"
      ? 0
      : 100
    : mode === "EVERYDAY_ENTRY"
      ? 160
      : cinematic === "opening"
        ? 170
        : cinematic === "settled"
          ? 190
          : 180;

  const statusText = useMemo(() => {
    switch (state.phase) {
      case "dark":
        return "Studio Assembly beginning. Screen nearly dark.";
      case "card_glow":
        return "A warm Card glow appears.";
      case "card_resolve":
        return "The Card resolves from the darkness.";
      case "tap_pulse":
        return "A Tap Point pulse activates the system.";
      case "capabilities_emerge":
        return "Studio capabilities emerge around the Card.";
      case "capability_demo":
        return (
          CAPABILITY_DEMO_BEATS.find((b) => b.id === demoBeat)?.label ??
          "Capabilities demonstrate meaning on the Card."
        );
      case "crescendo":
        return "The system reaches a balanced full-value moment.";
      case "full_value_frame":
        return FULL_VALUE_FRAME_COPY;
      case "pullback":
        return "The view widens. The page becomes visible around the assembled system.";
      case "icons_settle":
        return "Capabilities settle into the interactive product map.";
      case "card_forward":
        return "The Card moves toward you.";
      case "card_unfold":
        return "The Card unfolds into Home.";
      case "complete":
        return mode === "LANDING_FULL"
          ? "Studio Assembly complete. Interactive explorer ready."
          : "Entering Studio through the Card.";
      case "skipped":
        return "Studio Assembly skipped. Interactive map ready.";
      case "failed":
        return "Studio Assembly unavailable. Continuing to Studio.";
      default:
        return "Studio Assembly idle.";
    }
  }, [state.phase, mode, demoBeat]);

  if (failed || state.phase === "failed") {
    return null;
  }

  const interactive =
    mode === "LANDING_FULL" &&
    (state.phase === "complete" ||
      state.phase === "skipped" ||
      state.phase === "icons_settle" ||
      state.phase === "pullback");

  const showSpotlight =
    demoBeat === "campaigns" ||
    state.phase === "crescendo" ||
    state.phase === "full_value_frame" ||
    Boolean(cardView.spotlightTitle);
  const showTapSave =
    demoBeat === "tapsave" ||
    state.phase === "crescendo" ||
    state.phase === "full_value_frame" ||
    cardView.tapSaveEnabled;
  const showProof =
    demoBeat === "insights" ||
    state.phase === "crescendo" ||
    state.phase === "full_value_frame";

  return (
    <section
      className={["sa-root", className].filter(Boolean).join(" ")}
      data-testid="studio-assembly"
      data-mode={mode}
      data-phase={state.phase}
      data-cinematic={cinematic}
      data-demo-beat={demoBeat ?? undefined}
      data-layout={phone ? "phone" : "desktop"}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      aria-labelledby={labelId}
      aria-describedby={statusId}
    >
      <h2 id={labelId} className="sr-only">
        Studio Assembly — Card-centered introduction to TapConnect Studio
      </h2>
      <p id={statusId} className="sa-sr-status" role="status" aria-live="polite">
        {statusText}
      </p>

      <div className="sa-controls">
        {!isTerminalPhase(state.phase) && state.phase !== "idle" ? (
          <button
            ref={skipRef}
            type="button"
            data-testid="studio-assembly-skip"
            onClick={skip}
          >
            Skip intro
          </button>
        ) : null}
        {showReplay &&
        (state.phase === "complete" || state.phase === "skipped") ? (
          <button type="button" data-testid="studio-assembly-replay" onClick={replay}>
            Replay Studio Assembly
          </button>
        ) : null}
        {showContinue &&
        (state.phase === "complete" || state.phase === "skipped") ? (
          <button
            type="button"
            className="sa-go"
            data-testid="studio-assembly-continue"
            onClick={() => onComplete?.()}
          >
            {continueLabel}
          </button>
        ) : null}
      </div>

      <div className="sa-stage" ref={stageRef} data-testid="studio-assembly-stage">
        <div
          className="sa-trust-underlay"
          data-assembly-dest="trust_underlay"
          data-testid="sa-trust-underlay"
          aria-hidden
        />
        <div className="sa-card-glow" aria-hidden />
        <div className="sa-pulse-ring" data-testid="sa-tap-pulse" aria-hidden />

        <article
          className="sa-card zone-card"
          data-testid="sa-card"
          data-orientation="portrait"
          data-spotlight={showSpotlight ? "true" : "false"}
          data-tapsave={showTapSave ? "true" : "false"}
          data-proof={showProof ? "true" : "false"}
          aria-label={`${cardView.cardName} — vertical TapConnect profile Card`}
        >
          <div className="sa-card-avatar" aria-hidden data-testid="sa-card-avatar">
            {"avatarInitials" in cardView && cardView.avatarInitials
              ? cardView.avatarInitials
              : cardView.cardName.slice(0, 2).toUpperCase()}
          </div>
          <p className="sa-card-kicker zone-label-card">Digital business Card</p>
          <h3 className="sa-card-name" data-testid="sa-card-name">
            {cardView.cardName}
          </h3>
          <p className="sa-card-descriptor" data-testid="sa-card-descriptor">
            {"businessDescriptor" in cardView && cardView.businessDescriptor
              ? cardView.businessDescriptor
              : cardView.publicStateLabel}
          </p>
          <p className="sa-tap-cue" data-testid="sa-tap-cue">
            <TapConnectIcon id="tap_points" className="sa-tap-cue-icon" decorative />
            <span>
              {"tapCueLabel" in cardView && cardView.tapCueLabel
                ? cardView.tapCueLabel
                : "Tap or scan to open"}
            </span>
          </p>
          <ul className="sa-card-meta">
            <li>
              {cardView.tapPointCount > 0
                ? `${cardView.tapPointHealthy}/${cardView.tapPointCount} Tap Points`
                : "Awaiting Tap Points"}
            </li>
            <li data-testid="sa-card-spotlight-meta">
              {showSpotlight
                ? `Spotlight · ${cardView.spotlightTitle ?? "Seasonal highlight"}`
                : "No Spotlight"}
            </li>
            <li data-testid="sa-card-tapsave-meta">
              {showTapSave ? "TapSave ready" : "TapSave off"}
            </li>
            {showProof ? (
              <li data-testid="sa-card-proof-meta">{cardView.proofSummary}</li>
            ) : null}
          </ul>
          <div
            className="sa-trust-states"
            data-testid="sa-trust-states"
            aria-label="Trust states"
          >
            <span data-active={showProof ? "1" : "0"}>Source confirmed</span>
            <span data-active="1">Owner approved</span>
            <span data-active={showSpotlight ? "1" : "0"}>Brand asset approved</span>
            <span data-active={cardView.publicStateLabel?.toLowerCase().includes("draft") ? "1" : "0"}>
              {cardView.publicStateLabel?.toLowerCase().includes("draft")
                ? "Draft protected"
                : "Preview — not public"}
            </span>
          </div>
          <div className="sa-card-actions" data-testid="sa-card-actions" aria-hidden>
            <span data-primary="true">Save</span>
            <span>Contact</span>
            <span>Ask</span>
            <span>Directions</span>
          </div>
        </article>

        <div className="sa-demo-layer" data-testid="sa-capability-demo" aria-hidden>
          <div className="sa-demo-signal" data-testid="sa-demo-tap-points" />
          <div className="sa-demo-spotlight" data-testid="sa-demo-campaign-spotlight" />
          <div className="sa-demo-retain" data-testid="sa-demo-tapsave" />
          <div className="sa-demo-relationship" data-testid="sa-demo-audience">
            <span />
            <span />
            <span />
          </div>
          <div className="sa-demo-route" data-testid="sa-demo-email" />
          <div className="sa-demo-paths" data-testid="sa-demo-autopilot" />
          <div className="sa-demo-bridge" data-testid="sa-demo-integrations" />
          <div className="sa-demo-proof" data-testid="sa-demo-tapproof">
            Proof confirmed
          </div>
        </div>

        <div className="sa-orbit" data-testid="sa-orbit" aria-hidden={!interactive}>
          {allCaps.map((cap, index) => {
            const iconId = CAP_TO_ICON[cap.id];
            const angle = ((ORBIT_ANGLES[cap.id] ?? index * 36) * Math.PI) / 180;
            const visible = emergedCount > index;
            const settle = settleOffsets[cap.id];
            const orbitX = Math.cos(angle) * orbitRadius;
            const orbitY = Math.sin(angle) * orbitRadius;
            const settling =
              state.phase === "icons_settle" ||
              state.phase === "complete" ||
              state.phase === "skipped" ||
              state.phase === "card_forward" ||
              state.phase === "card_unfold";
            const listSettled = phone && cinematic === "settled";
            const tx =
              listSettled
                ? 0
                : settling && settle && settleToNav && !phone && !reducedMotion
                  ? settle.x
                  : orbitX;
            const ty =
              listSettled
                ? 0
                : settling && settle && settleToNav && !phone && !reducedMotion
                  ? settle.y
                  : orbitY;

            return (
              <button
                key={cap.id}
                type="button"
                className="sa-capability"
                data-id={cap.id}
                data-zone={cap.zone}
                data-cross={cap.crossCutting ? "true" : "false"}
                data-visible={visible ? "true" : "false"}
                data-active-demo={demoBeat === cap.id ? "true" : "false"}
                data-testid={`sa-capability-${cap.id}`}
                disabled={!interactive}
                aria-label={`${cap.name}. ${cap.emergence}`}
                style={
                  {
                    "--sa-zone": zoneAccent(cap.zone),
                    transform: visible
                      ? `translate(${tx}px, ${ty}px) scale(1)`
                      : `translate(0px, 0px) scale(0.5)`,
                    transitionDelay: "0ms",
                    pointerEvents: interactive ? "auto" : "none",
                  } as CSSProperties
                }
                onClick={() => {
                  onCapabilitySelect?.(cap.id);
                }}
              >
                <span className="sa-capability-icon">
                  <TapConnectIcon id={iconId} className="h-4 w-4" decorative />
                </span>
                <span className="sa-capability-label">{cap.name}</span>
              </button>
            );
          })}
        </div>

        {(state.phase === "full_value_frame" ||
          state.phase === "pullback" ||
          state.phase === "icons_settle" ||
          state.phase === "crescendo" ||
          (mode === "LANDING_FULL" &&
            (state.phase === "complete" || state.phase === "skipped"))) && (
          <div className="sa-frame" data-testid="sa-full-value-frame">
            <p className="sa-frame-title">{FULL_VALUE_FRAME_COPY}</p>
            <p className="sa-frame-note">
              {frame.illustrative
                ? "Illustrative Studio state — not customer evidence."
                : frame.label}
            </p>
            <ul className="sa-frame-items">
              {frame.items.map((item) => (
                <li key={item.id} data-active={item.active ? "true" : "false"}>
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {mode !== "LANDING_FULL" &&
        (state.phase === "card_unfold" || state.phase === "complete") ? (
          <div className="sa-next-action" data-assembly-dest="autopilot_next">
            <span data-testid="sa-next-action">{cardView.nextActionLabel}</span>
          </div>
        ) : (
          <div className="sr-only" data-assembly-dest="autopilot_next" />
        )}
      </div>
    </section>
  );
}
