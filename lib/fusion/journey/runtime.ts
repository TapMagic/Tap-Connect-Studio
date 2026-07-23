/**
 * TapFlow dry-run runtime — walks a journey against sample visitor context.
 * Does not execute freeform whiteboard drawings. No provider side effects.
 */

import type { JourneyDefinition, JourneyNode } from "./types";
import { validateJourney } from "./validation";

export type VisitorContext = {
  visitorId?: string;
  attributes?: Record<string, unknown>;
  consent?: { email?: boolean; sms?: boolean; marketing?: boolean };
  loyalty?: { enrolled?: boolean; points?: number; tier?: string };
  preferBranch?: string;
};

export const SAMPLE_VISITOR: VisitorContext = {
  visitorId: "sample_visitor",
  attributes: {},
  consent: { email: true, sms: false, marketing: true },
  loyalty: { enrolled: true, points: 40, tier: "Member" },
};

export type DryRunEvent = {
  nodeId: string;
  type: string;
  label: string;
  action: string;
  detail?: string;
  blocked?: boolean;
};

export type DryRunResult = {
  ok: boolean;
  completed: boolean;
  path: string[];
  events: DryRunEvent[];
  issues: string[];
  visitor: VisitorContext;
  blockedAt?: string;
};

/** @deprecated Prefer VisitorContext — kept for earlier call sites */
export type VisitorRuntimeContext = {
  businessId: string;
  contactId?: string;
  relationshipId?: string;
  consentEmail?: boolean;
  consentMarketing?: boolean;
  loyaltyBalance?: number;
  attributes?: Record<string, unknown>;
  now?: string;
};

function outgoing(def: JourneyDefinition, nodeId: string) {
  return def.edges.filter((e) => e.from === nodeId);
}

function pickBranch(
  node: JourneyNode,
  edges: JourneyDefinition["edges"],
  ctx: VisitorContext
): string | undefined {
  if (ctx.preferBranch) {
    const preferred = edges.find((e) => e.label === ctx.preferBranch || e.condition === ctx.preferBranch);
    if (preferred) return preferred.to;
  }
  if (node.type !== "condition" && node.type !== "branch") {
    return edges[0]?.to;
  }
  const attr = String(node.config.attribute ?? "consent.marketing");
  const expect = node.config.equals ?? true;
  let actual: unknown = false;
  if (attr === "consent.email" || attr === "consentEmail") actual = Boolean(ctx.consent?.email);
  else if (attr === "consent.marketing" || attr === "consentMarketing")
    actual = Boolean(ctx.consent?.marketing);
  else if (attr.startsWith("loyalty.")) {
    const key = attr.slice("loyalty.".length);
    actual = (ctx.loyalty as Record<string, unknown> | undefined)?.[key];
  } else actual = ctx.attributes?.[attr];

  const match = edges.find((e) => {
    if (!e.condition) return false;
    const wantTrue = e.condition === "true" || e.condition === "yes";
    return wantTrue === (actual === expect);
  });
  return (
    match?.to ??
    edges.find((e) => e.condition === "false" || e.condition === "no")?.to ??
    edges[0]?.to
  );
}

function describeAction(node: JourneyNode, ctx: VisitorContext): DryRunEvent {
  switch (node.type) {
    case "trigger":
    case "entry_tap":
      return { nodeId: node.id, type: node.type, label: node.label, action: "enter" };
    case "wait":
    case "delay":
      return {
        nodeId: node.id,
        type: node.type,
        label: node.label,
        action: "wait",
        detail: `delayMs=${String(node.config.delayMs ?? node.config.ms ?? 0)}`,
      };
    case "message":
      if (node.config.requireMarketingConsent && !ctx.consent?.marketing) {
        return {
          nodeId: node.id,
          type: node.type,
          label: node.label,
          action: "message",
          blocked: true,
          detail: "Channel Guardian: marketing consent required",
        };
      }
      return {
        nodeId: node.id,
        type: node.type,
        label: node.label,
        action: "message",
        detail: String(node.config.channel ?? "email"),
      };
    case "award_loyalty":
      return {
        nodeId: node.id,
        type: node.type,
        label: node.label,
        action: "award_loyalty",
        detail: `points=${String(node.config.points ?? 0)} (dry-run)`,
      };
    case "create_case":
      return {
        nodeId: node.id,
        type: node.type,
        label: node.label,
        action: "create_case",
        detail: String(node.config.subject ?? "TapCase"),
      };
    case "human_handoff":
      return {
        nodeId: node.id,
        type: node.type,
        label: node.label,
        action: "human_handoff",
        detail: "queued for human",
      };
    case "exit":
      return { nodeId: node.id, type: node.type, label: node.label, action: "exit" };
    default:
      return { nodeId: node.id, type: node.type, label: node.label, action: "step" };
  }
}

