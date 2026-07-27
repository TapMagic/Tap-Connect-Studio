/**
 * Destination capability model — host language, not raw keys in primary UX.
 */

import type {
  ReplyCapability,
  ReplyDestinationType,
  ReplyHandlingMode,
  FeatureCapabilitySet,
  ReplyVisibilityBoundary,
} from "./types";

export const EMAIL_DESTINATION_CAPABILITIES: readonly ReplyCapability[] = [
  "receive_initial_handoff",
  "receive_original_message",
  "receive_normalized_context",
  "receive_attachments",
] as const;

export const TAP_INBOX_CAPABILITIES: readonly ReplyCapability[] = [
  "receive_initial_handoff",
  "receive_original_message",
  "receive_normalized_context",
  "receive_attachments",
  "return_delivery_status",
  "return_assignment",
  "return_work_status",
  "return_resolution",
  "return_full_thread",
  "supports_reply",
  "supports_bidirectional_sync",
] as const;

export const DIRECT_REPLY_TO_CAPABILITIES: readonly ReplyCapability[] = [] as const;

/** Monday / email-intake style one-way handoff */
export const ONE_WAY_INTEGRATION_CAPABILITIES: readonly ReplyCapability[] = [
  "receive_initial_handoff",
  "receive_normalized_context",
  "create_external_item",
] as const;

export const WEBHOOK_CAPABILITIES: readonly ReplyCapability[] = [
  "receive_initial_handoff",
  "receive_normalized_context",
  "create_external_item",
] as const;

const CAPABILITY_HOST_LABEL: Record<ReplyCapability, string> = {
  receive_initial_handoff: "Receives the initial customer reply handoff",
  receive_original_message: "May receive the original message content",
  receive_normalized_context: "Receives customer and Campaign context",
  receive_attachments: "May receive attachments",
  return_delivery_status: "Can report delivery status back to TapConnect",
  return_assignment: "Can report who is assigned",
  return_work_status: "Can report work status",
  return_resolution: "Can report resolution",
  return_full_thread: "Can sync the continuing conversation",
  create_external_item: "Can create an item in the external system",
  update_external_item: "Can update an external item",
  open_external_item: "Can open a link to the external item",
  supports_reply: "Supports replies inside TapConnect",
  supports_bidirectional_sync: "Supports two-way sync",
};

export function capabilitiesForDestinationType(
  type: ReplyDestinationType,
  extras: ReplyCapability[] = []
): ReplyCapability[] {
  const base: readonly ReplyCapability[] =
    type === "EMAIL_ADDRESS"
      ? EMAIL_DESTINATION_CAPABILITIES
      : type === "TAP_INBOX"
        ? TAP_INBOX_CAPABILITIES
        : type === "DIRECT_REPLY_TO"
          ? DIRECT_REPLY_TO_CAPABILITIES
          : type === "WEBHOOK"
            ? WEBHOOK_CAPABILITIES
            : ONE_WAY_INTEGRATION_CAPABILITIES;
  return Array.from(new Set([...base, ...extras]));
}

export function capabilityHostLabel(cap: ReplyCapability): string {
  return CAPABILITY_HOST_LABEL[cap];
}

export function describeDestinationCapabilities(caps: ReplyCapability[]): {
  receives: string[];
  returns: string[];
  connectionType: "one-way handoff" | "bidirectional";
} {
  const receiveKeys: ReplyCapability[] = [
    "receive_initial_handoff",
    "receive_original_message",
    "receive_normalized_context",
    "receive_attachments",
    "create_external_item",
  ];
  const returnKeys: ReplyCapability[] = [
    "return_delivery_status",
    "return_assignment",
    "return_work_status",
    "return_resolution",
    "return_full_thread",
    "update_external_item",
    "open_external_item",
    "supports_reply",
    "supports_bidirectional_sync",
  ];
  const receives = receiveKeys
    .filter((k) => caps.includes(k))
    .map(capabilityHostLabel);
  const returnsPresent = returnKeys.filter((k) => caps.includes(k));
  const returns =
    returnsPresent.length > 0
      ? returnsPresent.map(capabilityHostLabel)
      : [
          "Assignment unavailable",
          "Resolution unavailable",
          "Continuing conversation unavailable",
        ];
  return {
    receives,
    returns,
    connectionType: caps.includes("supports_bidirectional_sync")
      ? "bidirectional"
      : "one-way handoff",
  };
}

