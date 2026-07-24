/**
 * TapCanvas — one canonical graph underlying Sketch / Build / Operate / Analyze & Repair.
 * Nodes are linked projections of authoritative TapConnect objects (not a decorative whiteboard).
 */

export type CanvasMode = "sketch" | "build" | "operate" | "analyze";

export type CanvasObjectKind =
  | "note"
  | "sticky"
  | "frame"
  | "connector_label"
  | "campaign"
  | "campaign_group"
  | "card"
  | "offer"
  | "tapflow"
  | "email_sequence"
  | "loyalty"
  | "tap_point"
  | "external_work_item"
  | "wait"
  | "trigger"
  | "action"
  | "funnel_step"
  | "deployment_slot"
  | "tiktok_cast"
  | "unknown";

/** Sketch-only kinds never execute until promoted */
export const SKETCH_ONLY_KINDS: ReadonlySet<CanvasObjectKind> = new Set([
  "note",
  "sticky",
  "frame",
  "connector_label",
]);

export type LinkedObjectRef = {
  type: CanvasObjectKind;
  id: string;
  /** Optional provider for ExternalWorkItem */
  provider?: string;
};

export type CanvasNode = {
  id: string;
  kind: CanvasObjectKind;
  label: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  /** Freeform sketch payload — does not execute */
  sketch?: boolean;
  data?: Record<string, unknown>;
  linked?: LinkedObjectRef | null;
  /** Operate overlay */
  liveStatus?: string;
  warnings?: string[];
  createdAt: string;
  updatedAt: string;
};

export type CanvasEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
  kind?: "flow" | "association" | "sketch" | "approval";
  /** Sketch connectors never execute */
  sketch?: boolean;
  data?: Record<string, unknown>;
};

export type CanvasVersion = {
  id: string;
  canvasId: string;
  version: number;
  label: string;
  snapshot: { nodes: CanvasNode[]; edges: CanvasEdge[]; mode: CanvasMode };
  createdAt: string;
  createdBy?: string;
};

export type AutomationProposal = {
  id: string;
  canvasId: string;
  title: string;
  description: string;
  severity: "info" | "warn" | "critical";
  status: "pending" | "accepted" | "rejected" | "previewed";
  /** Patch preview — never applied until accepted */
  proposedPatch: {
    nodes?: Partial<CanvasNode>[];
    edges?: Partial<CanvasEdge>[];
    removeNodeIds?: string[];
    notes?: string;
  };
  createdAt: string;
  resolvedAt?: string;
};

export type CanvasAuditEntry = {
  id: string;
  canvasId: string;
  action: string;
  detail: Record<string, unknown>;
  at: string;
};

export type TapCanvas = {
  id: string;
  businessId: string;
  name: string;
  mode: CanvasMode;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type PromotionWarning = {
  code:
    | "missing_facts"
    | "missing_credentials"
    | "guardian_block"
    | "schedule_conflict"
    | "provider_required"
    | "unlinked_sketch"
    | "device_url_immutable";
  message: string;
  nodeId?: string;
  alternatives?: string[];
};

export type PromotionResult = {
  ok: boolean;
  canvas: TapCanvas;
  promoted: LinkedObjectRef[];
  warnings: PromotionWarning[];
  undoVersionId: string;
};

export type CanvasTemplateId =
  | "simple_campaign"
  | "weekly_specials"
  | "campaign_group"
  | "card"
  | "offer"
  | "funnel"
  | "email_sequence"
  | "tapflow"
  | "loyalty"
  | "deployment_map"
  | "service_approval";

export type ConversationalActionId =
  | "send_email"
  | "send_dm"
  | "send_sms"
  | "create_work_item"
  | "assign_tap_point"
  | "wait"
  | "tag_contact"
  | "open_wallet";

export type ConversationalTriggerId =
  | "tap_scan"
  | "keep_card"
  | "keyword"
  | "schedule"
  | "work_item_completed"
  | "tiktok_engagement";
