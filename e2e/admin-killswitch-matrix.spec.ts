/**
 * Expanded Admin kill-switch matrix — beyond Keywords / TapCanvas / TapFlow triad.
 *
 * Proves for each expanded feature:
 *   disable → UI/API/runtime 503 feature_off → audit override → re-enable → retry
 *
 * Usage:
 *   DATABASE_URL='postgresql://tapconnect:tapconnect@127.0.0.1:5433/tapconnect_fusion_dev' \
 *   BASE_URL=http://127.0.0.1:3000 PROOF_HEADED=1 \
 *   npx playwright test e2e/admin-killswitch-matrix.spec.ts --headed
 */

import { test, expect } from "@playwright/test";
import {
  attachConsole,
  BASE,
  writeProof,
  writeProofIndex,
} from "./proof-helpers";
import {
  EXPANDED_KILL_SWITCH_PROOF_IDS,
  KILL_SWITCH_MATRIX,
  type KillSwitchProbe,
} from "@/lib/fusion/features/kill-switch-matrix";

const ADMIN_FEATURES = `${BASE}/api/admin/features`;

async function setFeature(
  page: import("@playwright/test").Page,
  featureId: string,
  enabled: boolean,
  reason: string
) {
  return page.request.post(ADMIN_FEATURES, {
    data: { featureId, enabled, scope: "global", reason },
  });
}

async function probe(
  page: import("@playwright/test").Page,
  spec: NonNullable<KillSwitchProbe["probe"]>
) {
  if (spec.method === "GET") {
    return page.request.get(`${BASE}${spec.path}`);
  }
  return page.request.post(`${BASE}${spec.path}`, { data: spec.body ?? {} });
}

