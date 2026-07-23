/**
 * JourneyDraft lifecycle state machine — pure transitions for publish/activate/pause/resume.
 */

export type JourneyLifecycleStatus = "DRAFT" | "PUBLISHED" | "ACTIVE" | "PAUSED";

export type JourneyLifecycleAction = "publish" | "activate" | "pause" | "resume";

export type LifecycleTransitionResult =
  | {
      ok: true;
      status: JourneyLifecycleStatus;
      previousStatus: JourneyLifecycleStatus;
      timestamps: {
        publishedAt?: true;
        activatedAt?: true;
        pausedAt?: true;
      };
    }
  | { ok: false; code: "invalid_transition"; message: string };

const ALLOWED: Record<JourneyLifecycleAction, JourneyLifecycleStatus[]> = {
  publish: ["DRAFT", "PAUSED"],
  activate: ["DRAFT", "PUBLISHED", "PAUSED"],
  pause: ["ACTIVE", "PUBLISHED"],
  resume: ["PAUSED"],
};

/**
 * Validate and compute next lifecycle status + which timestamps to stamp.
 */
export function transitionJourneyLifecycle(
  current: JourneyLifecycleStatus,
  action: JourneyLifecycleAction
): LifecycleTransitionResult {
  if (!ALLOWED[action].includes(current)) {
    return {
      ok: false,
      code: "invalid_transition",
      message: `Cannot ${action} from status ${current}`,
    };
  }

  switch (action) {
    case "publish":
      return {
        ok: true,
        status: "PUBLISHED",
        previousStatus: current,
        timestamps: { publishedAt: true },
      };
    case "activate":
      return {
        ok: true,
        status: "ACTIVE",
        previousStatus: current,
        timestamps: {
          activatedAt: true,
          ...(current === "DRAFT" || current === "PAUSED" ? { publishedAt: true } : {}),
        },
      };
    case "pause":
      return {
        ok: true,
        status: "PAUSED",
        previousStatus: current,
        timestamps: { pausedAt: true },
      };
    case "resume":
      return {
        ok: true,
        status: "ACTIVE",
        previousStatus: current,
        timestamps: { activatedAt: true },
      };
    default:
      return {
        ok: false,
        code: "invalid_transition",
        message: `Unknown action: ${action as string}`,
      };
  }
}

/** Actions that require a published/valid graph and feature gate */
export function lifecycleRequiresFeature(action: JourneyLifecycleAction): boolean {
  return action === "publish" || action === "activate" || action === "resume";
}

export function lifecycleRequiresValidation(action: JourneyLifecycleAction): boolean {
  return action === "publish" || action === "activate" || action === "resume";
}
