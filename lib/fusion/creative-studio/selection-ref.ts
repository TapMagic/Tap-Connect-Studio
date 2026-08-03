export type CreativeObjectKind =
  | "document"
  | "page"
  | "root_surface"
  | "section"
  | "element"
  | "group"
  | "nested_composition"
  | "button_content"
  | "reusable_instance";

export type SelectionRef = Readonly<{
  documentId: string;
  pageId: string;
  revision: number;
  objectKind: CreativeObjectKind;
  objectId: string;
  parentId: string | null;
  childPath: readonly string[];
  selectionGeneration: number;
}>;

export type SelectionAuthority = Readonly<{
  documentId: string;
  pageId: string;
  revision: number;
  selectionGeneration: number;
  objects: ReadonlyMap<string, { kind: CreativeObjectKind; parentId: string | null }>;
}>;

export type SelectionValidation =
  | { ok: true; target: { kind: CreativeObjectKind; parentId: string | null } }
  | {
      ok: false;
      reason:
        | "different_document"
        | "different_page"
        | "stale_revision"
        | "stale_selection"
        | "missing_target"
        | "wrong_kind"
        | "wrong_parent";
      message: string;
    };

export class StaleSelectionError extends Error {
  readonly code = "STALE_SELECTION";
  constructor(readonly reason: Exclude<SelectionValidation, { ok: true }>['reason']) {
    super("That object is no longer the active selection. Reselect it and try again.");
    this.name = "StaleSelectionError";
  }
}

export function validateSelectionRef(
  selection: SelectionRef,
  authority: SelectionAuthority
): SelectionValidation {
  if (selection.documentId !== authority.documentId) {
    return failure("different_document", "Selection belongs to another document.");
  }
  if (selection.pageId !== authority.pageId) {
    return failure("different_page", "Selection belongs to another page.");
  }
  if (selection.revision !== authority.revision) {
    return failure("stale_revision", "Selection was created for an older document revision.");
  }
  if (selection.selectionGeneration !== authority.selectionGeneration) {
    return failure("stale_selection", "Selection changed before the mutation was applied.");
  }
  const target = authority.objects.get(selection.objectId);
  if (!target) return failure("missing_target", "The selected object no longer exists.");
  if (target.kind !== selection.objectKind) {
    return failure("wrong_kind", "The selected object changed type.");
  }
  if (target.parentId !== selection.parentId) {
    return failure("wrong_parent", "The selected object moved to a different parent.");
  }
  return { ok: true, target };
}

export function requireCurrentSelection(
  selection: SelectionRef,
  authority: SelectionAuthority
): void {
  const validation = validateSelectionRef(selection, authority);
  if (!validation.ok) throw new StaleSelectionError(validation.reason);
}

function failure(
  reason: Exclude<SelectionValidation, { ok: true }>['reason'],
  message: string
): SelectionValidation {
  return { ok: false, reason, message };
}

export function createSelectionRef(
  input: Omit<SelectionRef, "childPath"> & { childPath?: readonly string[] }
): SelectionRef {
  if (!input.documentId || !input.pageId || !input.objectId) {
    throw new TypeError("SelectionRef requires document, page, and object identity.");
  }
  if (!Number.isInteger(input.revision) || input.revision < 0) {
    throw new TypeError("SelectionRef revision must be a non-negative integer.");
  }
  if (!Number.isInteger(input.selectionGeneration) || input.selectionGeneration < 0) {
    throw new TypeError("SelectionRef generation must be a non-negative integer.");
  }
  return Object.freeze({ ...input, childPath: Object.freeze([...(input.childPath ?? [])]) });
}

