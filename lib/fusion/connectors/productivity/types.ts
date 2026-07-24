/**
 * Productivity & Work Management — canonical ExternalWorkItem + provider catalog.
 * TapConnect stays authoritative for Cards/Campaigns/Contacts/etc.
 * Connected platforms stay authoritative for their native work-item state.
 */

export type WorkProviderKind =
  | "work_board" // monday, Asana, ClickUp, Planner, Jira, Trello, GitHub Issues, Airtable
  | "collab_chat" // Slack, Teams
  | "docs_knowledge" // Notion, Drive, OneDrive, Outlook mail as knowledge source
  | "calendar" // Google Calendar, Outlook calendar
  | "automation"; // Zapier, Make, n8n

export type WorkCapability =
  | "oauth"
  | "api_key"
  | "workspace_discovery"
  | "project_discovery"
  | "create_item"
  | "update_item"
  | "assign"
  | "due_date"
  | "priority"
  | "status"
  | "custom_fields"
  | "comments"
  | "attachments"
  | "deep_links"
  | "webhooks"
  | "polling"
  | "status_sync"
  | "assignee_sync"
  | "due_date_sync"
  | "conflict_handling"
  | "retries"
  | "idempotency"
  | "health"
  | "disconnect"
  | "audit"
  | "analytics"
  | "alerts"
  | "approvals"
  | "interactive_actions"
  | "incident_notifications"
  | "human_handoff"
  | "knowledge_ingest"
  | "triggers"
  | "actions"
  | "signed_webhooks"
  | "event_subscriptions"
  | "rate_limits";

/** Comment / update on a canonical work item (provider-agnostic) */
export type ExternalWorkComment = {
  id: string;
  body: string;
  authorExternalId?: string;
  createdAt: string;
};

export type ExternalWorkAttachment = {
  id: string;
  name: string;
  url: string;
  mimeType?: string;
  createdAt: string;
};

/** Discovered workspace / project / board from a connected provider */
export type DiscoveredWorkspace = {
  externalId: string;
  name: string;
  kind: "workspace" | "project" | "board" | "list" | "repo" | "calendar" | "drive" | "base";
};

