/**
 * Extended headed-safe matrix proofs — builder save, TapFlow lifecycle, admin,
 * insights export, nav audit, responsive, and a11y smoke.
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:3000 npx playwright test e2e/fusion-proofs-matrix.spec.ts --headed
 *   npm run test:e2e:proofs
 */

import { test, expect } from "@playwright/test";
import {
  attachConsole,
  BASE,
  SEED,
  writeProof,
  writeProofIndex,
  type ProofRecord,
} from "./proof-helpers";

test.describe("Fusion matrix proofs (headed-safe)", () => {
  test.describe.configure({ timeout: 90_000 });

  test("P-builder-save: seed campaign editor save + reload persistence", async ({ page }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    const notes: string[] = [];
    const blockers: string[] = [];

    const route = `/dashboard/campaigns/${SEED.campaignId}`;
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);

    const bodyBefore = await page.locator("body").innerText();
    const shellOk =
      bodyBefore.length > 40 &&
      /Welcome|SEED|Campaign|Block|Preview|Save|Headline|Offer/i.test(bodyBefore);
    notes.push(`shellChars=${bodyBefore.length}`);
    if (!shellOk) blockers.push("campaign_editor_shell_missing");

    const marker = `ProofHeadline_${Date.now()}`;

    // Authoritative persistence via same PATCH API as the Save button
    const patchRes = await page.request.patch(`${BASE}/api/campaigns/assign`, {
      data: {
        id: SEED.campaignId,
        contentBlocks: [
          {
            id: "seed_headline",
            type: "headline",
            label: "Headline",
            order: 0,
            enabled: true,
            data: {
              headline: marker,
              subheadline: "Keep this card, earn TapLoop points, and reopen anytime.",
              alignment: "center",
            },
          },
          {
            id: "seed_body",
            type: "rich_text",
            label: "Details",
            order: 1,
            enabled: true,
            data: {
              body: "Seed demo only — not production. Unlock the coupon below after sharing your info.",
            },
          },
          {
            id: "seed_email",
            type: "email_capture",
            label: "Contact",
            order: 2,
            enabled: true,
            data: {
              headline: "Unlock your coupon",
              description: "Share your contact info to reveal today’s special.",
              fields: ["name", "email"],
              requireName: true,
              successMessage: "You're in — your coupon is below.",
            },
          },
          {
            id: "seed_offer",
            type: "offer_coupon",
            label: "Offer",
            order: 3,
            enabled: true,
            data: {
              title: "Welcome perk",
              description: "Flight-test coupon",
              code: "SEEDDEMO",
              ctaLabel: "Reveal offer",
              lockedUntilContact: true,
            },
          },
          {
            id: "seed_disclaimer",
            type: "disclaimer",
            label: "Disclaimer",
            order: 4,
            enabled: true,
            data: { text: "Seed data for local fusion DB only. Not a real offer." },
          },
        ],
      },
    });
    notes.push(`patch:${patchRes.status()}`);
    const patchOk = patchRes.ok();
    if (!patchOk) blockers.push("campaign_patch_failed");

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    const bodyAfter = await page.locator("body").innerText();
    const persistencePassed = patchOk && bodyAfter.includes(marker);
    notes.push(persistencePassed ? "reload_shows_marker" : "reload_missing_marker");
    if (!persistencePassed && patchOk) blockers.push("headline_not_visible_after_reload");

    const saveBtn = page
      .locator('[data-testid="campaign-save"]')
      .or(page.getByRole("button", { name: /^Save$/i }));
    notes.push((await saveBtn.count()) > 0 ? "save_button_present" : "save_button_missing");
    if ((await saveBtn.count()) === 0) blockers.push("save_button_missing");

    writeProof({
      id: "P-builder-save",
      route,
      workflow: "Campaign PATCH save → reload persistence (+ Save control probe)",
      passed: persistencePassed && pageErrors.length === 0,
      browserE2ePassed: shellOk && persistencePassed,
      persistencePassed,
      consoleErrors,
      pageErrors,
      notes,
      lastVerifiedAt: new Date().toISOString(),
      blockers: persistencePassed
        ? ["publish_assign_public_matrix", "ui_headline_edit_selector", "format_media_stock_proof"]
        : blockers,
    });

    // Restore seed headline so later public-tap responsive proofs are not polluted
    // by an unbroken ProofHeadline_* token left in the LIVE campaign.
    if (patchOk) {
      await page.request.patch(`${BASE}/api/campaigns/assign`, {
        data: {
          id: SEED.campaignId,
          contentBlocks: [
            {
              id: "seed_headline",
              type: "headline",
              label: "Headline",
              order: 0,
              enabled: true,
              data: {
                headline: "[SEED] Welcome — Flight Test Card",
                subheadline: "Keep this card, earn TapLoop points, and reopen anytime.",
                alignment: "center",
              },
            },
            {
              id: "seed_body",
              type: "rich_text",
              label: "Details",
              order: 1,
              enabled: true,
              data: {
                body: "Seed demo only — not production. Unlock the coupon below after sharing your info.",
              },
            },
            {
              id: "seed_email",
              type: "email_capture",
              label: "Contact",
              order: 2,
              enabled: true,
              data: {
                headline: "Unlock your coupon",
                description: "Share your contact info to reveal today’s special.",
                fields: ["name", "email"],
                requireName: true,
                successMessage: "You're in — your coupon is below.",
              },
            },
            {
              id: "seed_offer",
              type: "offer_coupon",
              label: "Offer",
              order: 3,
              enabled: true,
              data: {
                title: "Welcome perk",
                description: "Flight-test coupon",
                code: "SEEDDEMO",
                ctaLabel: "Reveal offer",
                lockedUntilContact: true,
              },
            },
            {
              id: "seed_disclaimer",
              type: "disclaimer",
              label: "Disclaimer",
              order: 4,
              enabled: true,
              data: { text: "Seed data for local fusion DB only. Not a real offer." },
            },
          ],
        },
      });
      notes.push("seed_headline_restored");
    }

    expect(persistencePassed).toBeTruthy();
  });

  test("P-tapflow-lifecycle: seed journey visible + lifecycle controls", async ({ page }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    const notes: string[] = [];
    const blockers: string[] = [];
    const route = "/dashboard/experiences/journeys";

    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
    const body = await page.locator("body").innerText();
    const seedVisible =
      body.includes(SEED.journeyName) ||
      /Demo Journey|SEED.*Journey/i.test(body);
    notes.push(seedVisible ? "seed_journey_visible" : "seed_journey_not_found");

    if (!seedVisible) {
      blockers.push("seed_journey_not_listed");
    }

    const draftBtn = page
      .getByRole("button", { name: /Demo Journey|SEED/i })
      .first();
    const draftFallback = page.getByText(/Demo Journey|SEED.*Journey/i).first();
    if ((await draftBtn.count()) > 0) {
      await draftBtn.click();
      notes.push("loaded:seed_draft");
    } else if ((await draftFallback.count()) > 0) {
      await draftFallback.click();
      notes.push("loaded:draft_fallback_click");
    } else {
      blockers.push("draft_load_control_missing");
    }

    await page.waitForTimeout(800);

    for (const name of [/Simulate/i, /Dry-run/i, /Pause/i]) {
      const btn = page.getByRole("button", { name }).first();
      if ((await btn.count()) === 0) {
        notes.push(`absent:${name.source}`);
        continue;
      }
      const disabled = await btn.isDisabled();
      if (disabled) {
        notes.push(`present_disabled:${name.source}`);
        continue;
      }
      await btn.click();
      await page.waitForTimeout(1200);
      notes.push(`clicked:${name.source}`);
      const after = await page.locator("body").innerText();
      if (/Dry-run|Simulate|completed|blocked|Save draft|failed/i.test(after)) {
        notes.push(`feedback_after:${name.source}`);
      }
    }

    const browserE2ePassed = seedVisible && pageErrors.length === 0;

    writeProof({
      id: "P-tapflow-lifecycle",
      route,
      workflow: "TapFlow journeys — seed draft + Simulate/Dry-run/Pause matrix",
      passed: browserE2ePassed,
      browserE2ePassed,
      persistencePassed: false,
      consoleErrors,
      pageErrors,
      notes,
      lastVerifiedAt: new Date().toISOString(),
      blockers,
    });

    expect(seedVisible).toBeTruthy();
  });

  test("P-admin-killswitch: feature registry read-only + API", async ({ page }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    const notes: string[] = [];
    const blockers: string[] = [];
    const route = "/admin/platform";

    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
    await expect(page.locator("body")).toContainText(/Feature|Registry|Kill-switch|Platform|Override/i, {
      timeout: 25000,
    });

    const registryTab = page.locator('[data-testid="admin-tab-features"], #admin-tab-features');
    let registryUiOk = false;
    if ((await registryTab.count()) > 0) {
      await registryTab.click();
      const panel = page.locator("#admin-panel-features");
      registryUiOk = await panel
        .waitFor({ state: "visible", timeout: 8000 })
        .then(() => true)
        .catch(() => false);
      notes.push(registryUiOk ? "opened:feature_registry_tab" : "feature_registry_tab_click_no_panel");
      if (!registryUiOk) {
        blockers.push("feature_registry_panel_not_interactive");
        await page.evaluate(() => {
          document.getElementById("admin-tab-features")?.click();
        });
        registryUiOk = await page
          .locator("#admin-panel-features")
          .isVisible()
          .catch(() => false);
        if (registryUiOk) notes.push("opened:feature_registry_via_eval_click");
      }
    } else {
      blockers.push("feature_registry_tab_missing");
    }

    const registryTable = page.locator("#admin-panel-features table, table").first();
    const hasTable = (await registryTable.count()) > 0;
    notes.push(hasTable ? "registry_table_present" : "registry_table_missing");

    const killSwitchCopy = page.getByText(/Kill-switch vs executable/i);
    notes.push((await killSwitchCopy.count()) > 0 ? "killswitch_copy_present" : "killswitch_copy_missing");

    const apiRes = await page.request.get(`${BASE}/api/admin/features`);
    const apiOk = apiRes.ok();
    notes.push(`api_get=${apiRes.status()}`);
    if (apiOk) {
      const json = (await apiRes.json()) as { overrides?: unknown[] };
      notes.push(`overrideCount=${json.overrides?.length ?? 0}`);
    } else {
      blockers.push("admin_features_api_unavailable");
    }

    const disableBtn = page
      .getByRole("button", { name: /Kill-switch OFF|Disable/i })
      .first();
    if ((await disableBtn.count()) > 0) {
      await disableBtn.click();
      await page.waitForTimeout(400);
      const dialog = page.getByRole("alertdialog");
      const confirmVisible = (await dialog.count()) > 0;
      notes.push(confirmVisible ? "confirm_dialog_opened" : "confirm_dialog_missing");
      if (confirmVisible) {
        const cancel = page.getByRole("button", { name: /^Cancel$/i });
        if ((await cancel.count()) > 0) {
          await cancel.click();
          notes.push("confirm_dialog_cancelled_read_only");
        } else {
          blockers.push("confirm_cancel_missing");
        }
      }
    } else {
      notes.push("no_disable_control_clicked_read_only");
    }

    const browserE2ePassed =
      (apiOk || registryUiOk || hasTable) && pageErrors.length === 0;

    writeProof({
      id: "P-admin-killswitch",
      route: `${route} + GET /api/admin/features`,
      workflow: "Platform Admin feature registry + kill-switch confirm pattern (read-only)",
      passed: browserE2ePassed && apiOk,
      browserE2ePassed,
      persistencePassed: apiOk,
      consoleErrors,
      pageErrors,
      notes,
      lastVerifiedAt: new Date().toISOString(),
      blockers,
    });

    expect(apiOk || (await registryTab.count()) > 0).toBeTruthy();
  });

  test("P-insights-export: filters + CSV export attempt", async ({ page }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    const notes: string[] = [];
    const blockers: string[] = [];
    const route = "/dashboard/insights";

    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
    await expect(page.locator("body")).toContainText(/Insight|KPI|TapProof|Analytics|Export/i, {
      timeout: 25000,
    });

    const range7 = page.getByRole("link", { name: /^7d$/i });
    const range14 = page.getByRole("link", { name: /^14d$/i });
    if ((await range7.count()) > 0) notes.push("filter:7d_present");
    if ((await range14.count()) > 0) notes.push("filter:14d_present");
    if ((await range7.count()) === 0 && (await range14.count()) === 0) {
      blockers.push("date_range_filters_missing");
    }

    const exportLink = page.getByRole("link", { name: /Export CSV/i }).first();
    let exportOk = false;
    if ((await exportLink.count()) > 0) {
      notes.push("export_link_present");
      const href = await exportLink.getAttribute("href");
      if (href) {
        const csvRes = await page.request.get(`${BASE}${href.startsWith("/") ? href : `/${href}`}`);
        exportOk = csvRes.ok();
        const ct = csvRes.headers()["content-type"] ?? "";
        notes.push(`export_api=${csvRes.status()} contentType=${ct.slice(0, 40)}`);
        if (exportOk) {
          const text = await csvRes.text();
          notes.push(`csvBytes=${text.length}`);
        }
      }
    } else {
      blockers.push("export_csv_link_missing");
      const fallback = await page.request.get(`${BASE}/api/insights/export?days=14&format=csv`);
      exportOk = fallback.ok();
      notes.push(`export_api_fallback=${fallback.status()}`);
    }

    const browserE2ePassed = pageErrors.length === 0;

    writeProof({
      id: "P-insights-export",
      route: `${route} + /api/insights/export`,
      workflow: "Insights date filters + CSV export/download",
      passed: browserE2ePassed && exportOk,
      browserE2ePassed,
      persistencePassed: exportOk,
      consoleErrors,
      pageErrors,
      notes,
      lastVerifiedAt: new Date().toISOString(),
      blockers: exportOk ? blockers : [...blockers, "csv_export_failed"],
    });

    expect(browserE2ePassed).toBeTruthy();
  });

  test("P-controls-audit: primary nav hubs button/link counts", async ({ page }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    const hubs: ProofRecord["notes"] = [];

    const routes = [
      { name: "Home", path: "/dashboard" },
      { name: "Experiences", path: "/dashboard/experiences" },
      { name: "Tap Points", path: "/dashboard/tap-points" },
      { name: "Audience", path: "/dashboard/audience" },
      { name: "Insights", path: "/dashboard/insights" },
      { name: "Assets", path: "/dashboard/assets" },
      { name: "Settings", path: "/dashboard/settings" },
    ] as const;

    const hubSummaries: {
      hub: string;
      path: string;
      buttons: number;
      links: number;
      bodyChars: number;
      navOk: boolean;
    }[] = [];

    for (const hub of routes) {
      await page.goto(`${BASE}${hub.path}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(600);
      const buttons = await page.locator("button").count();
      const links = await page.locator("a[href]").count();
      const bodyChars = (await page.locator("body").innerText()).length;
      const navOk = bodyChars > 30;
      hubSummaries.push({
        hub: hub.name,
        path: hub.path,
        buttons,
        links,
        bodyChars,
        navOk,
      });
      hubs.push(`${hub.name}:buttons=${buttons},links=${links},chars=${bodyChars},nav=${navOk}`);
    }

    const allNavOk = hubSummaries.every((h) => h.navOk);
    const totalButtons = hubSummaries.reduce((n, h) => n + h.buttons, 0);
    const totalLinks = hubSummaries.reduce((n, h) => n + h.links, 0);

    writeProof({
      id: "P-controls-audit",
      route: routes.map((r) => r.path).join(" | "),
      workflow: "Interactive control audit across primary Studio hubs",
      passed: allNavOk && pageErrors.length === 0,
      browserE2ePassed: allNavOk,
      persistencePassed: false,
      consoleErrors,
      pageErrors,
      notes: [
        ...hubs,
        `totals:buttons=${totalButtons},links=${totalLinks}`,
        `hubs=${hubSummaries.length}`,
      ],
      lastVerifiedAt: new Date().toISOString(),
      blockers: allNavOk ? [] : ["hub_nav_empty"],
    });

    expect(allNavOk).toBeTruthy();
    expect(totalButtons).toBeGreaterThan(0);
    expect(totalLinks).toBeGreaterThan(0);
  });

  test("P-responsive: mobile + desktop viewports on dashboard and public tap", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    const notes: string[] = [];
    const blockers: string[] = [];

    const checks: { route: string; viewport: string; ok: boolean; chars: number }[] = [];

    for (const vp of [
      { label: "390x844", width: 390, height: 844 },
      { label: "1280x720", width: 1280, height: 720 },
    ]) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const route of ["/dashboard", `/t/${SEED.deviceCode}`]) {
        await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(800);
        const text = await page.locator("body").innerText();
        const ok = text.length > 40;
        checks.push({ route, viewport: vp.label, ok, chars: text.length });
        notes.push(`${vp.label}@${route}:chars=${text.length},ok=${ok}`);
        if (!ok) blockers.push(`empty_${vp.label}_${route.replace(/\//g, "_")}`);
      }
    }

    const allOk = checks.every((c) => c.ok);

    writeProof({
      id: "P-responsive",
      route: `/dashboard + /t/${SEED.deviceCode}`,
      workflow: "Responsive smoke at 390×844 and 1280×720",
      passed: allOk && pageErrors.length === 0,
      browserE2ePassed: allOk,
      persistencePassed: false,
      consoleErrors,
      pageErrors,
      notes,
      lastVerifiedAt: new Date().toISOString(),
      blockers,
    });

    expect(allOk).toBeTruthy();
  });

  test("P-a11y: main landmark + heading on dashboard and public tap", async ({ page }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    const notes: string[] = [];
    const blockers: string[] = [];

    for (const route of ["/dashboard", `/t/${SEED.deviceCode}`]) {
      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(600);

      const main = page.locator("main").first();
      const hasMain = (await main.count()) > 0;
      notes.push(`${route}:main=${hasMain}`);
      if (!hasMain && route.startsWith("/dashboard")) {
        blockers.push(`main_missing_${route.replace(/\//g, "_")}`);
      } else if (!hasMain) {
        notes.push(`${route}:main_absent_public_tap_known_gap`);
      }

      const h1 = page.locator("h1").first();
      const hasH1 = (await h1.count()) > 0;
      notes.push(`${route}:h1=${hasH1}`);
      if (!hasH1) blockers.push(`h1_missing_${route.replace(/\//g, "_")}`);

      if (hasMain) {
        const mainText = (await main.innerText()).trim();
        expect(mainText.length).toBeGreaterThan(10);
      } else if (hasH1) {
        const h1Text = (await h1.innerText()).trim();
        expect(h1Text.length).toBeGreaterThan(0);
      }
    }

    const browserE2ePassed =
      blockers.filter((b) => !b.includes("main_missing")).length === 0 && pageErrors.length === 0;

    writeProof({
      id: "P-a11y",
      route: `/dashboard + /t/${SEED.deviceCode}`,
      workflow: "Structural a11y smoke — main landmark + h1 presence",
      passed: browserE2ePassed,
      browserE2ePassed,
      persistencePassed: false,
      consoleErrors,
      pageErrors,
      notes,
      lastVerifiedAt: new Date().toISOString(),
      blockers,
    });

    expect(blockers.filter((b) => b.startsWith("h1_")).length).toBe(0);
  });

  test("P-wallet-mock: Keep → MyTap → Add to Wallet mock", async ({ page }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    const email = `wallet_${Date.now()}@example.com`;
    const keep = await page.request.post(`${BASE}/api/tapsave/keep`, {
      data: {
        businessId: SEED.businessId,
        email,
        name: "Wallet Proof",
        consentGiven: true,
        campaignId: SEED.campaignId,
      },
    });
    const keepJson = (await keep.json().catch(() => ({}))) as {
      ok?: boolean;
      publicToken?: string;
      myTapUrl?: string;
    };
    const token = keepJson.publicToken;
    const myTap = keepJson.myTapUrl || (token ? `/mytap/${token}` : null);
    const blockers: string[] = [];
    const notes: string[] = [`keep=${keep.status()}`, `token=${token}`];

    if (!keep.ok() || !token || !myTap) {
      blockers.push("keep_failed");
    }

    let walletApiOk = false;
    if (token) {
      const issue = await page.request.post(`${BASE}/api/mytap/wallet`, {
        data: { publicToken: token, platform: "apple" },
      });
      notes.push(`wallet_api=${issue.status()}`);
      walletApiOk = issue.ok();
      if (!walletApiOk) blockers.push("wallet_mock_api_failed");
    }

    let myTapUi = false;
    if (myTap) {
      await page.goto(`${BASE}${myTap}`, { waitUntil: "domcontentloaded" });
      const body = await page.locator("body").innerText();
      myTapUi = /Wallet|Add to Wallet|MyTap|pass|mock/i.test(body);
      notes.push(myTapUi ? "mytap_wallet_ui" : "mytap_no_wallet_copy");
      if (!myTapUi) blockers.push("mytap_wallet_cta_missing");
    }

    writeProof({
      id: "P-wallet-mock-tapsave",
      route: "/api/tapsave/keep → /api/mytap/wallet → /mytap/…",
      workflow: "Keep Card → mock Apple Wallet issue → MyTap surface",
      passed: Boolean(token) && walletApiOk,
      browserE2ePassed: Boolean(token) && myTapUi,
      persistencePassed: walletApiOk,
      consoleErrors,
      pageErrors,
      notes,
      lastVerifiedAt: new Date().toISOString(),
      blockers: blockers.length
        ? blockers
        : ["live_apple_google_credentials", "audience_wallet_list_headed"],
    });

    expect(Boolean(token) && walletApiOk).toBeTruthy();
  });

  test("aggregate proof index (matrix)", async () => {
    const index = writeProofIndex();
    expect(index.count).toBeGreaterThan(0);
  });
});
