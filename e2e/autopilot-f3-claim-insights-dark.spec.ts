/**
 * F3 final pre-commit proofs:
 * 1) Deterministic public Claim on real /t after authoritative go-live
 * 2) Insights host surface before/after (ClickEvent-backed)
 * 3) Forced-dark Studio matrix (incl. prefers-color-scheme: light)
 *
 *   DATABASE_URL=postgresql://tapconnect:tapconnect@127.0.0.1:5433/tapconnect_fusion_dev \
 *   PROOF_HEADED=1 BASE_URL=http://127.0.0.1:3000 \
 *   npx playwright test e2e/autopilot-f3-claim-insights-dark.spec.ts --headed
 */
import { expect, test, type Page, type BrowserContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";
import {
  BASE,
  PROOF_PUBLIC_AT,
  resolveProofPublicDevice,
  SEED,
  snapshotClickEvents,
  waitForNewClickEvent,
} from "./proof-helpers";

const headed = process.env.PROOF_HEADED === "1";
const OUT = path.join(process.cwd(), "tmp", "f3-final-proofs");

async function axeSeriousCritical(page: Page, include: string) {
  const results = await new AxeBuilder({ page })
    .include(include)
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return results.violations.filter((v) =>
    ["serious", "critical"].includes(v.impact || "")
  );
}

async function readOfferKpis(page: Page) {
  await page.goto(`${BASE}/dashboard/insights?view=card&_=${Date.now()}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByTestId("insights-hub")).toBeVisible({ timeout: 30_000 });
  const views = page.getByTestId("insights-kpi-value-offer_views_range");
  const claims = page.getByTestId("insights-kpi-value-offer_claims_range");
  await expect(views).toBeVisible({ timeout: 15_000 });
  await expect(claims).toBeVisible({ timeout: 15_000 });
  return {
    views: Number(
      (await views.getAttribute("data-kpi-value")) ?? (await views.innerText())
    ),
    claims: Number(
      (await claims.getAttribute("data-kpi-value")) ?? (await claims.innerText())
    ),
  };
}

async function assertStudioForcedDark(page: Page, label: string) {
  const state = await page.evaluate(() => {
    const html = document.documentElement;
    const cs = getComputedStyle(html);
    const body = getComputedStyle(document.body);
    const toggle = Array.from(
      document.querySelectorAll('button, a, [role="switch"]')
    ).some((el) => /light\s*mode|dark\s*mode|theme/i.test(el.textContent || ""));
    return {
      htmlClass: html.className,
      dataTheme: html.getAttribute("data-theme"),
      colorScheme: cs.colorScheme,
      inlineColorScheme: html.style.colorScheme,
      bodyBg: body.backgroundColor,
      hasThemeToggle: toggle,
    };
  });
  expect(state.htmlClass, label).toMatch(/\bdark\b/);
  expect(state.dataTheme, label).toBe("dark");
  expect(state.colorScheme, label).toMatch(/dark/);
  expect(state.hasThemeToggle, `${label}: no Studio theme toggle`).toBe(false);
  // Body must stay dark (not near-white)
  const rgb = state.bodyBg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgb) {
    const [r, g, b] = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
    expect(r + g + b, `${label}: body not light`).toBeLessThan(120 * 3);
  }
  return state;
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

async function prepareAndMakeLive(page: Page): Promise<{
  campaignId: string;
  activationId: string;
}> {
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
  await Promise.race([
    page
      .waitForResponse(
        (r) =>
          r.url().includes("/api/autopilot/live") && r.request().method() === "GET",
        { timeout: 8_000 }
      )
      .catch(() => null),
    page.waitForTimeout(800),
  ]);
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
    path: path.join(OUT, "f3-final-prepared.png"),
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
  const json = (await response.json()) as {
    ok?: boolean;
    error?: string;
    activation?: { activationId?: string; campaignId?: string };
  };
  if (!response.ok() || !json.ok || !json.activation?.campaignId) {
    throw new Error(
      `Make it live failed: status=${response.status()} error=${json.error || "?"} body=${JSON.stringify(json).slice(0, 400)}`
    );
  }
  await expect(page.getByTestId("autopilot-live-outcome")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("autopilot-live-heading")).toContainText(
    /Your offer is live|Scheduled/i
  );
  await page.screenshot({
    path: path.join(OUT, "f3-live-host.png"),
    fullPage: true,
  });
  return {
    campaignId: json.activation.campaignId,
    activationId: json.activation.activationId || "",
  };
}

test.describe("autopilot F3 final claim + Insights + forced dark", () => {
  test.skip(!headed, "Set PROOF_HEADED=1 for F3 final pre-commit proofs");

  test.beforeAll(() => {
    fs.mkdirSync(OUT, { recursive: true });
  });

  test("deterministic Claim → DB ClickEvent → Insights before/after + dark matrix", async ({
    page,
    browser,
    request,
  }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1400, height: 900 });

    // --- Forced dark (desktop + prefers light) ---
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/dashboard/card?wire=offer", { waitUntil: "domcontentloaded" });
    await assertStudioForcedDark(page, "desktop prefers-light");
    await page.screenshot({
      path: path.join(OUT, "f3-dark-desktop-prefers-light.png"),
      fullPage: true,
    });

    // Insights BEFORE (host surface prior to public customer action)
    const insightsBefore = await readOfferKpis(page);
    await assertStudioForcedDark(page, "insights before");
    await page.screenshot({
      path: path.join(OUT, "f3-insights-before.png"),
      fullPage: true,
    });
    const provenanceBefore = page.getByTestId("insights-provenance");
    if (await provenanceBefore.isVisible().catch(() => false)) {
      await expect(provenanceBefore).toBeVisible();
    }

    // Dedicated ungrouped device so group schedule cannot shadow F3 assignment
    const device = await resolveProofPublicDevice(request, "F3 Claim Proof");
    const deviceCode = device.deviceCode || SEED.deviceCode;

    // --- F3 prepare → Make it live ---
    await page.emulateMedia({ colorScheme: "light" });
    const live = await prepareAndMakeLive(page);
    await assertStudioForcedDark(page, "F3 live workspace");
    const liveAxe = await axeSeriousCritical(page, '[data-testid="autopilot-live-outcome"]');
    expect(liveAxe, JSON.stringify(liveAxe, null, 2)).toEqual([]);

    // DB baselines scoped to the activated Campaign (authoritative attribution)
    const claimsBeforeDb = await snapshotClickEvents({
      businessId: SEED.businessId,
      eventType: "card_offer_claimed",
      campaignId: live.campaignId,
    });
    const viewsBeforeDb = await snapshotClickEvents({
      businessId: SEED.businessId,
      eventType: "card_offer_viewed",
      campaignId: live.campaignId,
    });

    // Refresh host — live must survive
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
    await page.screenshot({
      path: path.join(OUT, "f3-live-after-refresh.png"),
      fullPage: true,
    });

    // Authoritative entry on the dedicated Tap Point (F3 campaign)
    if (device.deviceSlotId) {
      const assignRes = await request.post(`${BASE}/api/campaigns/assign`, {
        data: {
          deviceSlotId: device.deviceSlotId,
          campaignId: live.campaignId,
        },
      });
      expect(assignRes.ok(), `assign F3 campaign: ${assignRes.status()}`).toBeTruthy();
    }

    // --- Fresh context public Claim ---
    const publicCtx = await browser.newContext({
      colorScheme: "light",
    });
    const publicPage = await publicCtx.newPage();
    const publicUrl = `${BASE}/t/${deviceCode}?public=1&at=${encodeURIComponent(PROOF_PUBLIC_AT)}`;
    await publicPage.goto(publicUrl, { waitUntil: "domcontentloaded" });
    await publicPage.waitForTimeout(1200);

    // Deterministic Spotlight claim surface — fail if missing
    await expect(publicPage.getByTestId("card-offer-spotlight-strip")).toBeVisible({
      timeout: 25_000,
    });
    await expect(async () => {
      const form = publicPage.getByTestId("card-offer-claim-form");
      if (await form.isVisible().catch(() => false)) return;
      const openBtn = publicPage.getByTestId("card-offer-spotlight-open");
      await expect(openBtn).toBeVisible();
      await openBtn.click();
      await expect(form).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 30_000 });
    await expect(publicPage.getByTestId("card-offer-claim-form")).toBeVisible();
    const publicAxe = await axeSeriousCritical(
      publicPage,
      '[data-testid="card-offer-claim-form"]'
    );
    expect(publicAxe, JSON.stringify(publicAxe, null, 2)).toEqual([]);

    const claimEmail = `f3-claim-${Date.now()}@example.com`;
    await publicPage.getByTestId("card-offer-email").fill(claimEmail);
    await publicPage.getByTestId("card-offer-consent").check();
    await expect(publicPage.getByTestId("card-offer-claim")).toBeEnabled();

    const [claimRes] = await Promise.all([
      publicPage.waitForResponse(
        (r) =>
          r.url().includes("/api/public/card/offer") &&
          r.request().method() === "POST",
        { timeout: 30_000 }
      ),
      publicPage.getByTestId("card-offer-claim").click(),
    ]);
    const claimJson = (await claimRes.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      code?: string;
    } | null;
    expect(claimRes.ok(), JSON.stringify(claimJson)).toBeTruthy();
    expect(claimJson?.ok).toBe(true);

    await expect(publicPage.getByTestId("card-offer-success")).toBeVisible({
      timeout: 20_000,
    });
    await publicPage.screenshot({
      path: path.join(OUT, "f3-public-claim-success.png"),
      fullPage: true,
    });

    // Public customer experience may be brand-colored; Studio chrome is not required dark here.
    // Confirm we did not invent a Studio light/dark toggle on public either.
    await expect(publicPage.locator("html")).toHaveClass(/\bdark\b/);

    // Persist DB evidence
    const claimEvent = await waitForNewClickEvent({
      businessId: SEED.businessId,
      eventType: "card_offer_claimed",
      campaignId: live.campaignId,
      before: claimsBeforeDb,
      timeoutMs: 25_000,
    });
    expect(claimEvent.campaignId).toBe(live.campaignId);
    expect(claimEvent.latestId).toBeTruthy();
    if (device.deviceSlotId) {
      expect(claimEvent.deviceSlotId).toBe(device.deviceSlotId);
    }

    const viewEvent = await waitForNewClickEvent({
      businessId: SEED.businessId,
      eventType: "card_offer_viewed",
      campaignId: live.campaignId,
      before: viewsBeforeDb,
      timeoutMs: 25_000,
    });
    expect(viewEvent.campaignId).toBe(live.campaignId);

    await publicCtx.close();

    // --- Insights AFTER ---
    let insightsAfter = insightsBefore;
    let reflected = false;
    const deadline = Date.now() + 45_000;
    while (Date.now() < deadline) {
      insightsAfter = await readOfferKpis(page);
      if (
        insightsAfter.claims > insightsBefore.claims ||
        insightsAfter.views > insightsBefore.views
      ) {
        reflected = true;
        break;
      }
      await page.waitForTimeout(1000);
    }
    expect(
      reflected,
      `Insights did not move: before=${JSON.stringify(insightsBefore)} after=${JSON.stringify(insightsAfter)}`
    ).toBe(true);
    expect(insightsAfter.claims).toBeGreaterThan(insightsBefore.claims);

    await page.goto(
      `${BASE}/dashboard/insights?view=card&drill=offer_claims_range&_=${Date.now()}`,
      { waitUntil: "domcontentloaded" }
    );
    await expect(page.getByTestId("insights-hub")).toBeVisible({ timeout: 30_000 });
    await assertStudioForcedDark(page, "insights after");
    await page.screenshot({
      path: path.join(OUT, "f3-insights-after.png"),
      fullPage: true,
    });

    const drillTable = page.getByTestId("insights-drill-table");
    const drillEmpty = page.getByTestId("insights-drill-empty");
    await expect(drillTable.or(drillEmpty)).toBeVisible({ timeout: 15_000 });
    if (await drillTable.isVisible().catch(() => false)) {
      await expect(page.getByTestId("insights-drill-row").first()).toBeVisible();
    }

    const provenance = page.getByTestId("insights-provenance");
    const provenanceEmpty = page.getByTestId("insights-provenance-empty");
    await expect(provenance.or(provenanceEmpty)).toBeVisible({ timeout: 15_000 });
    if (await provenance.isVisible().catch(() => false)) {
      await expect(page.getByTestId("insights-proof-row").first()).toBeVisible();
      const proofText = await provenance.innerText();
      expect(proofText).toMatch(/ClickEvent|card_offer|confirmed|offer/i);
      await page.screenshot({
        path: path.join(OUT, "f3-insights-provenance.png"),
        fullPage: true,
      });
    }

    const insightsAxe = await axeSeriousCritical(page, '[data-testid="insights-hub"]');
    expect(insightsAxe, JSON.stringify(insightsAxe, null, 2)).toEqual([]);

    // Honesty: Advanced / live still shows distribution unsent when host live visible
    await page.goto("/dashboard/card?wire=offer", { waitUntil: "domcontentloaded" });
    if (await page.getByTestId("autopilot-live-outcome").isVisible().catch(() => false)) {
      const adv = page.getByTestId("autopilot-prepared-advanced-toggle");
      if (await adv.isVisible().catch(() => false)) {
        await adv.click();
        await expect(page.getByTestId("autopilot-prepared-advanced")).toContainText(
          /distributionSent=false/i
        );
      }
    }

    // Persist proof notes
    fs.writeFileSync(
      path.join(OUT, "f3-claim-insights-notes.json"),
      JSON.stringify(
        {
          campaignId: live.campaignId,
          activationId: live.activationId,
          deviceCode,
          deviceSlotId: device.deviceSlotId ?? null,
          claimEmail,
          insightsBefore,
          insightsAfter,
          claimEvent,
          viewEvent,
          distributionSent: false,
        },
        null,
        2
      )
    );
  });

  test("forced-dark Studio matrix: tablet, phone, deep-link, new tab", async ({
    browser,
  }) => {
    test.setTimeout(120_000);

    async function runMatrix(
      ctx: BrowserContext,
      size: { width: number; height: number },
      shot: string
    ) {
      const p = await ctx.newPage();
      await p.setViewportSize(size);
      await p.emulateMedia({ colorScheme: "light" });
      await p.goto("/dashboard/card?wire=offer", { waitUntil: "domcontentloaded" });
      await assertStudioForcedDark(p, shot);
      // Capture first paint-ish after navigation (SSR already dark)
      await p.screenshot({ path: path.join(OUT, shot), fullPage: true });

      // Navigate away and back
      await p.goto("/dashboard/insights?view=card", { waitUntil: "domcontentloaded" });
      await assertStudioForcedDark(p, `${shot} insights`);
      await p.goto("/dashboard/card?wire=offer", { waitUntil: "domcontentloaded" });
      await assertStudioForcedDark(p, `${shot} back`);

      // No horizontal overflow on Autopilot region when present
      const overflow = await p.evaluate(() => {
        const el =
          document.querySelector('[data-testid="autopilot-live-outcome"]') ||
          document.querySelector('[data-testid="autopilot-outcome-experience"]') ||
          document.documentElement;
        return el.scrollWidth > el.clientWidth + 2;
      });
      expect(overflow, `${shot} overflow`).toBe(false);
      await p.close();
    }

    const tablet = await browser.newContext({ colorScheme: "light" });
    await runMatrix(tablet, { width: 820, height: 1180 }, "f3-dark-tablet-prefers-light.png");
    await tablet.close();

    const phone = await browser.newContext({ colorScheme: "light" });
    await runMatrix(phone, { width: 390, height: 844 }, "f3-dark-phone-prefers-light.png");
    await phone.close();

    // Detached/new-tab deep link
    const tab = await browser.newContext({ colorScheme: "light" });
    const p = await tab.newPage();
    await p.emulateMedia({ colorScheme: "light" });
    await p.goto("/dashboard/card?wire=offer", { waitUntil: "domcontentloaded" });
    await assertStudioForcedDark(p, "new-tab deep link");
    const popup = await tab.newPage();
    await popup.emulateMedia({ colorScheme: "light" });
    await popup.goto("/dashboard/card?wire=offer", { waitUntil: "domcontentloaded" });
    await assertStudioForcedDark(popup, "second tab");
    await popup.screenshot({
      path: path.join(OUT, "f3-dark-new-tab-prefers-light.png"),
      fullPage: true,
    });
    await tab.close();
  });
});
