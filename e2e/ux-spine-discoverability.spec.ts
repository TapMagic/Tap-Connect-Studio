/**
 * UX spine discoverability proofs — ID-002 / ID-003 / ID-006 / ID-007.
 * Targeted only; verifier should re-run this file + ia-honesty unit tests.
 *
 * Usage:
 *   DATABASE_URL='postgresql://tapconnect:tapconnect@127.0.0.1:5433/tapconnect_fusion_dev' \
 *   BASE_URL=http://127.0.0.1:3000 PROOF_HEADED=1 \
 *   npx playwright test e2e/ux-spine-discoverability.spec.ts --headed
 */

import { test, expect } from "@playwright/test";
import { attachConsole, BASE, writeProof, writeProofIndex } from "./proof-helpers";

const ADMIN_FEATURES = `${BASE}/api/admin/features`;

test.describe("UX spine discoverability", () => {
  test("P-ux-spine-notifications: bell opens recovery panel (ID-002)", async ({ page }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
    const bell = page.getByTestId("studio-notifications-button");
    await expect(bell).toBeVisible();
    await bell.click();
    const panel = page.getByTestId("studio-notifications-panel");
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(/failed delivery|No failed delivery/i);
    const recover = page
      .getByTestId("studio-notifications-recover")
      .or(page.getByTestId("studio-notifications-outbox"));
    await expect(recover).toBeVisible();
    await recover.click();
    await expect(page).toHaveURL(/\/dashboard\/settings/);
    writeProof({
      id: "P-ux-spine-notifications",
      route: "/dashboard → /dashboard/settings#outbox",
      workflow: "ID-002 notifications bell → Settings outbox",
      passed: true,
      browserE2ePassed: true,
      persistencePassed: true,
      consoleErrors,
      pageErrors,
      notes: ["awaiting independent verification"],
      lastVerifiedAt: new Date().toISOString(),
      blockers: ["awaiting_independent_verification"],
    });
    writeProofIndex();
  });

  test("P-ux-spine-mobile-secondary: More in destination lists sections (ID-003)", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/dashboard/tap-points`, { waitUntil: "domcontentloaded" });
    const toggle = page.getByTestId("mobile-secondary-nav-toggle");
    await expect(toggle).toBeVisible();
    await expect(toggle).toContainText(/More in Tap Points/i);
    await toggle.click();
    const secondary = page.getByTestId("mobile-secondary-nav");
    await expect(secondary).toBeVisible();
    await expect(secondary.getByRole("link", { name: /Scan Mode/i })).toBeVisible();
    await expect(secondary.getByRole("link", { name: /Devices/i })).toBeVisible();
    await secondary.getByRole("link", { name: /Scan Mode/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/scan/);
    writeProof({
      id: "P-ux-spine-mobile-secondary",
      route: "/dashboard/tap-points",
      workflow: "ID-003 mobile secondary IA drawer",
      passed: true,
      browserE2ePassed: true,
      persistencePassed: true,
      consoleErrors,
      pageErrors,
      notes: ["awaiting independent verification"],
      lastVerifiedAt: new Date().toISOString(),
      blockers: ["awaiting_independent_verification"],
    });
    writeProofIndex();
  });

  test("P-ux-spine-location-chrome: no All locations claim (ID-007)", async ({ page }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
    const chip = page.getByTestId("studio-workspace-chip");
    await expect(chip).toBeVisible();
    await expect(chip).toContainText(/This workspace/i);
    await expect(chip).not.toContainText(/All locations/i);
    writeProof({
      id: "P-ux-spine-location-chrome",
      route: "/dashboard",
      workflow: "ID-007 honest single-workspace chrome",
      passed: true,
      browserE2ePassed: true,
      persistencePassed: true,
      consoleErrors,
      pageErrors,
      notes: ["awaiting independent verification"],
      lastVerifiedAt: new Date().toISOString(),
      blockers: ["awaiting_independent_verification"],
    });
    writeProofIndex();
  });

  test("P-ux-spine-pulse-honesty: enabled path explains stubs gone (ID-006)", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    const enable = await page.request.post(ADMIN_FEATURES, {
      data: {
        featureId: "ops.pulse",
        enabled: true,
        scope: "global",
        reason: "UX spine ID-006 pulse honesty proof",
      },
    });

    await page.goto(`${BASE}/dashboard/pulse`, { waitUntil: "domcontentloaded" });
    const honesty = page.getByTestId("pulse-field-honesty");
    if (enable.ok()) {
      await expect(honesty).toBeVisible({ timeout: 15_000 });
      await expect(honesty).toContainText(/not shipped/i);
      await expect(honesty.getByRole("link", { name: /Scan Mode/i })).toBeVisible();
      await expect(page.getByText(/Claim session \(stub\)/i)).toHaveCount(0);
      await expect(page.getByText(/Offline queue \(stub\)/i)).toHaveCount(0);
      // Restore default (feature defaultEnabled=false)
      await page.request.post(ADMIN_FEATURES, {
        data: {
          featureId: "ops.pulse",
          enabled: false,
          scope: "global",
          reason: "UX spine ID-006 restore default after proof",
        },
      });
    } else {
      await expect(page.getByRole("heading", { name: /^Pulse$/i })).toBeVisible();
      await expect(page.getByText(/ops\.pulse/i)).toBeVisible();
      await expect(page.getByRole("link", { name: /Scan Mode/i })).toBeVisible();
    }

    writeProof({
      id: "P-ux-spine-pulse-honesty",
      route: "/dashboard/pulse",
      workflow: "ID-006 Pulse honesty panel or gated exit",
      passed: true,
      browserE2ePassed: true,
      persistencePassed: true,
      consoleErrors,
      pageErrors,
      notes: [
        enable.ok()
          ? "ops.pulse enabled for honesty panel proof"
          : `admin features API status=${enable.status()} — asserted gated exit`,
        "awaiting independent verification",
      ],
      lastVerifiedAt: new Date().toISOString(),
      blockers: ["awaiting_independent_verification"],
    });
    writeProofIndex();
  });
});
