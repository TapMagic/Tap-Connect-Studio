/**
 * Provider-neutral connector contracts + ExternalWorkItem projection.
 */

export type ConnectorCapability =
  | "oauth"
  | "import"
  | "export"
  | "sync"
  | "webhooks"
  | "create_task"
  | "update_task"
  | "comments"
  | "files";

export type ExternalWorkItem = {
  id: string;
  provider: string;
  externalId: string;
  title: string;
  status?: string;
  assigneeExternalIds?: string[];
  dueAt?: string;
  url?: string;
  parentExternalId?: string;
  raw?: Record<string, unknown>;
};

export type ConnectorDefinition = {
  id: string;
  name: string;
  category: "productivity" | "crm" | "comms" | "payments" | "media" | "other";
  capabilities: ConnectorCapability[];
  requiredEnvVars: string[];
  oauth?: boolean;
  documentation: string;
};

export const CONNECTOR_DEFINITIONS: ConnectorDefinition[] = [
  {
    id: "monday",
    name: "monday.com",
    category: "productivity",
    capabilities: ["oauth", "import", "export", "sync", "webhooks", "create_task", "update_task", "comments", "files"],
    requiredEnvVars: ["MONDAY_CLIENT_ID", "MONDAY_CLIENT_SECRET"],
    oauth: true,
    documentation: "docs/fusion/INTEGRATION_AND_CREDENTIAL_REQUIREMENTS.md",
  },
  {
    id: "asana",
    name: "Asana",
    category: "productivity",
    capabilities: ["oauth", "import", "sync", "webhooks", "create_task", "update_task", "comments"],
    requiredEnvVars: ["ASANA_CLIENT_ID", "ASANA_CLIENT_SECRET"],
    oauth: true,
    documentation: "docs/fusion/INTEGRATION_AND_CREDENTIAL_REQUIREMENTS.md",
  },
  {
    id: "clickup",
    name: "ClickUp",
    category: "productivity",
    capabilities: ["oauth", "import", "sync", "webhooks", "create_task", "update_task", "comments"],
    requiredEnvVars: ["CLICKUP_CLIENT_ID", "CLICKUP_CLIENT_SECRET"],
    oauth: true,
    documentation: "docs/fusion/INTEGRATION_AND_CREDENTIAL_REQUIREMENTS.md",
  },
  {
    id: "microsoft_planner",
    name: "Microsoft Planner",
    category: "productivity",
    capabilities: ["oauth", "import", "sync", "create_task", "update_task"],
    requiredEnvVars: [
      "MICROSOFT_GRAPH_CLIENT_ID",
      "MICROSOFT_GRAPH_CLIENT_SECRET",
      "MICROSOFT_GRAPH_TENANT_ID",
    ],
    oauth: true,
    documentation: "docs/fusion/INTEGRATION_AND_CREDENTIAL_REQUIREMENTS.md",
  },
  {
    id: "jira",
    name: "Jira",
    category: "productivity",
    capabilities: ["oauth", "import", "sync", "webhooks", "create_task", "update_task", "comments"],
    requiredEnvVars: ["JIRA_CLIENT_ID", "JIRA_CLIENT_SECRET"],
    oauth: true,
    documentation: "docs/fusion/INTEGRATION_AND_CREDENTIAL_REQUIREMENTS.md",
  },
  {
    id: "trello",
    name: "Trello",
    category: "productivity",
    capabilities: ["oauth", "import", "sync", "webhooks", "create_task", "update_task", "comments"],
    requiredEnvVars: ["TRELLO_API_KEY", "TRELLO_API_SECRET"],
    oauth: true,
    documentation: "docs/fusion/INTEGRATION_AND_CREDENTIAL_REQUIREMENTS.md",
  },
  {
    id: "notion",
    name: "Notion",
    category: "productivity",
    capabilities: ["oauth", "import", "export", "sync"],
    requiredEnvVars: ["NOTION_CLIENT_ID", "NOTION_CLIENT_SECRET"],
    oauth: true,
    documentation: "docs/fusion/INTEGRATION_AND_CREDENTIAL_REQUIREMENTS.md",
  },
  {
    id: "slack",
    name: "Slack",
    category: "comms",
    capabilities: ["oauth", "webhooks", "comments"],
    requiredEnvVars: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"],
    oauth: true,
    documentation: "docs/fusion/INTEGRATION_AND_CREDENTIAL_REQUIREMENTS.md",
  },
  {
    id: "microsoft_teams",
    name: "Microsoft Teams",
    category: "comms",
    capabilities: ["oauth", "webhooks", "comments"],
    requiredEnvVars: [
      "MICROSOFT_GRAPH_CLIENT_ID",
      "MICROSOFT_GRAPH_CLIENT_SECRET",
      "MICROSOFT_GRAPH_TENANT_ID",
    ],
    oauth: true,
    documentation: "docs/fusion/INTEGRATION_AND_CREDENTIAL_REQUIREMENTS.md",
  },
  {
    id: "github",
    name: "GitHub",
    category: "productivity",
    capabilities: ["oauth", "webhooks", "create_task", "update_task", "comments"],
    requiredEnvVars: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
    oauth: true,
    documentation: "docs/fusion/INTEGRATION_AND_CREDENTIAL_REQUIREMENTS.md",
  },
];

export function connectorReady(id: string): boolean {
  const def = CONNECTOR_DEFINITIONS.find((c) => c.id === id);
  if (!def) return false;
  return def.requiredEnvVars.every((k) => Boolean(process.env[k]?.trim()));
}