test.describe("Admin kill-switch expanded matrix", () => {
  test.describe.configure({ timeout: 240_000 });

  test("P-admin-killswitch-matrix: expand disable→503→audit→re-enable→retry", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    const notes: string[] = [];
    const blockers: string[] = [];

    await page.goto(`${BASE}/admin/platform`, { waitUntil: "domcontentloaded" });
    const registryTab = page.locator(
      '[data-testid="admin-tab-features"], #admin-tab-features'
    );
    if ((await registryTab.count()) > 0) {
      await registryTab.click();
      notes.push("opened:feature_registry_tab");
    } else {
      notes.push("feature_registry_tab_missing_shell_ok");
    }

    const list = await page.request.get(ADMIN_FEATURES);
    if (!list.ok()) {
      blockers.push("admin_features_api_unavailable");
      writeProof({
        id: "P-admin-killswitch-matrix",
        route: "/api/admin/features + expanded kill-switch probes",
        workflow: "Expanded kill-switch matrix",
        passed: false,
        browserE2ePassed: false,
        persistencePassed: false,
        consoleErrors,
        pageErrors,
        notes: ["admin features API unavailable"],
        lastVerifiedAt: new Date().toISOString(),
        blockers,
      });
      writeProofIndex();
      expect(list.ok()).toBeTruthy();
      return;
    }

    const rows = KILL_SWITCH_MATRIX.filter((r) =>
      (EXPANDED_KILL_SWITCH_PROOF_IDS as readonly string[]).includes(r.featureId)
    );

    for (const row of rows) {
      const reasonBase = `P-admin-killswitch-matrix ${row.featureId}`;

      // Ensure primary + companions ON first
      await setFeature(page, row.featureId, true, `${reasonBase} pre-enable`);
      for (const extra of row.alsoDisable ?? []) {
        await setFeature(page, extra, true, `${reasonBase} companion pre-enable ${extra}`);
      }

      // Ensure live-exec parent features stay on for live_execution probe
      if (row.featureId === "integrations.live_execution") {
        await setFeature(page, "connectors.productivity", true, `${reasonBase} parent on`);
        await setFeature(page, "tapcast.tiktok", true, `${reasonBase} tiktok parent on`);
      }

      // Disable target (+ companions)
      const disable = await setFeature(
        page,
        row.featureId,
        false,
        `${reasonBase} disable`
      );
      expect(disable.ok(), `${row.featureId} disable`).toBeTruthy();
      for (const extra of row.alsoDisable ?? []) {
        const d = await setFeature(page, extra, false, `${reasonBase} companion disable ${extra}`);
        expect(d.ok(), `${extra} companion disable`).toBeTruthy();
      }

      const blocked = await probe(page, row.probe);
      notes.push(`${row.featureId}_off_status=${blocked.status()}`);
      expect(blocked.status(), `${row.featureId} should 503`).toBe(503);
      const blockedBody = (await blocked.json()) as {
        code?: string;
        feature?: string;
      };
      expect(blockedBody.code).toBe("feature_off");
      if (row.alsoDisable?.length) {
        expect(String(blockedBody.feature ?? "")).toMatch(
          new RegExp(row.featureId.replace(".", "\\."))
        );
      } else {
        expect(blockedBody.feature).toBe(row.featureId);
      }

      if (row.secondaryProbe) {
        const secondary = await probe(page, row.secondaryProbe);
        notes.push(`${row.featureId}_secondary_off=${secondary.status()}`);
        expect(secondary.status(), `${row.featureId} secondary`).toBe(503);
      }

      // Re-enable + audit
      await setFeature(page, row.featureId, true, `${reasonBase} re-enable`);
      for (const extra of row.alsoDisable ?? []) {
        await setFeature(page, extra, true, `${reasonBase} companion re-enable ${extra}`);
      }

      const after = await page.request.get(ADMIN_FEATURES);
      const afterJson = (await after.json()) as {
        overrides?: { featureId?: string; enabled?: boolean; reason?: string }[];
      };
      const audit = (afterJson.overrides ?? []).find((o) => o.featureId === row.featureId);
      notes.push(
        `audit_${row.featureId}=${audit?.enabled ?? "missing"}:${audit?.reason ?? "none"}`
      );
      expect(audit?.enabled).toBe(true);

      const retry = await probe(page, row.probe);
      notes.push(`${row.featureId}_retry=${retry.status()}`);
      // After re-enable: must NOT be feature_off (credentials/placeholder 503 OK)
      if (retry.status() === 503) {
        const retryBody = (await retry.json().catch(() => ({}))) as {
          code?: string;
          feature?: string;
        };
        expect(
          retryBody.code === "feature_off" &&
            String(retryBody.feature ?? "").includes(row.featureId),
          `${row.featureId} still feature_off after re-enable`
        ).toBeFalsy();
        notes.push(`${row.featureId}_retry_non_feature_off_503_ok`);
      } else {
        expect(retry.ok() || retry.status() < 500 || retry.status() === 400).toBeTruthy();
      }
    }

    // UI confirm pattern still present
    await page.goto(`${BASE}/admin/platform`, { waitUntil: "domcontentloaded" });
    if ((await registryTab.count()) > 0) await registryTab.click();
    const killSwitchCopy = page.getByText(/Kill-switch vs executable|kill-switch/i);
    notes.push(
      (await killSwitchCopy.count()) > 0
        ? "killswitch_ui_copy_present"
        : "killswitch_ui_copy_missing"
    );

    writeProof({
      id: "P-admin-killswitch-matrix",
      route: "/admin/platform + /api/admin/features + expanded probes",
      workflow:
        "Expanded Admin kill-switches: Email, Inbox, Messaging, Wallet, TapLoop, TapCommerce, TapCast, TikTok, Productivity, Autopilot, live_execution — disable→503→audit→re-enable→retry",
      passed: pageErrors.length === 0 && blockers.length === 0,
      browserE2ePassed: true,
      persistencePassed: true,
      consoleErrors,
      pageErrors,
      notes,
      lastVerifiedAt: new Date().toISOString(),
      blockers: [
        ...blockers,
        "not_owner_ready",
        "true_voiceover_nvda_manual_residual",
      ],
    });
    writeProofIndex();

    expect(pageErrors.length).toBe(0);
  });
});
