/**
 * Freeform canvas model — compiles to bounded versioned render manifests.
 * No arbitrary HTML/CSS/JS for ordinary users.
 */

export type FreeformNode = {
  id: string;
  blockLibraryId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex: number;
  locked?: boolean;
  hidden?: boolean;
  /** Structured payload compatible with V1 blocks / card sections */
  props: Record<string, unknown>;
};

export type FreeformManifest = {
  version: 1;
  mode: "freeform";
  width: number;
  height: number;
  nodes: FreeformNode[];
  /** Optional conversion target */
  structuredHint?: "stack" | "sections";
};

export type VisualReferenceJob = {
  id: string;
  sourceType: "screenshot" | "image" | "pdf" | "url" | "brochure" | "slide" | "design_export";
  sourceUrl?: string;
  status: "queued" | "processing" | "preview" | "applied" | "rejected";
  warnings: string[];
  manifestPreview?: FreeformManifest;
};

export function emptyFreeformManifest(width = 390, height = 844): FreeformManifest {
  return { version: 1, mode: "freeform", width, height, nodes: [] };
}

export function freeformToStructuredSections(manifest: FreeformManifest): {
  order: string[];
  nodes: FreeformNode[];
} {
  const sorted = [...manifest.nodes]
    .filter((n) => !n.hidden)
    .sort((a, b) => a.y - b.y || a.zIndex - b.zIndex || a.x - b.x);
  return { order: sorted.map((n) => n.id), nodes: sorted };
}
