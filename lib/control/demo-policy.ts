export const DEMO_BLOCKED_ACTIONS = new Set([
  "audience.import.production",
  "campaign.send",
  "email.send",
  "payment.charge",
  "payment.refund",
  "provider.write.unrestricted",
  "tap_point.assign.production",
]);

export function demoPolicyDecision(action: string): {
  allowed: boolean;
  reason: string;
} {
  if (DEMO_BLOCKED_ACTIONS.has(action)) {
    return {
      allowed: false,
      reason: "Demo safety policy blocks production data, sends, money movement, and hardware assignment.",
    };
  }
  return {
    allowed: true,
    reason: "Action is inside the demo-safe operating boundary.",
  };
}

export function demoReadiness(input: {
  workspaceKind: string;
  fixtureProvenance?: string | null;
  blockedActions: string[];
  hasCardSnapshot: boolean;
}): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  if (input.workspaceKind !== "DEMO") issues.push("Workspace is not classified as DEMO.");
  if (!input.fixtureProvenance) issues.push("Fixture data provenance is missing.");
  for (const required of DEMO_BLOCKED_ACTIONS) {
    if (!input.blockedActions.includes(required)) {
      issues.push(`Required safety block is missing: ${required}`);
    }
  }
  if (!input.hasCardSnapshot) issues.push("No immutable Card publication snapshot is ready.");
  return { passed: issues.length === 0, issues };
}