export function visibilityBoundaryForMode(
  mode: ReplyHandlingMode,
  externalSystemLabel = "your external system"
): ReplyVisibilityBoundary {
  switch (mode) {
    case "TAP_ROUTE_EXTERNAL":
    case "CONNECTED_DESTINATION":
      return {
        tapTracks: [
          "Initial reply",
          "Classification (when enabled)",
          "Destination",
          "Routing result",
        ],
        externalTracks: ["Assignment", "Response", "Resolution"],
        summary: `TapConnect records the initial reply and confirms the handoff. Follow-up, assignment, response, and resolution remain in ${externalSystemLabel}.`,
      };
    case "TAP_INBOX":
      return {
        tapTracks: [
          "Conversation",
          "Cases",
          "Reply assistance (when enabled)",
          "Conversation Insights",
        ],
        externalTracks: [],
        summary:
          "TapConnect retains the conversation and can support reply assistance, Cases, and conversation Insights.",
      };
    case "DIRECT_EXTERNAL":
      return {
        tapTracks: [
          "Email delivery status",
          "Clicks",
          "Tap and Card activity",
          "Claims and conversions",
        ],
        externalTracks: ["The full conversation"],
        summary:
          "Replies will go directly to this address. TapConnect will not receive or track the conversation.",
      };
  }
}

export function featureCapabilitiesForMode(
  mode: ReplyHandlingMode,
  connectedCaps: ReplyCapability[] = []
): FeatureCapabilitySet {
  const alwaysOn = [
    "Email delivery status",
    "Clicks",
    "Tap/Card activity",
    "Claims",
    "Contact Gather",
    "TapSave",
    "Conversion attribution",
  ];

  if (mode === "DIRECT_EXTERNAL") {
    return {
      available: alwaysOn,
      unavailable: [
        "Reply arrival",
        "Initial classification",
        "Routing evidence",
        "Tap conversation tracking",
        "Reply assistance",
      ],
      explanations: {
        "Reply arrival":
          "Replies bypass TapConnect because Direct external Reply-To is active.",
        "Routing evidence": "TapConnect never receives the reply in this mode.",
      },
    };
  }

  if (mode === "TAP_INBOX") {
    return {
      available: [
        ...alwaysOn,
        "Reply arrival",
        "Initial classification",
        "Tap conversation tracking",
        "Cases",
        "Reply assistance",
        "Conversation Insights",
      ],
      unavailable: [],
      explanations: {},
    };
  }

  if (mode === "CONNECTED_DESTINATION") {
    const available = [
      ...alwaysOn,
      "Initial reply",
      "Initial classification",
      "Routing evidence",
      "Routing-failure recovery",
    ];
    const unavailable: string[] = [];
    const explanations: Record<string, string> = {};
    if (!connectedCaps.includes("return_full_thread")) {
      unavailable.push("Full thread");
      explanations["Full thread"] =
        "This connection is a one-way handoff unless the connector returns thread updates.";
    }
    if (!connectedCaps.includes("return_assignment")) {
      unavailable.push("External assignment");
      explanations["External assignment"] =
        "Assignment stays in the connected system until a connector returns it.";
    }
    if (!connectedCaps.includes("return_resolution")) {
      unavailable.push("Resolution");
      explanations["Resolution"] =
        "Resolution is managed externally unless the connector returns it.";
    }
    return { available, unavailable, explanations };
  }

  // TAP_ROUTE_EXTERNAL
  return {
    available: [
      ...alwaysOn,
      "Initial reply",
      "Initial classification",
      "Routing evidence",
      "Routing-failure recovery",
    ],
    unavailable: [
      "Full thread",
      "Response",
      "Resolution",
      "External assignment",
      "Continuing Autopilot reply work",
    ],
    explanations: {
      "Full thread":
        "Follow-up stays in your external inbox or system after the handoff.",
      Resolution:
        "TapConnect does not invent resolution from a one-way handoff.",
    },
  };
}

/** Insights must not invent external resolution metrics */
export const INSIGHTS_ALLOWED_REPLY_METRICS = [
  "replies_received_by_tap",
  "replies_routed",
  "route_success_rate",
  "reply_source_campaign",
  "broad_initial_categories",
  "routing_failures",
] as const;

export const INSIGHTS_FORBIDDEN_WITHOUT_CONNECTOR = [
  "external_response_time",
  "external_resolution_rate",
  "ticket_closure",
  "assignment_performance",
  "continuing_sentiment",
] as const;

export function isHonestInsightMetric(
  metric: string,
  hasBidirectionalEvidence: boolean
): boolean {
  if (
    (INSIGHTS_FORBIDDEN_WITHOUT_CONNECTOR as readonly string[]).includes(metric)
  ) {
    return hasBidirectionalEvidence;
  }
  return (INSIGHTS_ALLOWED_REPLY_METRICS as readonly string[]).includes(metric);
}
