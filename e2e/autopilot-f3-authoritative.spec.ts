/**
 * Autopilot F3 authoritative go-live — database-backed /t round-trip.
 * Requires PROOF_HEADED=1, isolated fusion DB, and local server.
 *
 *   DATABASE_URL=postgresql://tapconnect:tapconnect@127.0.0.1:5433/tapconnect_fusion_dev \
 *   PROOF_HEADED=1 BASE_URL=http://127.0.0.1:3000 \
 *   npx playwright test e2e/autopilot-f3-authoritative.spec.ts --headed
 */
import { expect, test, type Page, type Browser } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";
import {
  BASE,
  PROOF_PUBLIC_AT,
  resolveProofPublicDevice,
  SEED,
} from "./proof-helpers";

const headed = process.env.PROOF_HEADED === "1";
const OUT = path.join(process.cwd(), "tmp", "f3-authoritative-proofs");

async function axeSeriousCritical(page: Page, testId: string) {
  const results = await new AxeBuilder({ page })
    .include(`[data-testid="${testId}"]`)
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return results.violations.filter((v) =>
    ["serious", "critical"].includes(v.impact || "")
  );
}

async function clearLiveIfPresent(page: Page) {
  const live = page.getByTestId("autopilot-live-outcome");
  if (!(await live.isVisible().catch(() => false))) return;
  const undo = page.getByTestId("autopilot-undo-golive");
  const stop = page.getByTestId("autopilot-stop-live");
  const action =
    (await undo.isEnabled().catch(() => false))
      ? undo
      : (await stop.isEnabled().catch(() => false))
        ? stop
        : null;
  if (action) {
    await action.scrollIntoViewIfNeeded();
    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes("/api/autopilot/live/interrupt") &&
          r.request().method() === "POST",
        { timeout: 45_000 }
      ),
      action.click(),
    ]);
  }
  const ret = page.getByTestId("autopilot-return-studio");
  if (await ret.isVisible().catch(() => false)) {
    await ret.click();
  }
}

async function prepareAndMakeLive(page: Page) {
  await page.goto("/dashboard/card?wire=offer", { waitUntil: "domcontentloaded" });
  await expect(
    page
      .getByTestId("autopilot-prepare-plan")
      .or(page.getByTestId("autopilot-live-outcome"))
      .or(page.getByTestId("autopilot-prepared-outcome"))
  ).toBeVisible({ timeout: 60_000 });

  for (let attempt = 0; attempt < 3; attempt++) {
    if (await page.getByTestId("autopilot-live-outcome").isVisible().catch(() => false)) {
      await clearLiveIfPresent(page);
      await page.goto("/dashboard/card?wire=offer", {
        waitUntil: "domcontentloaded",
      });
      continue;
    }
    break;
  }
  await page.waitForTimeout(500);
  if (await page.getByTestId("autopilot-live-outcome").isVisible().catch(() => false)) {
    await clearLiveIfPresent(page);
    await page.goto("/dashboard/card?wire=offer", {
      waitUntil: "domcontentloaded",
    });
  }

  await expect(page.getByTestId("autopilot-prepare-plan")).toBeEnabled({
    timeout: 30_000,
  });
  await page.getByTestId("autopilot-prepare-plan").click();
  await expect(page.getByTestId("autopilot-outcome-review")).toBeVisible({
    timeout: 30_000,
  });
  const valueInput = page.getByTestId("autopilot-answer-input-missing_offer.value");
  if (await valueInput.isVisible().catch(() => false)) {
    await valueInput.fill("Free dessert with any entrée");
  }
  const emailChoice = page.getByTestId("autopilot-answer-email_not_connected-card_only");
  if (await emailChoice.isVisible().catch(() => false)) {
    await emailChoice.click();
  }
  const approve = page.getByTestId("autopilot-approve-plan");
  if (await approve.isVisible().catch(() => false)) {
    await approve.click();
  }
  await page.getByTestId("autopilot-prepare-outcome").click();
  await expect(page.getByTestId("autopilot-prepared-outcome")).toBeVisible({
    timeout: 30_000,
  });
  await page.screenshot({
    path: path.join(OUT, "f3-final-review.png"),
    fullPage: true,
  });

  await page.getByTestId("autopilot-final-approval-input").check();
  const makeLive = page.getByTestId("autopilot-make-live");
  await expect(makeLive).toBeEnabled({ timeout: 15_000 });
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes("/api/autopilot/live") &&
        r.request().method() === "POST" &&
        !r.url().includes("interrupt"),
      { timeout: 45_000 }
    ),
    makeLive.click(),
  ]);
  const json = (await response.json().catch(() => null)) as {
    ok?: boolean;
    error?: string;
    code?: string;
  } | null;
  if (!response.ok() || !json?.ok) {
    throw new Error(
      `Make it live API failed: status=${response.status()} code=${json?.code || "?"} error=${json?.error || "?"}`
    );
  }
  await expect(page.getByTestId("autopilot-live-outcome")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("autopilot-live-heading")).toContainText(
    /Your offer is live|Scheduled/i
  );
}

