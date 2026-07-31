import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(
  process.cwd(),
  "tmp",
  "visual-owner-acceptance-repair"
);

function screenshot(page: Page, name: string, fullPage = false) {
  fs.mkdirSync(OUT, { recursive: true });
  return page.screenshot({ path: path.join(OUT, name), fullPage });
}

async function orderedIds(page: Page, testIdPrefix: string) {
  return page
    .locator(`[data-testid^="${testIdPrefix}"]`)
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-testid") || "")
    );
}

test.describe("Visual Owner acceptance repair", () => {
  test.describe.configure({ timeout: 180_000 });

  test("visible Card structure supports pointer and keyboard reordering", async ({
    page,
  }) => {
    const business = await page.request.patch("/api/business", {
      data: {
        primaryCustomerOutcome: "CONTACT",
        website: "https://example.com",
        phone: "352-555-0142",
        email: "hello@example.com",
      },
    });
    expect(business.ok(), await business.text()).toBeTruthy();
    const current = await page.request.get("/api/card/draft");
    expect(current.ok(), await current.text()).toBeTruthy();
    const payload = (await current.json()) as {
      draft: Record<string, unknown> & { sections?: Array<Record<string, unknown>> };
      revision: number;
    };
    const existing = payload.draft.sections ?? [];
    const fixtureSections = [
      {
        id: "owner-proof-story",
        type: "text",
        enabled: true,
        order: 0,
        label: "Welcome story",
        text: "A visible Owner-editable story block.",
      },
      {
        id: "owner-proof-identity",
        type: "identity",
        enabled: true,
        order: 1,
        label: "Business identity",
        name: "Harbor Grove Cafe",
        headline: "Coffee, lunch, and neighborhood events",
      },
      {
        id: "owner-proof-action-website",
        type: "action",
        enabled: true,
        order: 2,
        actionKind: "website",
        label: "Visit website",
        href: "https://example.com",
      },
      {
        id: "owner-proof-action-email",
        type: "action",
        enabled: true,
        order: 3,
        actionKind: "email",
        label: "Email Harbor Grove",
        href: "mailto:hello@example.com",
      },
    ];
    const fixtureIds = new Set(fixtureSections.map((section) => section.id));
    const save = await page.request.put("/api/card/draft", {
      data: {
        expectedRevision: payload.revision,
        draft: {
          ...payload.draft,
          sections: [
            ...fixtureSections,
            ...existing
              .filter((section) => !fixtureIds.has(String(section.id)))
              .map((section, index) => ({
                ...section,
                order: fixtureSections.length + index,
              })),
          ],
        },
      },
    });
    expect(save.ok(), await save.text()).toBeTruthy();

    await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
    const exitFocus = page
      .getByRole("button", { name: /Exit focus|Show tools|Expanded/i })
      .first();
    if (await exitFocus.isVisible().catch(() => false)) {
      await exitFocus.click().catch(() => undefined);
    }

    const outline = page.getByTestId("card-shell-outline-segments");
    await expect(outline).toBeVisible({ timeout: 30_000 });
    const blockRows = page.locator('[data-testid^="card-outline-row-"]');
    await expect(blockRows.first()).toBeVisible();
    expect(await blockRows.count()).toBeGreaterThan(1);

    const firstRowId = (await blockRows.first().getAttribute("data-testid"))!.replace(
      "card-outline-row-",
      ""
    );
    await expect(page.getByTestId(`card-outline-drag-${firstRowId}`)).toBeVisible();
    await expect(
      page.getByTestId(`card-outline-visibility-${firstRowId}`)
    ).toBeVisible();
    await expect(page.getByTestId(`card-outline-lock-${firstRowId}`)).toBeVisible();
    await expect(page.getByTestId(`card-outline-menu-${firstRowId}`)).toBeVisible();
    await expect(page.getByTestId("card-undo")).toContainText("Undo");
    await expect(page.getByTestId("card-redo")).toContainText("Redo");
    await blockRows.first().scrollIntoViewIfNeeded();
    await screenshot(page, "01-card-editor-visible-structure.png");

    const blocks = page.getByTestId("card-shell-blocks");
    const beforePointer = await orderedIds(page, "card-outline-row-");
    const firstBlock = blocks.locator('[data-testid^="card-outline-row-"]').first();
    const secondBlock = blocks.locator('[data-testid^="card-outline-row-"]').nth(1);
    const firstBlockId = (await firstBlock.getAttribute("data-testid"))!.replace(
      "card-outline-row-",
      ""
    );
    await page
      .getByTestId(`card-outline-drag-${firstBlockId}`)
      .dragTo(secondBlock);
    await expect
      .poll(() => orderedIds(page, "card-outline-row-"))
      .not.toEqual(beforePointer);
    await screenshot(page, "02-card-block-reordered.png");

    const actions = page.getByTestId("card-shell-actions");
    const actionRows = actions.locator('[data-testid^="card-outline-row-"]');
    expect(await actionRows.count()).toBeGreaterThan(1);
    const beforeActions = await orderedIds(page, "card-outline-row-");
    const firstAction = actionRows.first();
    const secondAction = actionRows.nth(1);
    const secondActionId = (await secondAction.getAttribute("data-testid"))!.replace(
      "card-outline-row-",
      ""
    );
    await page
      .getByTestId(`card-outline-drag-${secondActionId}`)
      .dragTo(firstAction);
    await expect
      .poll(() => orderedIds(page, "card-outline-row-"))
      .not.toEqual(beforeActions);
    await screenshot(page, "03-card-action-buttons-reordered.png");

    const keyboardRows = blocks.locator('[data-testid^="card-outline-row-"]');
    const keyboardId = (
      await keyboardRows.first().getAttribute("data-testid")
    )!.replace("card-outline-row-", "");
    const beforeKeyboard = await orderedIds(page, "card-outline-row-");
    await page.getByTestId(`card-outline-drag-${keyboardId}`).focus();
    await page.keyboard.press("Alt+ArrowDown");
    await expect
      .poll(() => orderedIds(page, "card-outline-row-"))
      .not.toEqual(beforeKeyboard);

    await page.getByTestId(`card-outline-visibility-${keyboardId}`).click();
    await expect(page.getByTestId(`card-outline-row-${keyboardId}`)).toHaveAttribute(
      "data-outline-visible",
      "0"
    );
    await page.getByTestId(`card-outline-lock-${keyboardId}`).click();
    await expect(page.getByTestId(`card-outline-row-${keyboardId}`)).toHaveAttribute(
      "data-outline-locked",
      "1"
    );
    await page.getByTestId(`card-outline-menu-${keyboardId}`).click();
    await expect(
      page.getByTestId(`card-outline-menu-panel-${keyboardId}`)
    ).toContainText(/Move up|Move down/);
  });

  test("semantic operational states carry frame, icon, label, and action", async ({
    page,
  }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    const assemblySkip = page.getByTestId("studio-assembly-skip");
    await assemblySkip
      .waitFor({ state: "visible", timeout: 3_000 })
      .catch(() => undefined);
    if (await assemblySkip.isVisible().catch(() => false)) {
      await assemblySkip.click();
      await expect(assemblySkip).toHaveCount(0);
      await page.waitForTimeout(400);
    }
    const homeStates = page.locator('[data-owner-severity]');
    await expect(homeStates.first()).toBeVisible({ timeout: 30_000 });
    for (const severity of ["success", "attention", "error"] as const) {
      await expect(
        page.locator(
          `[data-testid="home-operational-status"] [data-owner-severity="${severity}"]`
        )
      ).toBeVisible();
    }
    await page.getByTestId("home-operational-status").scrollIntoViewIfNeeded();
    await screenshot(page, "04-home-semantic-status-cards.png", true);

    await page.goto("/dashboard/tap-points", { waitUntil: "domcontentloaded" });
    for (const severity of ["success", "attention", "error"] as const) {
      const card = page.locator(
        `.owner-status-frame[data-owner-severity="${severity}"]`
      );
      await expect(card.first()).toBeVisible();
      await expect(card.first().locator("svg")).toBeVisible();
      await expect(card.first()).not.toHaveText("");
    }
    await screenshot(page, "05-tap-point-setup-needed.png", true);
  });

  test("Campaign template renders persisted editable blocks and recovers from error", async ({
    page,
  }) => {
    let failNextCreate = true;
    await page.route("**/api/campaigns", async (route) => {
      if (route.request().method() === "POST" && failNextCreate) {
        failNextCreate = false;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Fixture interruption: template was not persisted.",
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/dashboard/workbench", { waitUntil: "domcontentloaded" });
    const useTemplate = page.locator('[data-testid^="template-use-"]').first();
    await expect(useTemplate).toBeVisible({ timeout: 30_000 });
    await useTemplate.click();
    await expect(page.getByTestId("template-preview-modal")).toBeVisible();
    await screenshot(page, "06-campaign-template-selection.png");

    await page.getByRole("button", { name: "Use this template" }).click();
    await expect(page.getByTestId("campaign-template-error")).toBeVisible();
    await expect(page.getByTestId("campaign-template-retry")).toBeVisible();
    await page.getByTestId("campaign-template-retry").click();

    await expect(page).toHaveURL(/\/dashboard\/campaigns\/[^?]+\?.*loaded=/, {
      timeout: 45_000,
    });
    await expect(page.getByTestId("campaign-template-loaded")).toBeVisible({
      timeout: 30_000,
    });
    const blocks = page.locator('[data-testid^="campaign-outline-row-"]');
    expect(await blocks.count()).toBeGreaterThan(0);
    await expect(blocks.first()).toBeVisible();
    await expect(blocks.first().locator('[data-testid^="campaign-block-drag-"]')).toBeVisible();
    await blocks.first().scrollIntoViewIfNeeded();
    await screenshot(page, "07-campaign-template-loaded-editor.png");
  });

  test("landing tells the Card retention story and icon rail tracks sections", async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const assembly = page.getByTestId("studio-assembly");
    const rail = page.getByTestId("landing-story-rail");
    await expect(assembly).toBeVisible();
    await expect(rail).toBeVisible();
    await screenshot(page, "08-landing-cinematic-opening.png");

    await expect(assembly).toHaveAttribute("data-phase", "card_forward", {
      timeout: 15_000,
    });
    await expect(page.getByTestId("sa-card")).toHaveCSS(
      "transform",
      /matrix3d|matrix/
    );
    await screenshot(page, "09-card-moving-toward-viewer.png");

    await expect(assembly).toHaveAttribute("data-phase", "retention_choice", {
      timeout: 8_000,
    });
    await expect(page.getByTestId("sa-retention-choice")).toBeVisible();
    await screenshot(page, "10-customer-save-choice.png");

    await expect(assembly).toHaveAttribute("data-phase", "save_home", {
      timeout: 8_000,
    });
    await expect(page.getByTestId("sa-home-screen")).toBeVisible();
    await expect(page.getByTestId("sa-home-screen")).toContainText(
      /Saved to the Home Screen/
    );
    await screenshot(page, "11-home-screen-save-transition.png");

    await page.getByTestId("studio-assembly-skip").click().catch(() => undefined);
    await expect(rail.locator("a")).toHaveCount(8);
    await page.waitForTimeout(1_600);
    await screenshot(page, "12-restored-colored-icon-navigation.png");

    for (const id of ["tap-points", "audience", "insights"]) {
      const link = page.getByTestId(`landing-story-rail-${id}`);
      await link.click();
      await page.waitForTimeout(1_000);
      await expect(link).toHaveAttribute("data-active", "true", { timeout: 8_000 });
      await screenshot(page, `13-icon-navigation-active-${id}.png`);
    }

    const axe = await new AxeBuilder({ page })
      .include('[data-testid="landing-story-rail"]')
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([]);
  });

  test("landing remains usable at 390px and with reduced motion", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => localStorage.clear());
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("landing-story-rail")).toBeVisible();
    await expect(page.getByTestId("sa-card")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("studio-assembly-skip").click();
    await page.waitForTimeout(1_600);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await screenshot(page, "14-mobile-landing-390px.png");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => localStorage.clear());
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("studio-assembly")).toHaveAttribute(
      "data-reduced-motion",
      "true"
    );
    await expect(page.getByTestId("landing-story-rail")).toBeVisible();
    await expect(page.getByTestId("studio-assembly")).toHaveAttribute(
      "data-phase",
      /complete|icons_settle/,
      { timeout: 8_000 }
    );
    await screenshot(page, "15-reduced-motion-landing.png");
  });
});
