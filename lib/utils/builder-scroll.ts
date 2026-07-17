/** Scroll a child into the vertical center of a scrollable container (Tap Card–style). */
export function scrollChildToContainerCenter(
  container: HTMLElement,
  child: HTMLElement,
  behavior: ScrollBehavior = "smooth"
) {
  const cRect = container.getBoundingClientRect();
  const eRect = child.getBoundingClientRect();
  const delta =
    eRect.top - cRect.top - container.clientHeight / 2 + eRect.height / 2;
  container.scrollBy({ top: delta, behavior });
}

/** Keep a list row visible when selected from the preview (nearest edge). */
export function scrollChildIntoNearestView(
  child: HTMLElement,
  behavior: ScrollBehavior = "smooth"
) {
  child.scrollIntoView({ behavior, block: "nearest", inline: "nearest" });
}