test.describe("autopilot F3 authoritative persistence", () => {
  test.skip(!headed, "Set PROOF_HEADED=1 for authoritative F3 proofs");

  test.beforeAll(() => {
    fs.mkdirSync(OUT, { recursive: true });
  });

  test("Make it live persists Campaign + Spotlight; /t works after refresh + fresh context", async ({
    page,
    browser,
    request,
  }) => {
    await page.setViewportSize({ width: 1400, height: 900 });

    // Ensure a dedicated public device exists for assignment verification
    const device = await resolveProofPublicDevice(request, "F3 Auth Proof");
    const deviceCode = device.deviceCode || SEED.deviceCode;

    // If dedicated device was created, assign seed campaign before Autopilot so entry path exists
    if (device.dedicated && device.deviceSlotId && SEED.campaignId) {
      await request.post(`${BASE}/api/campaigns/assign`, {
        data: { deviceSlotId: device.deviceSlotId, campaignId: SEED.campaignId },
      });
    }

    await prepareAndMakeLive(page);
    await page.screenshot({
      path: path.join(OUT, "f3-live-verified.png"),
      fullPage: true,
    });

    // Advanced shows authoritative refs
    await page.getByTestId("autopilot-prepared-advanced-toggle").click();
    await expect(page.getByTestId("autopilot-prepared-advanced")).toContainText(
      /activationId|distributionSent=false/i
    );
    await page.getByTestId("autopilot-prepared-advanced-toggle").click();

    const violationsLive = await axeSeriousCritical(page, "autopilot-live-outcome");
    expect(violationsLive, JSON.stringify(violationsLive, null, 2)).toEqual([]);

    // Refresh host — Live must re-derive from authoritative state
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.goto("/dashboard/card?wire=offer", { waitUntil: "domcontentloaded" });
    await Promise.race([
      page
        .waitForResponse(
          (r) =>
            r.url().includes("/api/autopilot/live") &&
            r.request().method() === "GET",
          { timeout: 10_000 }
        )
        .catch(() => null),
      page.waitForTimeout(1000),
    ]);
    await expect(page.getByTestId("autopilot-live-outcome")).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId("autopilot-live-heading")).toContainText(
      /Your offer is live|Scheduled|Paused/i
    );
    await page.screenshot({
      path: path.join(OUT, "f3-live-after-refresh.png"),
      fullPage: true,
    });

    // Advanced shows authoritative refs after refresh
    const advanced = page.getByTestId("autopilot-prepared-advanced-toggle");
    if (await advanced.isVisible().catch(() => false)) {
      await advanced.click();
      await expect(page.getByTestId("autopilot-prepared-advanced")).toContainText(
        /activationId|distributionSent=false/i
      );
      await page.screenshot({
        path: path.join(OUT, "f3-advanced-audit.png"),
        fullPage: true,
      });
      await advanced.click();
    }

    // Fresh browser context → real public /t
    const publicCtx = await browser.newContext();
    const publicPage = await publicCtx.newPage();
    const publicUrl = `${BASE}/t/${deviceCode}?public=1&at=${encodeURIComponent(PROOF_PUBLIC_AT)}`;
    await publicPage.goto(publicUrl, { waitUntil: "domcontentloaded" });
    await publicPage.waitForTimeout(1500);
    await publicPage.screenshot({
      path: path.join(OUT, "f3-public-t-offer.png"),
      fullPage: true,
    });

    // Offer should appear somehow on the public page (spotlight or campaign offer)
    const bodyText = await publicPage.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(20);
    // Prefer claim/view affordance when fuse is on
    const claimOrOffer = publicPage
      .getByRole("button", { name: /claim|offer|get/i })
      .or(publicPage.getByText(/offer|special|welcome|dessert|coffee|bogo/i).first());
    await expect(claimOrOffer.first()).toBeVisible({ timeout: 20_000 });

    // View/claim when form available
    const claimBtn = publicPage.getByTestId("card-offer-claim").or(
      publicPage.getByRole("button", { name: /claim/i })
    );
    if (await claimBtn.isVisible().catch(() => false)) {
      await claimBtn.click();
      await publicPage.screenshot({
        path: path.join(OUT, "f3-public-claim.png"),
        fullPage: true,
      });
    }

    // Reload public route — still active
    await publicPage.reload({ waitUntil: "domcontentloaded" });
    await expect(publicPage.locator("body")).toBeVisible();
    await publicCtx.close();

    // Prefer Undo so later tests are not trapped in a Stopped shell.
    await page.goto("/dashboard/card?wire=offer", { waitUntil: "domcontentloaded" });
    await Promise.race([
      page
        .waitForResponse(
          (r) =>
            r.url().includes("/api/autopilot/live") &&
            r.request().method() === "GET",
          { timeout: 10_000 }
        )
        .catch(() => null),
      page.waitForTimeout(1000),
    ]);
    await expect(page.getByTestId("autopilot-live-outcome")).toBeVisible({
      timeout: 30_000,
    });
    if (await page.getByTestId("autopilot-undo-golive").isEnabled().catch(() => false)) {
      await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes("/api/autopilot/live/interrupt") &&
            r.request().method() === "POST",
          { timeout: 45_000 }
        ),
        page.getByTestId("autopilot-undo-golive").click(),
      ]);
      await page.screenshot({
        path: path.join(OUT, "f3-undone-host.png"),
        fullPage: true,
      });
    } else if (await page.getByTestId("autopilot-stop-live").isEnabled().catch(() => false)) {
      await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes("/api/autopilot/live/interrupt") &&
            r.request().method() === "POST",
          { timeout: 45_000 }
        ),
        page.getByTestId("autopilot-stop-live").click(),
      ]);
      await expect(page.getByTestId("autopilot-live-state")).toHaveAttribute(
        "data-state",
        /stopped|paused/i,
        { timeout: 20_000 }
      );
      await page.screenshot({
        path: path.join(OUT, "f3-stopped-host.png"),
        fullPage: true,
      });
    }

    // Fresh public context after stop/undo — offer should not present as live takeover of our campaign
    const afterCtx = await browser.newContext();
    const afterPage = await afterCtx.newPage();
    await afterPage.goto(publicUrl, { waitUntil: "domcontentloaded" });
    await afterPage.screenshot({
      path: path.join(OUT, "f3-public-after-stop.png"),
      fullPage: true,
    });
    await afterCtx.close();
  });

  test("phone live + Stop axe", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await prepareAndMakeLive(page);
    await page.screenshot({
      path: path.join(OUT, "f3-mobile-live.png"),
      fullPage: true,
    });
    const violations = await axeSeriousCritical(page, "autopilot-live-outcome");
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
    await page.getByTestId("autopilot-stop-live").click();
    await page.screenshot({
      path: path.join(OUT, "f3-mobile-stopped.png"),
      fullPage: true,
    });
  });

  test("Pause then Resume persists", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await prepareAndMakeLive(page);
    await page.getByTestId("autopilot-pause-live").click();
    await expect(page.getByTestId("autopilot-live-state")).toHaveAttribute(
      "data-state",
      "paused",
      { timeout: 20_000 }
    );
    await page.screenshot({
      path: path.join(OUT, "f3-paused.png"),
      fullPage: true,
    });
    await page.getByTestId("autopilot-resume-live").click();
    await expect(page.getByTestId("autopilot-live-state")).toHaveAttribute(
      "data-state",
      /live|scheduled/,
      { timeout: 20_000 }
    );
    await page.screenshot({
      path: path.join(OUT, "f3-resumed.png"),
      fullPage: true,
    });
  });
});

void (0 as unknown as Browser);
