export type AutoScrollResult = { element: HTMLElement; deltaX: number; deltaY: number } | null;

function canScroll(element: HTMLElement): boolean {
  const style = getComputedStyle(element);
  const overflowY = style.overflowY;
  const overflowX = style.overflowX;
  return ((overflowY === "auto" || overflowY === "scroll") && element.scrollHeight > element.clientHeight) ||
    ((overflowX === "auto" || overflowX === "scroll") && element.scrollWidth > element.clientWidth);
}

export function scrollableAncestors(start: HTMLElement | null): HTMLElement[] {
  const result: HTMLElement[] = [];
  let current = start;
  while (current) {
    if (canScroll(current)) result.push(current);
    current = current.parentElement;
  }
  const root = document.scrollingElement;
  if (root instanceof HTMLElement && !result.includes(root)) result.push(root);
  return result;
}

/** Edge-proximity autoscroll shared by pointer transforms and native drag/drop. */
export function autoScrollForPointer(
  start: HTMLElement | null,
  clientX: number,
  clientY: number,
  options: { edgePx?: number; maxStepPx?: number } = {}
): AutoScrollResult {
  if (typeof window === "undefined") return null;
  const edge = options.edgePx ?? 56;
  const maxStep = options.maxStepPx ?? 24;
  for (const element of scrollableAncestors(start)) {
    const rect = element.getBoundingClientRect();
    if (clientX < rect.left - 2 || clientX > rect.right + 2 || clientY < rect.top - 2 || clientY > rect.bottom + 2) continue;
    const speed = (distance: number) => Math.round(maxStep * Math.max(0, Math.min(1, (edge - distance) / edge)) ** 2);
    const left = clientX - rect.left;
    const right = rect.right - clientX;
    const top = clientY - rect.top;
    const bottom = rect.bottom - clientY;
    const deltaX = element.scrollWidth > element.clientWidth ? (left < edge ? -speed(left) : right < edge ? speed(right) : 0) : 0;
    const deltaY = element.scrollHeight > element.clientHeight ? (top < edge ? -speed(top) : bottom < edge ? speed(bottom) : 0) : 0;
    if (!deltaX && !deltaY) continue;
    element.scrollBy({ left: deltaX, top: deltaY, behavior: "auto" });
    return { element, deltaX, deltaY };
  }
  return null;
}
