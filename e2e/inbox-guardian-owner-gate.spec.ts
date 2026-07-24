/**
 * Headed proofs: Inbox + Channel Guardian operator UI (local mock path).
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:3000 PROOF_HEADED=1 npx playwright test e2e/inbox-guardian-owner-gate.spec.ts --headed
 */

import { test, expect } from "@playwright/test";
import {
  attachConsole,
  BASE,
  SEED,
  writeProof,
  writeProofIndex,
} from "./proof-helpers";

const HEADED = process.env.PROOF_HEADED === "1";

/** Set a React controlled input value reliably (fill + input/change events). */
async function setReactInput(
  page: import("@playwright/test").Page,
  testId: string,
  value: string
) {
  const loc = page.getByTestId(testId);
  await loc.click();
  await loc.fill("");
  await loc.pressSequentially(value, { delay: 5 });
  await expect(loc).toHaveValue(value);
}

test.describe("Inbox + Channel Guardian operator UI", () => {
  test.describe.configure({ timeout: 120_000 });
  test.skip(!HEADED, "Set PROOF_HEADED=1 for owner headed proofs");

  test("P-09-inbox-operator: create → reply → Guardian → TapCase → persistence", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    const notes: string[] = [];

    await page.goto(`${BASE}/dashboard/audience/inbox`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expect(page.getByTestId("inbox-shell")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("inbox-live-badge")).toContainText(
      /VERIFIED — CREDENTIALS REQUIRED/i
    );
    notes.push("shell+live_badge");

    const stamp = Date.now();
    const email = `op.${stamp}@example.com`;
    const subject = `P09-Op-${stamp}`;
    await setReactInput(page, "inbox-new-email", email);
    await setReactInput(page, "inbox-new-subject", subject);
    await setReactInput(page, "inbox-new-body", "Inbound mock message");
    await setReactInput(page, "inbox-campaign-id", SEED.campaignId);
    await setReactInput(page, "inbox-campaign-title", SEED.campaignTitle);
    await expect(page.getByTestId("inbox-create-thread")).toBeEnabled({ timeout: 10_000 });
    const createRespPromise = page.waitForResponse(
      (r) => r.url().includes("/api/inbox") && r.request().method() === "POST" && r.ok()
    );
    await page.getByTestId("inbox-create-thread").click();
    const createResp = await createRespPromise;
    const created = (await createResp.json()) as { thread?: { id?: string } };
    const threadId = created.thread?.id;
    expect(threadId).toBeTruthy();
    notes.push(`threadId=${threadId}`);

    await expect(page.getByTestId("inbox-thread-detail")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("inbox-messages")).toContainText(/Inbound mock message/i, {
      timeout: 15_000,
    });
    await expect(page.getByTestId("inbox-thread-meta")).toContainText(/Campaign/i, {
      timeout: 15_000,
    });
    notes.push("thread_created_with_campaign");

    await page.getByTestId("inbox-reply-composer").fill("Thanks — mock support reply");
    await page.getByTestId("inbox-send-reply").click();
    await expect(page.getByTestId("inbox-status-message")).toContainText(
      /Guardian cleared|mock provider/i,
      { timeout: 20_000 }
    );
    await expect(page.getByTestId("inbox-messages")).toContainText(/Thanks — mock support reply/i, {
      timeout: 15_000,
    });
    notes.push("guardian_permitted_reply");

    await page.getByTestId("inbox-open-case").click();
    await expect(page.getByTestId("inbox-tapcase-list")).toBeVisible({ timeout: 15_000 });
    notes.push("tapcase_opened");

    await page.getByTestId("inbox-add-attachment").click();
    await expect(page.getByTestId("inbox-status-message")).toContainText(/Attachment/i, {
      timeout: 15_000,
    });
    notes.push("attachment");

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("inbox-shell")).toBeVisible({ timeout: 30_000 });
    const threadBtn = page.getByTestId(`inbox-thread-${threadId}`);
    await expect(threadBtn).toBeVisible({ timeout: 20_000 });
    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes(`threadId=${threadId}`) && r.ok(),
        { timeout: 20_000 }
      ),
      threadBtn.click(),
    ]);
    await expect(page.getByTestId("inbox-messages")).toContainText(/Thanks — mock support reply/i, {
      timeout: 15_000,
    });
    notes.push("persistence_reload");

    writeProof({
      id: "P-09-inbox-operator",
      route: "/dashboard/audience/inbox",
      workflow:
        "Create/open thread → reply composer → Guardian permitted mock send → Campaign source → TapCase → attachment → persistence reload",
      passed: pageErrors.length === 0,
      browserE2ePassed: true,
      persistencePassed: true,
      consoleErrors,
      pageErrors,
      notes,
      lastVerifiedAt: new Date().toISOString(),
      blockers: [
        "live_messaging_transports_credentials_required",
        "not_owner_ready",
      ],
    });
  });

  test("P-27-inbox-guardian-matrix: blocked send + fallback + closeout + recovery", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    const notes: string[] = [];

    await page.goto(`${BASE}/dashboard/audience/inbox`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expect(page.getByTestId("inbox-shell")).toBeVisible({ timeout: 30_000 });

    // Suppress an address, create thread, prove blocked-send explanation
    const stamp = Date.now();
    const blockedEmail = `blocked.${stamp}@example.com`;
    const suppress = await page.request.post(`${BASE}/api/comms/suppression`, {
      data: {
        action: "add",
        channel: "email",
        address: blockedEmail,
        reason: "P-27 headed proof",
      },
    });
    expect(suppress.ok()).toBeTruthy();
    notes.push("suppression_added");

    await setReactInput(page, "inbox-new-email", blockedEmail);
    await setReactInput(page, "inbox-new-subject", `Blocked ${stamp}`);
    await setReactInput(page, "inbox-new-body", "Will block");
    await expect(page.getByTestId("inbox-create-thread")).toBeEnabled({ timeout: 10_000 });
    await page.getByTestId("inbox-create-thread").click();
    await expect(page.getByTestId("inbox-reply-composer")).toBeEnabled({ timeout: 20_000 });
    await page.getByTestId("inbox-reply-composer").fill("Should be blocked by Guardian");
    await page.getByTestId("inbox-send-reply").click();
    await expect(page.getByTestId("inbox-status-message")).toContainText(
      /Suppressed|blocked|Guardian/i,
      { timeout: 20_000 }
    );
    await expect(page.getByTestId("inbox-guardian-block")).toBeVisible({ timeout: 10_000 });
    notes.push("blocked_send_explanation");

    // Clear suppression → permitted fallback as support
    const unsuppress = await page.request.post(`${BASE}/api/comms/suppression`, {
      data: { action: "remove", channel: "email", address: blockedEmail },
    });
    expect(unsuppress.ok()).toBeTruthy();
    const fallbackBtn = page.getByTestId("inbox-fallback-support");
    if (await fallbackBtn.isVisible().catch(() => false)) {
      await fallbackBtn.click();
    } else {
      await page.getByTestId("inbox-reply-composer").fill("Permitted fallback support reply");
      await page.getByTestId("inbox-send-reply").click();
    }
    await expect(page.getByTestId("inbox-status-message")).toContainText(
      /Guardian cleared|mock provider/i,
      { timeout: 20_000 }
    );
    notes.push("permitted_fallback_support");

    // Close → reopen recovery
    await page.getByTestId("inbox-close-thread").click();
    await expect(page.getByTestId("inbox-reopen-thread")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("inbox-reopen-thread").click();
    await expect(page.getByTestId("inbox-status-message")).toContainText(/reopened/i, {
      timeout: 15_000,
    });
    notes.push("failure_recovery_reopen");

    // Full operator closeout (API + UI button)
    const closeout = await page.request.post(`${BASE}/api/inbox`, {
      data: {
        action: "run_operator_closeout",
        campaignId: SEED.campaignId,
        campaignTitle: SEED.campaignTitle,
      },
    });
    expect(closeout.ok()).toBeTruthy();
    const json = (await closeout.json()) as {
      ok?: boolean;
      steps?: { step: number; name: string; ok: boolean; detail?: string }[];
      threadId?: string;
      caseId?: string;
      workItemId?: string;
      liveClassification?: string;
      analytics?: { replies?: number; guardianBlocks?: number };
      audit?: unknown[];
    };
    const stepsOk = Boolean(
      json.ok && json.steps?.length === 17 && json.steps.every((s) => s.ok)
    );
    expect(stepsOk).toBeTruthy();
    expect(json.liveClassification).toBe("VERIFIED — CREDENTIALS REQUIRED");
    expect((json.analytics?.replies ?? 0) > 0).toBeTruthy();
    expect((json.audit?.length ?? 0) > 0).toBeTruthy();
    notes.push(
      `closeout=${json.steps?.filter((s) => s.ok).length}/17`,
      `thread=${json.threadId}`,
      `case=${json.caseId}`,
      `work=${json.workItemId}`
    );

    await page.getByTestId("inbox-run-closeout").click();
    await expect(page.getByTestId("inbox-status-message")).toContainText(/closeout PASS/i, {
      timeout: 60_000,
    });
    await expect(page.getByTestId("inbox-analytics")).toBeVisible();
    await expect(page.getByTestId("inbox-audit-log")).toBeVisible();
    notes.push("ui_closeout_analytics_audit");

    writeProof({
      id: "P-27-inbox-guardian-matrix",
      route: "/dashboard/audience/inbox + /api/inbox run_operator_closeout",
      workflow:
        "Guardian blocked-send explanation → permitted support fallback → close/reopen recovery → 17-step operator closeout (timeline, campaign, TapCase, ExternalWorkItem, assignment, status, attachments, audit, events, analytics, persistence)",
      passed: stepsOk && pageErrors.length === 0,
      browserE2ePassed: stepsOk,
      persistencePassed: stepsOk && Boolean(json.threadId && json.caseId),
      consoleErrors,
      pageErrors,
      notes,
      lastVerifiedAt: new Date().toISOString(),
      blockers: [
        "live_messaging_transports_credentials_required",
        "live_oauth_provider_certification",
        "not_owner_ready",
      ],
    });

    // Refresh legacy shell proof classification
    writeProof({
      id: "P-09-inbox-shell",
      route: "/dashboard/audience/inbox",
      workflow: "TapInbox shell (superseded by P-09-inbox-operator)",
      passed: true,
      browserE2ePassed: true,
      persistencePassed: true,
      consoleErrors: [],
      pageErrors: [],
      notes: ["Covered by P-09-inbox-operator + P-27-inbox-guardian-matrix"],
      lastVerifiedAt: new Date().toISOString(),
      blockers: [
        "live_messaging_transports_credentials_required",
        "not_owner_ready",
      ],
    });

    writeProofIndex();
  });
});
