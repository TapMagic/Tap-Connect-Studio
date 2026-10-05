import type { TapExperiencePage } from "@/lib/brand/tap-card";

export type InternalPageDestinationStatus = "in-navigation" | "other-page" | "unavailable";

export type InternalPageDestinationOption = Readonly<{
  pageId: string;
  title: string;
  navLabel: string;
  status: InternalPageDestinationStatus;
  selectable: boolean;
  detail: string;
}>;

export function internalPageDestinationOptions(
  pages: readonly TapExperiencePage[] = [],
  query = "",
): InternalPageDestinationOption[] {
  const needle = query.trim().toLocaleLowerCase();
  return pages
    .map((page): InternalPageDestinationOption => {
      const hiddenWhenLocked = page.access?.state === "locked" && page.access.lockedBehavior?.mode === "hidden";
      const unavailable = !page.pageVisible || hiddenWhenLocked;
      const status: InternalPageDestinationStatus = unavailable
        ? "unavailable"
        : page.navVisible
          ? "in-navigation"
          : "other-page";
      const accessDetail = page.access?.state === "locked" && !hiddenWhenLocked ? "Locked experience" : "Available";
      return {
        pageId: page.pageId,
        title: page.title,
        navLabel: page.navLabel,
        status,
        selectable: !unavailable,
        detail: unavailable ? "Unavailable to visitors" : status === "in-navigation" ? `In navigation · ${accessDetail}` : `Other Page · ${accessDetail}`,
      };
    })
    .filter((option) => !needle || `${option.title} ${option.navLabel} ${option.detail}`.toLocaleLowerCase().includes(needle))
    .sort((left, right) => {
      const rank = { "in-navigation": 0, "other-page": 1, unavailable: 2 } as const;
      return rank[left.status] - rank[right.status] || left.title.localeCompare(right.title);
    });
}

export function isEligibleInternalPageDestination(pages: readonly TapExperiencePage[] | undefined, pageId: string): boolean {
  return internalPageDestinationOptions(pages).some((option) => option.pageId === pageId && option.selectable);
}