/** Canonical external work item — one model for all providers */
export type ExternalWorkItem = {
  id: string;
  provider: string;
  externalId: string;
  title: string;
  description?: string;
  status?: string;
  priority?: "urgent" | "high" | "normal" | "low" | string;
  assigneeExternalIds?: string[];
  dueAt?: string | null;
  url?: string;
  parentExternalId?: string;
  projectExternalId?: string;
  workspaceExternalId?: string;
  customFields?: Record<string, unknown>;
  labels?: string[];
  comments?: ExternalWorkComment[];
  attachments?: ExternalWorkAttachment[];
  /** TapConnect correlation */
  sourceType?: WorkBridgeSourceType;
  sourceId?: string;
  businessId?: string;
  correlationId?: string;
  idempotencyKey?: string;
  /** Sync bookkeeping */
  syncStatus?: "local_only" | "pushed" | "synced" | "conflict" | "failed";
  lastSyncedAt?: string;
  lastError?: string;
  retryCount?: number;
  raw?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type WorkBridgeSourceType =
  | "tapcase"
  | "campaign_approval"
  | "agent_finding"
  | "provider_failure"
  | "tap_point_failure"
  | "inbox_followup"
  | "booking_order"
  | "loyalty_commerce_exception"
  | "manual"
  | "other";

export type WorkItemCreateInput = {
  provider: string;
  businessId: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeExternalIds?: string[];
  dueAt?: string | null;
  projectExternalId?: string;
  workspaceExternalId?: string;
  customFields?: Record<string, unknown>;
  sourceType: WorkBridgeSourceType;
  sourceId?: string;
  correlationId?: string;
  idempotencyKey?: string;
  deepLinkBack?: string;
};

export type WorkAdapterResult<T> =
  | { ok: true; data: T; mode: "mock" | "live" }
  | { ok: false; error: string; code: string };

export type WorkProviderDefinition = {
  id: string;
  name: string;
  kind: WorkProviderKind;
  /** Customer-facing category — always Productivity & Work Management */
  categoryLabel: "Productivity & Work Management";
  capabilities: WorkCapability[];
  requiredEnvVars: string[];
  oauth: boolean;
  supportsMock: boolean;
  documentation: string;
  signupUrl?: string;
  notes?: string;
};

const DOC = "docs/fusion/INTEGRATION_AND_CREDENTIAL_REQUIREMENTS.md";
const CAT = "Productivity & Work Management" as const;

const BOARD_CAPS: WorkCapability[] = [
  "oauth",
  "workspace_discovery",
  "project_discovery",
  "create_item",
  "update_item",
  "assign",
  "due_date",
  "priority",
  "status",
  "custom_fields",
  "comments",
  "attachments",
  "deep_links",
  "webhooks",
  "polling",
  "status_sync",
  "assignee_sync",
  "due_date_sync",
  "conflict_handling",
  "retries",
  "idempotency",
  "health",
  "disconnect",
  "audit",
  "analytics",
];

const COLLAB_CAPS: WorkCapability[] = [
  "oauth",
  "webhooks",
  "comments",
  "deep_links",
  "alerts",
  "approvals",
  "interactive_actions",
  "incident_notifications",
  "human_handoff",
  "retries",
  "idempotency",
  "health",
  "disconnect",
  "audit",
  "analytics",
];

const DOCS_CAPS_FIXED: WorkCapability[] = [
  "oauth",
  "workspace_discovery",
  "knowledge_ingest",
  "deep_links",
  "polling",
  "attachments",
  "health",
  "disconnect",
  "audit",
];

const AUTOMATION_CAPS: WorkCapability[] = [
  "api_key",
  "oauth",
  "signed_webhooks",
  "triggers",
  "actions",
  "event_subscriptions",
  "idempotency",
  "rate_limits",
  "retries",
  "health",
  "disconnect",
  "audit",
  "analytics",
];

export const PRODUCTIVITY_PROVIDERS: WorkProviderDefinition[] = [
  {
    id: "monday",
    name: "monday.com",
    kind: "work_board",
    categoryLabel: CAT,
    capabilities: BOARD_CAPS,
    requiredEnvVars: ["MONDAY_CLIENT_ID", "MONDAY_CLIENT_SECRET"],
    oauth: true,
    supportsMock: true,
    documentation: DOC,
    signupUrl: "https://monday.com",
  },
  {
    id: "asana",
    name: "Asana",
    kind: "work_board",
    categoryLabel: CAT,
    capabilities: BOARD_CAPS,
    requiredEnvVars: ["ASANA_CLIENT_ID", "ASANA_CLIENT_SECRET"],
    oauth: true,
    supportsMock: true,
    documentation: DOC,
    signupUrl: "https://asana.com",
  },
  {
    id: "clickup",
    name: "ClickUp",
    kind: "work_board",
    categoryLabel: CAT,
    capabilities: BOARD_CAPS,
    requiredEnvVars: ["CLICKUP_CLIENT_ID", "CLICKUP_CLIENT_SECRET"],
    oauth: true,
    supportsMock: true,
    documentation: DOC,
    signupUrl: "https://clickup.com",
  },
  {
    id: "microsoft_planner",
    name: "Microsoft Planner",
    kind: "work_board",
    categoryLabel: CAT,
    capabilities: BOARD_CAPS,
    requiredEnvVars: [
      "MICROSOFT_GRAPH_CLIENT_ID",
      "MICROSOFT_GRAPH_CLIENT_SECRET",
      "MICROSOFT_GRAPH_TENANT_ID",
    ],
    oauth: true,
    supportsMock: true,
    documentation: DOC,
    signupUrl: "https://www.microsoft.com/microsoft-365/planner",
  },
  {
    id: "microsoft_teams",
    name: "Microsoft Teams",
    kind: "collab_chat",
    categoryLabel: CAT,
    capabilities: COLLAB_CAPS,
    requiredEnvVars: [
      "MICROSOFT_GRAPH_CLIENT_ID",
      "MICROSOFT_GRAPH_CLIENT_SECRET",
      "MICROSOFT_GRAPH_TENANT_ID",
    ],
    oauth: true,
    supportsMock: true,
    documentation: DOC,
    signupUrl: "https://www.microsoft.com/microsoft-teams",
    notes: "Alerts, approvals, interactive actions, incident handoffs",
  },
  {
    id: "slack",
    name: "Slack",
    kind: "collab_chat",
    categoryLabel: CAT,
    capabilities: COLLAB_CAPS,
    requiredEnvVars: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"],
    oauth: true,
    supportsMock: true,
    documentation: DOC,
    signupUrl: "https://api.slack.com",
    notes: "Alerts, approvals, interactive actions, incident handoffs",
  },
  {
    id: "notion",
    name: "Notion",
    kind: "docs_knowledge",
    categoryLabel: CAT,
    capabilities: [...DOCS_CAPS_FIXED, "create_item", "update_item", "comments"],
    requiredEnvVars: ["NOTION_CLIENT_ID", "NOTION_CLIENT_SECRET"],
    oauth: true,
    supportsMock: true,
    documentation: DOC,
    signupUrl: "https://www.notion.so",
    notes: "Grounded Knowledge ingestion for TapGuide + Autopilot",
  },
  {
    id: "jira",
    name: "Jira",
    kind: "work_board",
    categoryLabel: CAT,
    capabilities: BOARD_CAPS,
    requiredEnvVars: ["JIRA_CLIENT_ID", "JIRA_CLIENT_SECRET"],
    oauth: true,
    supportsMock: true,
    documentation: DOC,
    signupUrl: "https://www.atlassian.com/software/jira",
  },
  {
    id: "trello",
    name: "Trello",
    kind: "work_board",
    categoryLabel: CAT,
    capabilities: BOARD_CAPS,
    requiredEnvVars: ["TRELLO_API_KEY", "TRELLO_API_SECRET"],
    oauth: true,
    supportsMock: true,
    documentation: DOC,
    signupUrl: "https://trello.com",
  },
  {
    id: "github",
    name: "GitHub",
    kind: "work_board",
    categoryLabel: CAT,
    capabilities: BOARD_CAPS,
    requiredEnvVars: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
    oauth: true,
    supportsMock: true,
    documentation: DOC,
    signupUrl: "https://github.com",
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    kind: "calendar",
    categoryLabel: CAT,
    capabilities: [
      "oauth",
      "create_item",
      "update_item",
      "due_date",
      "deep_links",
      "webhooks",
      "polling",
      "health",
      "disconnect",
      "audit",
    ],
    requiredEnvVars: ["GOOGLE_CALENDAR_CLIENT_ID", "GOOGLE_CALENDAR_CLIENT_SECRET"],
    oauth: true,
    supportsMock: true,
    documentation: DOC,
    signupUrl: "https://console.cloud.google.com",
  },
  {
    id: "google_drive",
    name: "Google Drive",
    kind: "docs_knowledge",
    categoryLabel: CAT,
    capabilities: DOCS_CAPS_FIXED,
    requiredEnvVars: ["GOOGLE_DRIVE_CLIENT_ID", "GOOGLE_DRIVE_CLIENT_SECRET"],
    oauth: true,
    supportsMock: true,
    documentation: DOC,
    signupUrl: "https://console.cloud.google.com",
    notes: "Knowledge ingestion for TapGuide + Autopilot",
  },
  {
    id: "microsoft_outlook",
    name: "Microsoft Outlook",
    kind: "calendar",
    categoryLabel: CAT,
    capabilities: [
      "oauth",
      "create_item",
      "update_item",
      "due_date",
      "deep_links",
      "webhooks",
      "knowledge_ingest",
      "health",
      "disconnect",
      "audit",
    ],
    requiredEnvVars: [
      "MICROSOFT_GRAPH_CLIENT_ID",
      "MICROSOFT_GRAPH_CLIENT_SECRET",
      "MICROSOFT_GRAPH_TENANT_ID",
    ],
    oauth: true,
    supportsMock: true,
    documentation: DOC,
    signupUrl: "https://www.microsoft.com/microsoft-365/outlook",
  },
  {
    id: "onedrive",
    name: "OneDrive",
    kind: "docs_knowledge",
    categoryLabel: CAT,
    capabilities: DOCS_CAPS_FIXED,
    requiredEnvVars: [
      "MICROSOFT_GRAPH_CLIENT_ID",
      "MICROSOFT_GRAPH_CLIENT_SECRET",
      "MICROSOFT_GRAPH_TENANT_ID",
    ],
    oauth: true,
    supportsMock: true,
    documentation: DOC,
    signupUrl: "https://www.microsoft.com/microsoft-365/onedrive",
    notes: "Knowledge ingestion for TapGuide + Autopilot",
  },
  {
    id: "airtable",
    name: "Airtable",
    kind: "work_board",
    categoryLabel: CAT,
    capabilities: BOARD_CAPS,
    requiredEnvVars: ["AIRTABLE_CLIENT_ID", "AIRTABLE_CLIENT_SECRET"],
    oauth: true,
    supportsMock: true,
    documentation: DOC,
    signupUrl: "https://airtable.com",
  },
  {
    id: "zapier",
    name: "Zapier",
    kind: "automation",
    categoryLabel: CAT,
    capabilities: AUTOMATION_CAPS,
    requiredEnvVars: ["ZAPIER_WEBHOOK_SIGNING_SECRET"],
    oauth: false,
    supportsMock: true,
    documentation: DOC,
    signupUrl: "https://zapier.com",
    notes: "Public API + signed webhooks + triggers/actions",
  },
  {
    id: "make",
    name: "Make",
    kind: "automation",
    categoryLabel: CAT,
    capabilities: AUTOMATION_CAPS,
    requiredEnvVars: ["MAKE_WEBHOOK_SIGNING_SECRET"],
    oauth: false,
    supportsMock: true,
    documentation: DOC,
    signupUrl: "https://www.make.com",
  },
  {
    id: "n8n",
    name: "n8n",
    kind: "automation",
    categoryLabel: CAT,
    capabilities: AUTOMATION_CAPS,
    requiredEnvVars: ["N8N_WEBHOOK_SIGNING_SECRET"],
    oauth: false,
    supportsMock: true,
    documentation: DOC,
    signupUrl: "https://n8n.io",
  },
];

export function getProductivityProvider(id: string): WorkProviderDefinition | undefined {
  return PRODUCTIVITY_PROVIDERS.find((p) => p.id === id);
}

export function listProductivityProviders(kind?: WorkProviderKind): WorkProviderDefinition[] {
  if (!kind) return PRODUCTIVITY_PROVIDERS;
  return PRODUCTIVITY_PROVIDERS.filter((p) => p.kind === kind);
}

export function productivityProviderLiveReady(id: string): boolean {
  const def = getProductivityProvider(id);
  if (!def || def.requiredEnvVars.length === 0) return false;
  return def.requiredEnvVars.every((k) => Boolean(process.env[k]?.trim()));
}