export function executeJourneyDryRun(
  def: JourneyDefinition,
  visitor: VisitorContext = SAMPLE_VISITOR,
  opts: { requireValid?: boolean; maxSteps?: number } = {}
): DryRunResult {
  const validationIssues = validateJourney(def);
  const errorMessages = validationIssues
    .filter((i) => i.severity === "error")
    .map((i) => i.message);

  if (opts.requireValid !== false && errorMessages.length) {
    return {
      ok: false,
      completed: false,
      path: [],
      events: [],
      issues: errorMessages,
      visitor,
    };
  }

  const start =
    def.nodes.find((n) => n.type === "trigger" || n.type === "entry_tap") ?? def.nodes[0];
  if (!start) {
    return {
      ok: false,
      completed: false,
      path: [],
      events: [],
      issues: ["No start node"],
      visitor,
    };
  }

  const maxSteps = opts.maxSteps ?? 50;
  const path: string[] = [];
  const events: DryRunEvent[] = [];
  let current: string | undefined = start.id;
  const visited = new Set<string>();

  while (current && path.length < maxSteps) {
    if (visited.has(current)) {
      return {
        ok: false,
        completed: false,
        path,
        events,
        blockedAt: current,
        issues: [...errorMessages, `Cycle detected at ${current}`],
        visitor,
      };
    }
    visited.add(current);
    path.push(current);

    const node = def.nodes.find((n) => n.id === current);
    if (!node) {
      return {
        ok: false,
        completed: false,
        path,
        events,
        blockedAt: current,
        issues: [...errorMessages, `Missing node ${current}`],
        visitor,
      };
    }

    const step = describeAction(node, visitor);
    events.push(step);
    if (step.blocked) {
      return {
        ok: false,
        completed: false,
        path,
        events,
        blockedAt: current,
        issues: [...errorMessages, step.detail ?? "blocked"],
        visitor,
      };
    }
    if (node.type === "exit") {
      return { ok: true, completed: true, path, events, issues: errorMessages, visitor };
    }

    const edges = outgoing(def, current);
    current = pickBranch(node, edges, visitor);
  }

  const completed = events.some((s) => s.action === "exit");
  return {
    ok: completed,
    completed,
    path,
    events,
    issues:
      errorMessages.length > 0
        ? errorMessages
        : path.length >= maxSteps
          ? ["Max steps exceeded"]
          : completed
            ? []
            : ["Did not reach exit"],
    visitor,
  };
}

/** Compatibility wrapper used by earlier tests */
export function dryRunJourney(
  def: JourneyDefinition,
  ctx: VisitorRuntimeContext,
  opts: { maxSteps?: number } = {}
) {
  const result = executeJourneyDryRun(
    def,
    {
      ...SAMPLE_VISITOR,
      consent: {
        email: ctx.consentEmail ?? SAMPLE_VISITOR.consent?.email,
        marketing: ctx.consentMarketing ?? SAMPLE_VISITOR.consent?.marketing,
      },
      loyalty: {
        ...SAMPLE_VISITOR.loyalty,
        points: ctx.loyaltyBalance ?? SAMPLE_VISITOR.loyalty?.points,
      },
      attributes: ctx.attributes,
    },
    { maxSteps: opts.maxSteps, requireValid: true }
  );
  return {
    ok: result.ok,
    path: result.path,
    steps: result.events,
    blockedAt: result.blockedAt,
    issues: result.issues,
  };
}
