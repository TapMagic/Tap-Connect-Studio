/**
 * Headed TapLoop operator UI proofs (isolated DB).
 * Kept separate so other agents editing fusion-proofs.spec.ts do not clobber this matrix.
 */

import { test, expect } from "@playwright/test";
import { attachConsole, BASE, SEED, writeProof } from "./proof-helpers";

test.describe("TapLoop operator UI proofs", () => {
  test.describe.configure({ timeout: 120_000 });

  test("P-taploop: program UI + award/redeem/reverse/adjust + idempotency", async ({ page }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    const notes: string[] = [];
    const blockers: string[] = [];

    await page.goto(`${BASE}/dashboard/audience#taploop`, { waitUntil: "networkidle" });
    const workspace = page.getByTestId("taploop-workspace");
    await expect(workspace).toBeVisible({ timeout: 20000 });
    await page.locator("text=Compiling").waitFor({ state: "hidden", timeout: 60000 }).catch(() => undefined);
    notes.push("workspace_visible");

    const programName = `Owner UI ${Date.now()}`;
    const nameInput = page.getByTestId("taploop-program-name");
    await nameInput.fill(programName);
    await expect(nameInput).toHaveValue(programName);

    const createRespPromise = page.waitForResponse((r) => {
      if (!r.url().includes("/api/loyalty/programs") || r.request().method() !== "POST") return false;
      try {
        return !r.request().postDataJSON()?.action;
      } catch {
        return true;
      }
    }, { timeout: 20000 });
    await page.getByTestId("taploop-create-program").click();
    const createResp = await createRespPromise;
    const createJson = await createResp.json().catch(() => ({}));
    notes.push(`create_status=${createResp.status()}`);
    if (!createResp.ok()) {
      blockers.push(`create_failed:${createJson.error ?? createResp.status()}`);
    }
    await expect(page.getByText(programName).first()).toBeVisible({ timeout: 15000 });
    notes.push("program_created");

    await page.getByTestId("taploop-reward-name").fill("Free pastry");
    await page.getByTestId("taploop-reward-cost").fill("25");
    const rulesRespPromise = page.waitForResponse((r) => {
      if (!r.url().includes("/api/loyalty/programs") || r.request().method() !== "POST") return false;
      try {
        return r.request().postDataJSON()?.action === "defineRules";
      } catch {
        return false;
      }
    }, { timeout: 20000 });
    await page.getByTestId("taploop-save-rules").click();
    const rulesResp = await rulesRespPromise;
    notes.push(`rules_status=${rulesResp.status()}`);
    expect(rulesResp.ok()).toBeTruthy();
    notes.push("rules_tiers_reward_saved");

    await page.request.post(`${BASE}/api/audience/consent`, {
      data: { contactId: SEED.contactId, channel: "EMAIL", status: "GRANTED" },
    });
    await page.getByTestId("taploop-contact-id").fill(SEED.contactId);
    const enrollRespPromise = page.waitForResponse(
      (r) => r.url().includes("/api/loyalty/enroll") && r.request().method() === "POST",
      { timeout: 20000 }
    );
    await page.getByTestId("taploop-enroll").click();
    const enrollResp = await enrollRespPromise;
    const enrollJson = await enrollResp.json().catch(() => ({}));
    notes.push(`enroll_status=${enrollResp.status()}`);
    expect(enrollResp.ok()).toBeTruthy();
    notes.push("enrolled_via_ui");

    await expect(page.getByTestId("taploop-member-balance")).toBeVisible({ timeout: 15000 });

    await page.getByTestId("taploop-points").fill("12");
    await page.getByTestId("taploop-reason").fill("headed_ui_award");
    await page.getByTestId("taploop-evidence").fill(`ev_${Date.now()}`);
    const idem = `ui_award_${Date.now()}`;
    await page.getByTestId("taploop-idempotency").fill(idem);

    const awardRespPromise = page.waitForResponse(
      (r) => r.url().includes("/api/loyalty/award") && r.request().method() === "POST",
      { timeout: 20000 }
    );
    await page.getByTestId("taploop-award").click();
    const awardResp = await awardRespPromise;
    const awardJson = await awardResp.json().catch(() => ({}));
    notes.push(`award_status=${awardResp.status()}`, `award_dup=${awardJson.duplicate === true}`);
    expect(awardResp.ok()).toBeTruthy();
    notes.push("award_ui");

    await page.getByTestId("taploop-idempotency").fill(idem);
    const dupRespPromise = page.waitForResponse(
      (r) => r.url().includes("/api/loyalty/award") && r.request().method() === "POST",
      { timeout: 20000 }
    );
    await page.getByTestId("taploop-award-duplicate").click();
    const dupResp = await dupRespPromise;
    const dupJson = await dupResp.json().catch(() => ({}));
    notes.push(`dup_status=${dupResp.status()}`, `dup_flag=${dupJson.duplicate === true}`);
    expect(dupResp.ok() && dupJson.duplicate === true).toBeTruthy();
    notes.push("duplicate_prevented_ui");

    await page.getByTestId("taploop-points").fill("2");
    const redeemRespPromise = page.waitForResponse(
      (r) => r.url().includes("/api/loyalty/redeem") && r.request().method() === "POST",
      { timeout: 20000 }
    );
    await page.getByTestId("taploop-redeem").click();
    const redeemResp = await redeemRespPromise;
    notes.push(`redeem_status=${redeemResp.status()}`);
    expect(redeemResp.ok()).toBeTruthy();
    notes.push("redeem_ui");

    await page.getByTestId("taploop-adjust-direction").selectOption("credit");
    await page.getByTestId("taploop-points").fill("3");
    const adjustRespPromise = page.waitForResponse(
      (r) => r.url().includes("/api/loyalty/adjust") && r.request().method() === "POST",
      { timeout: 20000 }
    );
    await page.getByTestId("taploop-adjust").click();
    const adjustResp = await adjustRespPromise;
    notes.push(`adjust_status=${adjustResp.status()}`);
    expect(adjustResp.ok()).toBeTruthy();
    notes.push("adjust_ui");

    const reverseUi = page.locator('[data-testid^="taploop-reverse-"]').first();
    await expect(reverseUi).toBeVisible({ timeout: 10000 });
    const reverseRespPromise = page.waitForResponse(
      (r) => r.url().includes("/api/loyalty/reverse") && r.request().method() === "POST",
      { timeout: 20000 }
    );
    await reverseUi.click();
    const reverseResp = await reverseRespPromise;
    notes.push(`reverse_status=${reverseResp.status()}`);
    expect(reverseResp.ok()).toBeTruthy();
    notes.push("reverse_ui");

    await expect(page.getByTestId("taploop-insights-kpis")).toBeVisible();
    await expect(page.getByTestId("taploop-audit")).toBeVisible();
    await expect(page.getByTestId("taploop-admin-link")).toBeVisible();
    notes.push("member_detail_insights_audit_admin");

    const awardApi = await page.request.post(`${BASE}/api/loyalty/award`, {
      data: {
        enrollmentId: SEED.enrollmentId,
        points: 1,
        idempotencyKey: `proof_seed_${Date.now()}`,
        reason: "seed_api_crosscheck",
      },
    });
    notes.push(`seed_award_api=${awardApi.status()}`);

    const passed =
      pageErrors.length === 0 &&
      createResp.ok() &&
      enrollResp.ok() &&
      notes.includes("duplicate_prevented_ui") &&
      notes.includes("reverse_ui") &&
      awardApi.ok();

    if (!passed) {
      if (pageErrors.length) blockers.push("page_errors");
      if (!awardApi.ok()) blockers.push("seed_award_api_failed");
      if (!notes.includes("reverse_ui")) blockers.push("reverse_ui_failed");
      if (!enrollResp.ok()) blockers.push(`enroll:${enrollJson.error ?? enrollResp.status()}`);
    }

    writeProof({
      id: "P-10-taploop",
      route: "/dashboard/audience#taploop + /api/loyalty/*",
      workflow:
        "TapLoop program create → rules/tiers/rewards → enroll → award → duplicate prevention → redeem → adjust → reverse → member detail → Insights KPIs → audit → Admin link",
      passed,
      browserE2ePassed: passed,
      persistencePassed: awardApi.ok() && createResp.ok() && enrollResp.ok(),
      consoleErrors,
      pageErrors,
      notes,
      lastVerifiedAt: new Date().toISOString(),
      blockers: passed ? [] : blockers.length ? blockers : ["taploop_ui_incomplete"],
    });

    expect(passed).toBeTruthy();
  });
});
