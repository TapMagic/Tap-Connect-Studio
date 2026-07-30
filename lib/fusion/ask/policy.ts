/**
 * Ask TapConnect action policy gates — enforced in code.
 * See docs/product/ASK_TAPCONNECT_PROMPT_AND_ACTION_POLICY.md
 */

export type AskConsequentialAction =
  | "publish"
  | "send"
  | "charge"
  | "contact_customers"
  | "assign_tap_points"
  | "irreversible_delete"
  | "replace_locked_brand";

export type AskPolicyDecision = {
  allowed: boolean;
  action: AskConsequentialAction | "draft_transform" | "explain" | "extract";
  reason: string;
  requiresExplicitAuthorization: boolean;
};

const DENIED: Record<AskConsequentialAction, string> = {
  publish: "Ask TapConnect cannot publish. Preview the draft, then publish yourself.",
  send: "Ask TapConnect cannot send Email or Campaigns. Schedule or send yourself after review.",
  charge: "Ask TapConnect cannot charge customers or run payments.",
  contact_customers: "Ask TapConnect cannot contact customers.",
  assign_tap_points: "Ask TapConnect cannot assign Tap Points. Connect them in Tap Points.",
  irreversible_delete:
    "Ask TapConnect cannot delete permanently. Remove drafts only with explicit Owner action.",
  replace_locked_brand:
    "Ask TapConnect cannot silently replace locked Brand decisions. Unlock or approve first.",
};

export function evaluateAskAction(opts: {
  action: AskConsequentialAction | "draft_transform" | "explain" | "extract";
  explicitAuthorization?: boolean;
  brandLocked?: boolean;
}): AskPolicyDecision {
  const { action, explicitAuthorization = false, brandLocked = false } = opts;

  if (action === "explain" || action === "extract" || action === "draft_transform") {
    if (brandLocked && action === "draft_transform") {
      return {
        allowed: true,
        action,
        reason:
          "Draft transforms may propose changes, but locked Brand fields stay protected until unlocked.",
        requiresExplicitAuthorization: false,
      };
    }
    return {
      allowed: true,
      action,
      reason: "Safe assistive action in draft scope.",
      requiresExplicitAuthorization: false,
    };
  }

  if (action === "replace_locked_brand" && brandLocked && !explicitAuthorization) {
    return {
      allowed: false,
      action,
      reason: DENIED.replace_locked_brand,
      requiresExplicitAuthorization: true,
    };
  }

  if (!explicitAuthorization) {
    return {
      allowed: false,
      action,
      reason: DENIED[action],
      requiresExplicitAuthorization: true,
    };
  }

  return {
    allowed: false,
    action,
    reason: `${DENIED[action]} Explicit authorization must go through the dedicated Owner control, not Ask TapConnect.`,
    requiresExplicitAuthorization: true,
  };
}

/** Detect consequential intent from freeform Owner text (deterministic). */
export function detectConsequentialIntent(
  prompt: string
): AskConsequentialAction | null {
  const p = prompt.toLowerCase();
  if (/\b(publish|go live|make public)\b/.test(p)) return "publish";
  if (/\b(send email|send campaign|blast|mail everyone)\b/.test(p)) return "send";
  if (/\b(charge|invoice|take payment|stripe)\b/.test(p)) return "charge";
  if (/\b(email customers|text customers|contact my customers|message everyone)\b/.test(p)) {
    return "contact_customers";
  }
  if (/\b(assign tap point|assign device|connect this to the tap)\b/.test(p)) {
    return "assign_tap_points";
  }
  if (/\b(delete forever|permanently delete|wipe)\b/.test(p)) {
    return "irreversible_delete";
  }
  return null;
}

export type AskProposalPreview = {
  usedSources: string[];
  changes: string[];
  uncertain: string[];
  factMode: "confirmed" | "suggested" | "mixed";
  scope: "current_object" | "brand_or_business";
  providerRequired?: string | null;
  blockedAction?: AskConsequentialAction | null;
  blockedReason?: string | null;
};

export function buildDeterministicAskPreview(opts: {
  prompt: string;
  workspace: string;
  selectionLabel?: string | null;
  aiLive?: boolean;
}): AskProposalPreview {
  const blocked = detectConsequentialIntent(opts.prompt);
  if (blocked) {
    const decision = evaluateAskAction({ action: blocked });
    return {
      usedSources: ["Owner prompt", `Workspace: ${opts.workspace}`],
      changes: [],
      uncertain: ["Consequential action requested"],
      factMode: "suggested",
      scope: "current_object",
      providerRequired: opts.aiLive ? null : "AI credentials for generative drafts",
      blockedAction: blocked,
      blockedReason: decision.reason,
    };
  }

  const selection = opts.selectionLabel
    ? `Selected: ${opts.selectionLabel}`
    : "No object selected";

  return {
    usedSources: [
      "Owner prompt",
      `Workspace: ${opts.workspace}`,
      selection,
      "Approved Business Knowledge (when present)",
      "Brand Kit locks respected",
    ],
    changes: [
      "Prepare a reversible draft proposal for review",
      "Do not publish, send, charge, contact, or assign",
    ],
    uncertain: opts.aiLive
      ? ["Generated wording until you approve"]
      : [
          "Live generative AI is not active — instructional and deterministic help only",
        ],
    factMode: "suggested",
    scope: "current_object",
    providerRequired: opts.aiLive ? null : "AI credentials for generative drafts",
    blockedAction: null,
    blockedReason: null,
  };
}
