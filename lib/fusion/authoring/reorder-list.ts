/**
 * Shared reorder helpers for Owner-facing ordered lists
 * (Card blocks, actions, Email/Campaign blocks, Collections, etc.).
 */

export function reorderById<T extends { id: string }>(
  items: T[],
  fromId: string,
  toId: string
): T[] | null {
  if (fromId === toId) return null;
  const from = items.findIndex((s) => s.id === fromId);
  const to = items.findIndex((s) => s.id === toId);
  if (from < 0 || to < 0) return null;
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (!item) return null;
  next.splice(to, 0, item);
  return next;
}

export function moveByDelta<T extends { id: string }>(
  items: T[],
  id: string,
  delta: number
): T[] | null {
  const fromIndex = items.findIndex((s) => s.id === id);
  if (fromIndex < 0) return null;
  const toIndex = fromIndex + delta;
  if (toIndex < 0 || toIndex >= items.length) return null;
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  if (!item) return null;
  next.splice(toIndex, 0, item);
  return next;
}

export function moveToExtreme<T extends { id: string }>(
  items: T[],
  id: string,
  edge: "top" | "bottom"
): T[] | null {
  const fromIndex = items.findIndex((s) => s.id === id);
  if (fromIndex < 0) return null;
  if (edge === "top" && fromIndex === 0) return null;
  if (edge === "bottom" && fromIndex === items.length - 1) return null;
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  if (!item) return null;
  if (edge === "top") next.unshift(item);
  else next.push(item);
  return next;
}

export function withOrder<T extends { id: string }>(
  items: T[]
): Array<T & { order: number }> {
  return items.map((item, order) => ({ ...item, order }));
}

export function describeMoveAboveBelow(
  movedName: string,
  neighborName: string | undefined,
  fromIndex: number,
  toIndex: number
): string {
  if (!neighborName) return `Moved "${movedName}"`;
  if (toIndex < fromIndex) {
    return `Moved "${movedName}" above "${neighborName}"`;
  }
  return `Moved "${movedName}" below "${neighborName}"`;
}
