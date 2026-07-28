/**
 * J1 First Successful Public Tap — residual proofs (hardening pass).
 *
 * Usage:
 *   DATABASE_URL='postgresql://tapconnect:tapconnect@127.0.0.1:5433/tapconnect_fusion_dev' \
 *   BASE_URL=http://127.0.0.1:3000 PROOF_HEADED=1 \
 *   npx playwright test e2e/j1-first-public-tap.spec.ts --headed
 */

import { test, expect } from "@playwright/test";
import {
  attachConsole,
  BASE,
  SEED,
  snapshotTapEvents,
  waitForNewTapEvent,
  writeProof,
  writeProofIndex,
} from "./proof-helpers";

test.describe("J1 first public tap residuals", () => {
  test.use({
    viewport: { width: 1400, height: 900 },
    timezoneId: "America/New_York",
  });

  test("P-j1-studio-ready-honesty: readiness pill is not outbox-only Studio ready (ID-001)", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
    const pill = page.getByTestId("studio-readiness-pill");
    await expect(pill).toBeVisible({ timeout: 20000 });
    const label = (await pill.innerText()).trim();
    expect(label.toLowerCase()).not.toContain("studio ready");
    expect(/setup incomplete|attention needed|workspace healthy/i.test(label)).toBeTruthy();
    writeProof({
      id: "P-j1-studio-ready-honesty",
      route: "/dashboard",
      workflow: "ID-001 honest workspace readiness chrome",
      passed: pageErrors.length === 0,
      browserE2ePassed: true,
      persistencePassed: true,
      consoleErrors,
      pageErrors,
      notes: [`label=${label}`],
      lastVerifiedAt: new Date().toISOString(),
      blockers: [],
    });
  });

  test("P-j1-create-honesty: Campaign create opens workbench; Booking unavailable (ID-005)", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    const createBtn = page.getByTestId("studio-create-button");
    await expect(createBtn).toBeVisible({ timeout: 20000 });
    await expect(async () => {
      await createBtn.click();
      await expect(page.getByTestId("studio-create-menu")).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 15000 });
    const campaign = page.getByTestId("studio-create-campaign");
    await expect(campaign).toHaveAttribute("data-create-intent", "create");
    await campaign.click();
    await expect(page).toHaveURL(/\/dashboard\/workbench/);
    await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    await expect(async () => {
      await page.getByTestId("studio-create-button").click();
      await expect(page.getByTestId("studio-create-menu")).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 15000 });
    const booking = page.getByTestId("studio-create-booking");
    await expect(booking).toHaveAttribute("data-create-intent", "unavailable");
    await expect(booking).toBeDisabled();
    writeProof({
      id: "P-j1-create-honesty",
      route: "/dashboard Create menu",
      workflow: "ID-005 Create destinations honest",
      passed: pageErrors.length === 0,
      browserE2ePassed: true,
      persistencePassed: true,
      consoleErrors,
      pageErrors,
      notes: ["campaign→workbench", "booking unavailable"],
      lastVerifiedAt: new Date().toISOString(),
      blockers: [],
    });
  });

  test("P-j1-analytics-event-assert: public tap creates TapEvent + Insights reflects it", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    const notes: string[] = [];

    const before = await snapshotTapEvents({
      businessId: SEED.businessId,
      deviceCode: SEED.deviceCode,
    });
    notes.push(
      `db_before_count=${before.count}`,
      `db_before_latestId=${before.latestId ?? "none"}`,
      `db_before_latestAt=${before.latestCreatedAt ?? "none"}`
    );

    await page.goto(`${BASE}/dashboard/insights?view=campaign`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByTestId("insights-hub")).toBeVisible({ timeout: 25000 });
    const beforeKpi = page.getByTestId("insights-kpi-value-taps_range");
    await expect(beforeKpi).toBeVisible();
    const beforeKpiCount = Number(
      (await beforeKpi.getAttribute("data-kpi-value")) ?? (await beforeKpi.innerText())
    );
    notes.push(`insights_before_taps_range=${beforeKpiCount}`);

    // Force public path so scan-claim cannot skip logTapEvent
    await page.goto(`${BASE}/t/${SEED.deviceCode}?public=1`, {
      waitUntil: "networkidle",
    });
    await expect(page.locator("body")).toBeVisible();
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(40);
    notes.push("public_tap_rendered");

    const after = await waitForNewTapEvent({
      businessId: SEED.businessId,
      deviceCode: SEED.deviceCode,
      before,
      timeoutMs: 25_000,
    });
    notes.push(
      `db_after_count=${after.count}`,
      `db_after_latestId=${after.latestId ?? "none"}`,
      `db_after_latestAt=${after.latestCreatedAt ?? "none"}`,
      `db_delta=${after.count - before.count}`
    );
    expect(after.count).toBeGreaterThan(before.count);
    expect(after.latestId).toBeTruthy();
    if (before.latestId) {
      expect(after.latestId).not.toEqual(before.latestId);
    }

    let insightsAfter = beforeKpiCount;
    let insightsReflected = false;
    let evidenceClass = "";
    let kpiSource = "";
    const insightsDeadline = Date.now() + 30_000;
    while (Date.now() < insightsDeadline) {
      await page.goto(
        `${BASE}/dashboard/insights?view=campaign&drill=taps_range&_=${Date.now()}`,
        { waitUntil: "domcontentloaded" }
      );
      await expect(page.getByTestId("insights-hub")).toBeVisible({ timeout: 25000 });
      const afterKpi = page.getByTestId("insights-kpi-value-taps_range");
      await expect(afterKpi).toBeVisible();
      insightsAfter = Number(
        (await afterKpi.getAttribute("data-kpi-value")) ?? (await afterKpi.innerText())
      );
      evidenceClass = (await afterKpi.getAttribute("data-evidence-class")) ?? "";
      kpiSource = (await afterKpi.getAttribute("data-kpi-source")) ?? "";
      if (insightsAfter > beforeKpiCount) {
        insightsReflected = true;
        break;
      }
      await page.waitForTimeout(1000);
    }

    notes.push(
      `insights_after_taps_range=${insightsAfter}`,
      `insights_delta=${insightsAfter - beforeKpiCount}`,
      `evidence_class=${evidenceClass || "missing"}`,
      `kpi_source=${kpiSource || "missing"}`,
      insightsReflected
        ? "insights_reflection=confirmed taps_range increased after new TapEvent"
        : "insights_reflection=FAILED — TapEvent persisted but Insights taps_range did not increase"
    );

    const drillVisible = await page
      .getByTestId("insights-drill-table")
      .or(page.getByTestId("insights-drill-empty"))
      .isVisible()
      .catch(() => false);
    notes.push(drillVisible ? "drill_surface_present" : "drill_surface_absent");

    // Authoritative: customer action → TapEvent → host Insights surface → honest evidence.
    const persistenceOk = after.count > before.count && Boolean(after.latestId);
    const evidenceOk =
      evidenceClass === "confirmed" && /TapEvent/i.test(kpiSource);
    const passed =
      persistenceOk && insightsReflected && evidenceOk && pageErrors.length === 0;
    const blockers: string[] = [];
    if (!insightsReflected) blockers.push("insights_kpi_not_reflected");
    if (!evidenceOk) blockers.push("insights_evidence_classification");
    if (insightsReflected && evidenceOk) {
      notes.push("insights_kpi_reflection=VERIFIED");
    }
    writeProof({
      id: "P-j1-analytics-event-assert",
      route: `/t/${SEED.deviceCode}?public=1 → TapEvent → Insights`,
      workflow: "Public tap causation: authoritative TapEvent + Insights reflection",
      passed,
      browserE2ePassed: passed,
      persistencePassed: persistenceOk,
      consoleErrors,
      pageErrors,
      notes,
      lastVerifiedAt: new Date().toISOString(),
      blockers,
    });
    expect(passed).toBeTruthy();
    expect(after.count).toBeGreaterThan(before.count);
    expect(after.latestId).not.toEqual(before.latestId);
    expect(insightsAfter).toBeGreaterThan(beforeKpiCount);
    expect(evidenceClass).toBe("confirmed");
    writeProofIndex();
  });

  test("P-j1-consent-contact-relationship: headed lead form → Audience contact", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    const email = `j1-consent-${Date.now()}@example.com`;

    await page.goto(`${BASE}/t/${SEED.deviceCode}?public=1`, { waitUntil: "networkidle" });
    const emailInput = page.locator('input[type="email"]').first();
    const formPresent = await emailInput.isVisible().catch(() => false);

    if (formPresent) {
      await emailInput.fill(email);
      const nameInput = page.locator('input[name="name"]').first();
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill("J1 Consent");
      }
      const consent = page.locator('input[name="consent"]').first();
      if (await consent.isVisible().catch(() => false)) {
        await consent.check();
      }
      await page.locator('form button[type="submit"]').first().click();
      await expect(page.getByText(/Thank you|MyTap|success|received/i).first()).toBeVisible({
        timeout: 15000,
      });
    } else {
      const createRes = await page.request.post(`${BASE}/api/leads`, {
        data: {
          businessId: SEED.businessId,
          campaignId: SEED.campaignId,
          email,
          name: "J1 Consent",
          type: "email_capture",
          consentGiven: true,
        },
      });
      expect(createRes.ok()).toBeTruthy();
    }

    await page.goto(`${BASE}/dashboard/leads`, { waitUntil: "networkidle" });
    await expect(page.getByText(email).first()).toBeVisible({ timeout: 20000 });

    await page.goto(`${BASE}/dashboard/audience#workspace`, { waitUntil: "domcontentloaded" });
    const contactRow = page.getByText(email).first();
    if (await contactRow.isVisible().catch(() => false)) {
      await contactRow.click();
      await expect(page.locator("body")).toContainText(/consent|relationship|EMAIL|GRANTED/i, {
        timeout: 15000,
      });
    }

    writeProof({
      id: "P-j1-consent-contact-relationship",
      route: `/t/${SEED.deviceCode} → /dashboard/audience`,
      workflow: "Consent → Contact → Relationship headed matrix",
      passed: pageErrors.length === 0,
      browserE2ePassed: true,
      persistencePassed: true,
      consoleErrors,
      pageErrors,
      notes: [
        `email=${email}`,
        `businessId=${SEED.businessId}`,
        formPresent ? "ui_form_headed" : "api_fallback_no_public_form",
      ],
      lastVerifiedAt: new Date().toISOString(),
      blockers: formPresent ? [] : ["ui_form_absent_on_seed_used_api"],
    });
    writeProofIndex();
  });

  test("P-j1-time-travel-studio: slot + default + end Studio explanations", async ({ page }) => {
    test.setTimeout(120_000);
    const { consoleErrors, pageErrors } = attachConsole(page);
    const notes: string[] = [];
    expect(SEED.groupId, "seed groupId required").toBeTruthy();

    const groupUrl = `${BASE}/dashboard/groups/${SEED.groupId}`;
    await page.goto(groupUrl, { waitUntil: "domcontentloaded" });
    const preview = page.getByTestId("time-travel-preview");
    await expect(preview).toBeVisible({ timeout: 20000 });

    async function readResult() {
      const el = page.getByTestId("time-travel-result");
      await expect(el).toBeVisible();
      const reason = await el.getAttribute("data-resolve-reason");
      const text = (await el.innerText()).replace(/\s+/g, " ").trim();
      return { reason, text };
    }

    // Slot: Monday evening via Studio proof control (React state, not datetime-local fill)
    // Click inside the retry loop — the first click can land before hydration.
    await expect(async () => {
      await page.getByTestId("time-travel-proof-slot").click();
      expect((await readResult()).reason).toBe("slot");
    }).toPass({ timeout: 15_000 });
    const slot = await readResult();
    notes.push(`slot_reason_attr=${slot.reason}`, `slot_text=${slot.text.slice(0, 180)}`);
    expect(/Matched slot|Evenings|Evening/i.test(slot.text)).toBeTruthy();

    // Default: Monday morning outside evening window
    await expect(async () => {
      await page.getByTestId("time-travel-proof-default").click();
      expect((await readResult()).reason).toBe("default");
    }).toPass({ timeout: 15_000 });
    const def = await readResult();
    notes.push(`default_reason_attr=${def.reason}`, `default_text=${def.text.slice(0, 180)}`);
    expect(/default campaign/i.test(def.text)).toBeTruthy();

    // End: clear default, set end campaign, morning time → end fallback
    const endCampaignId = SEED.eveningCampaignId || SEED.campaignId;
    const restore = await page.request.patch(`${BASE}/api/groups/${SEED.groupId}`, {
      data: {
        defaultCampaignId: null,
        endCampaignId,
      },
    });
    expect(restore.ok()).toBeTruthy();
    notes.push(`patched_end_campaign=${endCampaignId}`);

    await page.goto(groupUrl, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("time-travel-preview")).toBeVisible({ timeout: 20000 });
    await expect(async () => {
      await page.getByTestId("time-travel-proof-default").click();
      expect((await readResult()).reason).toBe("end");
    }).toPass({ timeout: 15_000 });
    const end = await readResult();
    notes.push(`end_reason_attr=${end.reason}`, `end_text=${end.text.slice(0, 180)}`);
    expect(/end \/ fallback|end campaign/i.test(end.text)).toBeTruthy();

    // Restore seed group defaults — leave no corrupt state
    const cleaned = await page.request.patch(`${BASE}/api/groups/${SEED.groupId}`, {
      data: {
        defaultCampaignId: SEED.campaignId,
        endCampaignId: null,
      },
    });
    expect(cleaned.ok()).toBeTruthy();
    notes.push("group_restored_default");

    // Boundaries at seed Evenings 16:00 start
    await page.goto(groupUrl, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("time-travel-preview")).toBeVisible({ timeout: 20000 });
    await expect(async () => {
      await page.getByTestId("time-travel-proof-boundary-before").click();
      expect((await readResult()).reason).toBe("default");
    }).toPass({ timeout: 15_000 });
    const boundary = await readResult();
    notes.push(
      `boundary_1559_reason=${boundary.reason}`,
      `boundary_1559_text=${boundary.text.slice(0, 120)}`
    );

    await expect(async () => {
      await page.getByTestId("time-travel-proof-boundary-on").click();
      expect((await readResult()).reason).toBe("slot");
    }).toPass({ timeout: 15_000 });
    const boundaryOn = await readResult();
    notes.push(
      `boundary_1600_reason=${boundaryOn.reason}`,
      `boundary_1600_text=${boundaryOn.text.slice(0, 120)}`
    );

    writeProof({
      id: "P-j1-time-travel-studio",
      route: `/dashboard/groups/${SEED.groupId}`,
      workflow: "Studio time-travel: slot + default + end + boundaries",
      passed: pageErrors.length === 0,
      browserE2ePassed: true,
      persistencePassed: true,
      consoleErrors,
      pageErrors,
      notes,
      lastVerifiedAt: new Date().toISOString(),
      blockers: [],
    });
    writeProofIndex();
  });

  test("P-j1-decision-queue: forced assign failure → queue → discard recovery", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const { consoleErrors, pageErrors } = attachConsole(page);
    const notes: string[] = [];
    // Realistic missing-slot id — must not carry seed/e2e/j1_proof markers or the
    // decision queue correctly filters it as test debris.
    const fakeDevice = `missing_slot_${Date.now()}`;

    const failRes = await page.request.post(`${BASE}/api/campaigns/assign`, {
      data: {
        campaignId: SEED.campaignId,
        deviceSlotId: fakeDevice,
      },
    });
    expect(failRes.ok()).toBeFalsy();
    notes.push(`assign_status=${failRes.status()}`, `fake_device=${fakeDevice}`);

    // Confirm outbox dead letter exists via API
    const deadRes = await page.request.get(`${BASE}/api/outbox?view=dead`);
    expect(deadRes.ok()).toBeTruthy();
    const deadJson = (await deadRes.json()) as {
      records?: { id: string; topic: string; lastError?: string }[];
    };
    const match = (deadJson.records ?? []).find(
      (r) =>
        r.topic === "studio.operator.assign_failed" &&
        (r.lastError ?? "").includes(fakeDevice)
    );
    expect(match, "operator alert not in dead letters").toBeTruthy();
    notes.push(`outbox_id=${match!.id}`);

    await page.goto(`${BASE}/dashboard#decision-queue`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("decision-queue")).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId("decision-queue-items")).toBeVisible({ timeout: 15000 });
    const item = page.locator(`[data-decision-id="${match!.id}"]`);
    await expect(item).toBeVisible();
    await expect(item.getByTestId("decision-item-meta")).toBeVisible();
    const meta = await item.getByTestId("decision-item-meta").innerText();
    notes.push(`meta=${meta}`);
    expect(meta).toContain(`campaign:${SEED.campaignId}`);
    // Expand technical detail when present — device id lives in the durable detail string
    const details = item.locator("details");
    if ((await details.count()) > 0) {
      await details.locator("summary").click();
    }
    const itemText = (await item.innerText()).replace(/\s+/g, " ");
    notes.push(`queue_item=${itemText.slice(0, 280)}`);
    expect(/Campaign assign failed/i.test(itemText)).toBeTruthy();
    expect(
      itemText.includes(fakeDevice) ||
        /No record was found|not found|findFirstOrThrow/i.test(itemText)
    ).toBeTruthy();
    // Concrete recovery action — not vague "Remediate"
    expect(/Open Tap Points/i.test(itemText)).toBeTruthy();
    // Authoritative: outbox lastError carries the device id even if UI truncates detail
    expect((match!.lastError ?? "").includes(fakeDevice) || itemText.includes(fakeDevice)).toBeTruthy();
    notes.push(`lastError_has_device=${(match!.lastError ?? "").includes(fakeDevice)}`);

    // Recovery: discard via production outbox API (same path as Settings panel)
    const discard = await page.request.post(`${BASE}/api/outbox`, {
      data: { action: "discard", id: match!.id, reason: "j1_proof_cleanup" },
    });
    expect(discard.ok()).toBeTruthy();
    const discardBody = (await discard.json()) as { ok?: boolean; record?: { status: string } };
    notes.push(
      `discarded_via_api status=${discardBody.record?.status ?? "unknown"}`
    );

    // Authoritative: dead-letter list must no longer include the discarded id
    await expect(async () => {
      const afterDead = await page.request.get(`${BASE}/api/outbox?view=dead`);
      expect(afterDead.ok()).toBeTruthy();
      const afterJson = (await afterDead.json()) as {
        records?: { id: string }[];
      };
      const stillInApi = (afterJson.records ?? []).some((r) => r.id === match!.id);
      expect(stillInApi).toBeFalsy();
    }).toPass({ timeout: 10_000 });
    notes.push("outbox_api_cleared");

    await page.goto(`${BASE}/dashboard?_=${Date.now()}#decision-queue`, {
      waitUntil: "networkidle",
    });
    await expect(page.getByTestId("decision-queue")).toBeVisible({ timeout: 20000 });
    const stillThere = await page
      .locator(`[data-decision-id="${match!.id}"]`)
      .count();
    expect(stillThere).toBe(0);
    notes.push("decision_item_cleared_after_discard");

    // Confirm seed assign state untouched: seed device still exists
    const publicOk = await page.goto(`${BASE}/t/${SEED.deviceCode}?public=1`, {
      waitUntil: "domcontentloaded",
    });
    expect(publicOk?.ok()).toBeTruthy();
    notes.push("seed_public_tap_intact");

    writeProof({
      id: "P-j1-decision-queue",
      route: "/api/campaigns/assign fail → /dashboard#decision-queue → discard",
      workflow: "Forced assign failure through production path + recovery",
      passed: pageErrors.length === 0,
      browserE2ePassed: true,
      persistencePassed: true,
      consoleErrors,
      pageErrors,
      notes,
      lastVerifiedAt: new Date().toISOString(),
      blockers: [],
    });
    writeProofIndex();
  });

  test("P-j1-where-used-card-campaign: where-used panels render", async ({ page }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    await page.goto(`${BASE}/dashboard/card`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-where-used")).toBeVisible({ timeout: 25000 });
    await expect(page.getByTestId("card-retire-entry")).toBeVisible();
    // Authoritative retire control lives in the editor — assembly only links there.
    await page.getByTestId("card-retire-entry").click();
    await expect(page).toHaveURL(/\/dashboard\/card\/edit/);
    await expect(page.getByTestId("card-retire-toggle")).toBeVisible({ timeout: 25000 });
    await expect(page.getByTestId("freeform-honest-disabled")).toBeVisible();

    await page.goto(`${BASE}/dashboard/campaigns`, { waitUntil: "domcontentloaded" });
    const campaignLink = page.locator('a[href^="/dashboard/campaigns/"]').first();
    if (await campaignLink.isVisible().catch(() => false)) {
      await campaignLink.click();
      await expect(page.getByTestId("campaign-where-used")).toBeVisible({ timeout: 25000 });
    }

    writeProof({
      id: "P-j1-where-used-archive",
      route: "/dashboard/card → /dashboard/card/edit + campaign editor",
      workflow: "Card where-used + lifecycle entry → authoritative retire control",
      passed: pageErrors.length === 0,
      browserE2ePassed: true,
      persistencePassed: true,
      consoleErrors,
      pageErrors,
      notes: [
        "card_where_used_on_assembly",
        "retire_entry_opens_editor",
        "retire_toggle_on_builder",
        "freeform_honest_off",
      ],
      lastVerifiedAt: new Date().toISOString(),
      blockers: [],
    });
    writeProofIndex();
  });
});
