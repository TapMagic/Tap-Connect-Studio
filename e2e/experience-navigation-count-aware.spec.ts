import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const enabled = process.env.EXPERIENCE_NAV_COUNT_ACCEPTANCE === "1";
const evidence = path.join(
  "docs",
  "product-reconstitution",
  "creative-studio-platform",
  "proofs",
  "experience-navigation-count-aware",
);

type ReviewDraft = {
  experience: {
    pages: Array<{
      pageId: string;
      navOrder: number;
      navVisible: boolean;
      pageVisible: boolean;
      access?: { lockedBehavior?: { mode?: string } };
    }>;
  };
  [key: string]: unknown;
};

test("proves intentional three, four, and five-item persistent navigation at 390px", async ({ page }) => {
  test.skip(!enabled, "Set EXPERIENCE_NAV_COUNT_ACCEPTANCE=1 for the focused count-aware navigation proof");
  test.setTimeout(120_000);
  mkdirSync(evidence, { recursive: true });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/review/studio", { waitUntil: "networkidle" });
  const baselineResponse = await page.request.get("/api/card/draft");
  expect(baselineResponse.ok()).toBeTruthy();
  const baseline = await baselineResponse.json() as { draft: ReviewDraft; revision: number };
  const originalVisible = baseline.draft.experience.pages
    .filter((candidate) => candidate.navVisible && candidate.pageVisible && candidate.access?.lockedBehavior?.mode !== "hidden")
    .sort((a, b) => a.navOrder - b.navOrder);
  expect(originalVisible.length).toBeGreaterThanOrEqual(5);
  let revision = baseline.revision;
  const report: Record<string, unknown> = {};

  try {
    for (const count of [5, 4, 3]) {
      const draft = structuredClone(baseline.draft);
      const visibleIds = new Set(originalVisible.slice(0, count).map((candidate) => candidate.pageId));
      for (const candidate of draft.experience.pages) {
        if (originalVisible.some((original) => original.pageId === candidate.pageId)) {
          candidate.navVisible = visibleIds.has(candidate.pageId);
        }
      }
      const update = await page.request.put("/api/card/draft", { data: { draft, expectedRevision: revision } });
      expect(update.ok()).toBeTruthy();
      revision = ((await update.json()) as { revision: number }).revision;

      await page.reload({ waitUntil: "networkidle" });
      await page.getByTestId("studio-preview").click();
      await page.setViewportSize({ width: 390, height: 844 });

      const nav = page.getByTestId("experience-bottom-navigation");
      const expected = count === 5
        ? { composition: "full", width: "100", pickTier: "compact", pickMin: 49, pickMax: 51 }
        : count === 4
          ? { composition: "balanced", width: "90", pickTier: "medium", pickMin: 55, pickMax: 57 }
          : { composition: "clustered", width: "78", pickTier: "large", pickMin: 62, pickMax: 64 };
      await expect(nav).toHaveAttribute("data-visible-slots", String(count));
      await expect(nav).toHaveAttribute("data-count-composition", expected.composition);
      await expect(nav).toHaveAttribute("data-cluster-width-percent", expected.width);
      await expect(nav).toHaveAttribute("data-pick-size-tier", expected.pickTier);
      await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);

      const metrics = await nav.evaluate((element) => {
        const shell = document.querySelector<HTMLElement>('[data-testid="tap-experience-renderer"]')!;
        const cluster = element.querySelector<HTMLElement>("[data-navigation-cluster]")!;
        const buttons = [...element.querySelectorAll<HTMLElement>("button")];
        const picks = buttons.map((button) => button.querySelector<HTMLElement>("[data-navigation-artwork]")!);
        const navRect = element.getBoundingClientRect();
        const clusterRect = cluster.getBoundingClientRect();
        return {
          viewportWidth: window.innerWidth,
          navHeight: navRect.height,
          bottomGap: window.innerHeight - navRect.bottom,
          clusterWidth: clusterRect.width,
          clusterWidthRatio: clusterRect.width / (element.clientWidth - 8),
          clusterCenterDelta: Math.abs((clusterRect.left + clusterRect.width / 2) - window.innerWidth / 2),
          pickWidths: picks.map((pick) => pick.getBoundingClientRect().width),
          touchHeights: buttons.map((button) => button.getBoundingClientRect().height),
          labels: buttons.map((button) => button.getAttribute("aria-label")),
          shellPaddingBottom: Number.parseFloat(getComputedStyle(shell).paddingBottom),
          clipped: picks.some((pick) => {
            const rect = pick.getBoundingClientRect();
            return rect.left < navRect.left || rect.right > navRect.right || rect.top < navRect.top || rect.bottom > navRect.bottom;
          }),
        };
      });
      expect(metrics.viewportWidth).toBe(390);
      expect(Math.abs(metrics.bottomGap)).toBeLessThanOrEqual(1);
      expect(metrics.clusterCenterDelta).toBeLessThanOrEqual(1);
      expect(metrics.touchHeights.every((height) => height >= 44)).toBeTruthy();
      expect(metrics.pickWidths.every((width) => width >= expected.pickMin && width <= expected.pickMax), JSON.stringify(metrics)).toBeTruthy();
      expect(metrics.clipped).toBeFalsy();
      expect(metrics.shellPaddingBottom).toBeGreaterThanOrEqual(metrics.navHeight + 8);
      report[String(count)] = metrics;

      await page.screenshot({ path: path.join(evidence, `${count}-items-phone-390.png`) });
      await nav.screenshot({ path: path.join(evidence, `${count}-items-navigation-390.png`) });

      if (count === 4) {
        await nav.locator("[data-navigation-cluster]").evaluate((cluster) => {
          (cluster as HTMLElement).style.width = "100%";
        });
        await nav.screenshot({ path: path.join(evidence, "4-items-full-width-control-390.png") });
      }

      await page.setViewportSize({ width: 1280, height: 900 });
      await page.getByTestId("studio-preview").click();
    }
    writeFileSync(path.join(evidence, "metrics.json"), `${JSON.stringify(report, null, 2)}\n`);
  } finally {
    const current = await page.request.get("/api/card/draft");
    if (current.ok()) {
      const currentRevision = ((await current.json()) as { revision: number }).revision;
      await page.request.put("/api/card/draft", { data: { draft: baseline.draft, expectedRevision: currentRevision } });
    }
  }
});
