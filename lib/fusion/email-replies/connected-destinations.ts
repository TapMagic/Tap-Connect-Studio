/**
 * Existing integrations as reply destinations — capability-honest registration.
 * Does not rebuild Zapier/Monday/ManyChat.
 */

import type { ReplyCapability, ReplyDestinationType } from "./types";
import {
  ONE_WAY_INTEGRATION_CAPABILITIES,
  WEBHOOK_CAPABILITIES,
  describeDestinationCapabilities,
} from "./capabilities";

export type ConnectedReplyDestinationOption = {
  id: string;
  name: string;
  integrationKind: "monday" | "zapier" | "webhook" | "manychat";
  destinationType: ReplyDestinationType;
  capabilities: ReplyCapability[];
  canReceiveCustomerActivity: boolean;
  hostSummary: ReturnType<typeof describeDestinationCapabilities>;
  intakeHint?: string;
};

const CATALOG: ConnectedReplyDestinationOption[] = [
  {
    id: "monday.email_to_board",
    name: "Monday",
    integrationKind: "monday",
    destinationType: "EMAIL_ADDRESS",
    capabilities: [...ONE_WAY_INTEGRATION_CAPABILITIES],
    canReceiveCustomerActivity: true,
    hostSummary: describeDestinationCapabilities([...ONE_WAY_INTEGRATION_CAPABILITIES]),
    intakeHint: "Use your Monday board email intake address as the destination.",
  },
  {
    id: "zapier.webhook_handoff",
    name: "Zapier",
    integrationKind: "zapier",
    destinationType: "WEBHOOK",
    capabilities: [...WEBHOOK_CAPABILITIES],
    canReceiveCustomerActivity: true,
    hostSummary: describeDestinationCapabilities([...WEBHOOK_CAPABILITIES]),
    intakeHint: "Zapier catch hook receives structured TapConnect handoff events.",
  },
  {
    id: "webhook.structured",
    name: "Webhook",
    integrationKind: "webhook",
    destinationType: "WEBHOOK",
    capabilities: [...WEBHOOK_CAPABILITIES],
    canReceiveCustomerActivity: true,
    hostSummary: describeDestinationCapabilities([...WEBHOOK_CAPABILITIES]),
  },
];

/** ManyChat is messaging — not an honest email reply destination in this wave */
export function listConnectedReplyDestinations(): ConnectedReplyDestinationOption[] {
  return CATALOG.filter((c) => c.canReceiveCustomerActivity);
}

export function getConnectedReplyDestination(
  id: string
): ConnectedReplyDestinationOption | null {
  return listConnectedReplyDestinations().find((c) => c.id === id) ?? null;
}
