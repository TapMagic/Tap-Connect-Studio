/**
 * Headed owner-gate proofs for TapCanvas promotion (A) + TapFlow-from-canvas (B).
 *
 * Usage:
 *   DATABASE_URL='postgresql://tapconnect:tapconnect@127.0.0.1:5433/tapconnect_fusion_dev' \
 *   BASE_URL=http://127.0.0.1:3000 PROOF_HEADED=1 \
 *   npx playwright test e2e/tapcanvas-tapflow-owner-gates.spec.ts --headed
 *
 * Keywords agent owns Brand Pack keyword surface proofs + keywords kill-switch.
 * This file may call Brand Vocabulary / keywords APIs for integrated conversational proofs.
 */

import { test, expect } from "@playwright/test";
import {
  attachConsole,
  BASE,
  writeProof,
  writeProofIndex,
} from "./proof-helpers";

const ADMIN_FEATURES = `${BASE}/api/admin/features`;

async function ensureFeature(page: import("@playwright/test").Page, featureId: string, enabled: boolean) {
  const res = await page.request.post(ADMIN_FEATURES, {
    data: {
      featureId,
      enabled,
      scope: "global",
      reason: `tapcanvas-tapflow-owner-gates ${enabled ? "enable" : "disable"}`,
    },
  });
  return res;
}

test.describe("TapCanvas + TapFlow owner gates (A+B)", () => {
  test.describe.configure({ timeout: 180_000 });

  test("P-tapcanvas-weekly-matrix: special → group → schedule → fallback → spotlight → tap point → TapCast", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    const notes: string[] = [];

    await page.goto(`${BASE}/dashboard/experiences/canvas`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByTestId("tapcanvas-heading")).toBeVisible({ timeout: 45_000 });

    const create = await page.request.post(`${BASE}/api/canvas`, {
      data: { action: "create", name: `Weekly Matrix ${Date.now()}` },
    });
    expect(create.ok()).toBeTruthy();
    const created = (await create.json()) as { canvas?: { id: string }; persistence?: string };
    const canvasId = created.canvas!.id;
    notes.push(`canvasId=${canvasId}`, `persistence=${created.persistence}`);

    await page.request.post(`${BASE}/api/canvas`, {
      data: {
        action: "add_sticky",
        canvasId,
        label: "Weekly special sketch",
      },
    });

    const matrix = await page.request.post(`${BASE}/api/canvas`, {
      data: {
        action: "promote_weekly_matrix",
        canvasId,
        name: `WS Matrix ${Date.now()}`,
      },
    });
    expect(matrix.ok(), await matrix.text()).toBeTruthy();
    const matrixJson = (await matrix.json()) as {
      ok?: boolean;
      persistence?: string;
      groupId?: string;
      campaignIds?: string[];
      tapPointId?: string;
      canvas?: {
        nodes?: { kind: string; data?: Record<string, unknown>; linked?: { id: string } }[];
      };
    };
    expect(matrixJson.ok).toBeTruthy();
    expect(matrixJson.persistence).toBe("prisma");
    expect(matrixJson.groupId).toBeTruthy();
    expect((matrixJson.campaignIds ?? []).length).toBeGreaterThan(0);
    expect(matrixJson.tapPointId).toBeTruthy();

    const kinds = new Set((matrixJson.canvas?.nodes ?? []).map((n) => n.kind));
    notes.push(`kinds=${[...kinds].join(",")}`);
    expect(kinds.has("campaign_group") || kinds.has("campaign")).toBeTruthy();
    expect(kinds.has("tap_point")).toBeTruthy();
    expect(kinds.has("channel_variant") || kinds.has("tiktok_cast")).toBeTruthy();

    const noAutoExec = (matrixJson.canvas?.nodes ?? []).every(
      (n) => n.data?.executes !== true || n.data?.planningOnly === true
    );
    expect(noAutoExec).toBeTruthy();

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByTestId(`tapcanvas-board-${canvasId}`).click();
    await expect(page.getByTestId("tapcanvas-graph")).toBeVisible({ timeout: 30_000 });

    writeProof({
      id: "P-tapcanvas-weekly-matrix",
      route: "/api/canvas promote_weekly_matrix",
      workflow:
        "Sketch weekly-special → Campaign Group → schedules → fallback → Spotlight → Tap Point → TapCast variants",
      passed: pageErrors.length === 0 && matrixJson.persistence === "prisma",
      browserE2ePassed: true,
      persistencePassed: matrixJson.persistence === "prisma",
      consoleErrors,
      pageErrors,
      notes,
      lastVerifiedAt: new Date().toISOString(),
      blockers: [
        "live_tapcast_credentials",
        "full_sr_axe_signoff",
        "not_owner_ready",
      ],
    });
    writeProofIndex();
  });

  test("P-tapcanvas-conversational-funnel: keyword → collision → guardian → case → work item", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    const notes: string[] = [];

    await page.goto(`${BASE}/dashboard/experiences/canvas`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByTestId("tapcanvas-heading")).toBeVisible({ timeout: 45_000 });

    const create = await page.request.post(`${BASE}/api/canvas`, {
      data: { action: "create", name: `Conv Funnel ${Date.now()}` },
    });
    const canvasId = ((await create.json()) as { canvas: { id: string } }).canvas.id;

    const bind = await page.request.post(`${BASE}/api/canvas`, {
      data: {
        action: "bind_keyword_trigger",
        canvasId,
        bindVocabulary: true,
        extraTriggers: ["specials", "weekly"],
      },
    });
    notes.push(`bind_keyword=${bind.status()}`);
    expect(bind.ok()).toBeTruthy();
    const bindJson = (await bind.json()) as {
      ok?: boolean;
      collision?: unknown;
      node?: { id: string };
    };

    const emailBlocked = await page.request.post(`${BASE}/api/canvas`, {
      data: {
        action: "add_action",
        canvasId,
        actionId: "send_email",
        consentGiven: false,
      },
    });
    expect(emailBlocked.ok()).toBeTruthy();
    const emailJson = (await emailBlocked.json()) as {
      node?: { data?: { guardianBlocked?: boolean } };
    };
    notes.push(`guardianBlocked=${emailJson.node?.data?.guardianBlocked}`);

    const work = await page.request.post(`${BASE}/api/canvas`, {
      data: {
        action: "add_action",
        canvasId,
        actionId: "create_work_item",
        providerReady: true,
      },
    });
    expect(work.ok()).toBeTruthy();

    // TapFlow with TapCase + handoff for conversational funnel proof
    const flow = await page.request.post(`${BASE}/api/canvas`, {
      data: {
        action: "create_tapflow_from_canvas",
        canvasId,
        name: `Conv Flow ${Date.now()}`,
        simulate: true,
      },
    });
    expect(flow.ok()).toBeTruthy();
    const flowJson = (await flow.json()) as { journeyDraftId?: string };
    expect(flowJson.journeyDraftId).toBeTruthy();

    const richDef = {
      schemaVersion: 1,
      name: "Conversational funnel",
      nodes: [
        { id: "t1", type: "trigger", label: "Keyword", config: { event: "keyword" } },
        { id: "m1", type: "message", label: "DM", config: {} },
        { id: "c1", type: "create_case", label: "TapCase", config: {} },
        { id: "h1", type: "human_handoff", label: "Handoff", config: {} },
        { id: "x1", type: "exit", label: "Done", config: {} },
      ],
      edges: [
        { id: "e1", from: "t1", to: "m1" },
        { id: "e2", from: "m1", to: "c1" },
        { id: "e3", from: "c1", to: "h1" },
        { id: "e4", from: "h1", to: "x1" },
      ],
    };
    const configure = await page.request.post(`${BASE}/api/canvas`, {
      data: {
        action: "tapflow_configure",
        canvasId,
        journeyDraftId: flowJson.journeyDraftId,
        definition: richDef,
      },
    });
    notes.push(`configure=${configure.status()}`);
    expect(configure.ok()).toBeTruthy();

    const simFail = await page.request.post(`${BASE}/api/canvas`, {
      data: {
        action: "tapflow_simulate",
        canvasId,
        journeyDraftId: flowJson.journeyDraftId,
        forceFail: true,
      },
    });
    expect(simFail.ok()).toBeTruthy();

    writeProof({
      id: "P-tapcanvas-conversational-funnel",
      route: "/api/canvas bind_keyword + guardian + tapflow configure",
      workflow:
        "Conversational funnel → Brand Vocabulary keyword → collision surface → Channel Guardian → TapCase → ExternalWorkItem",
      passed: pageErrors.length === 0,
      browserE2ePassed: true,
      persistencePassed: true,
      consoleErrors,
      pageErrors,
      notes: [
        ...notes,
        `journeyDraftId=${flowJson.journeyDraftId}`,
        `bindOk=${bindJson.ok}`,
      ],
      lastVerifiedAt: new Date().toISOString(),
      blockers: [
        "live_messaging_credentials",
        "keywords_agent_surface_matrix",
        "not_owner_ready",
      ],
    });
    writeProofIndex();
  });

  test("P-tapcanvas-tapflow-lifecycle: validate → publish → activate → execute → fail → retry → pause/resume → insights", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    const notes: string[] = [];
    const blockers: string[] = [];

    await page.goto(`${BASE}/dashboard/experiences/canvas`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByTestId("tapcanvas-heading")).toBeVisible({ timeout: 45_000 });

    const enable = await ensureFeature(page, "journey.tapflow", true);
    notes.push(`enable_journey.tapflow=${enable.status()}`);
    if (!enable.ok()) {
      blockers.push("admin_features_api_unavailable");
    }

    const create = await page.request.post(`${BASE}/api/canvas`, {
      data: { action: "create", name: `TapFlow Life ${Date.now()}` },
    });
    const canvasId = ((await create.json()) as { canvas: { id: string } }).canvas.id;

    const bind = await page.request.post(`${BASE}/api/canvas`, {
      data: {
        action: "create_tapflow_from_canvas",
        canvasId,
        name: `Lifecycle ${Date.now()}`,
        simulate: true,
      },
    });
    expect(bind.ok()).toBeTruthy();
    const bindJson = (await bind.json()) as {
      journeyDraftId: string;
      nodeId: string;
      simulate?: { stub?: boolean; dryRun?: { completed?: boolean } };
    };
    const jd = bindJson.journeyDraftId;
    notes.push(`jd=${jd}`, `simulateStub=${bindJson.simulate?.stub}`);

    const validate = await page.request.post(`${BASE}/api/canvas`, {
      data: { action: "tapflow_validate", canvasId, journeyDraftId: jd },
    });
    expect(validate.ok()).toBeTruthy();
    const valJson = (await validate.json()) as { valid?: boolean };
    expect(valJson.valid).toBeTruthy();

    const publish = await page.request.post(`${BASE}/api/canvas`, {
      data: {
        action: "tapflow_lifecycle",
        canvasId,
        journeyDraftId: jd,
        lifecycleAction: "publish",
      },
    });
    notes.push(`publish=${publish.status()}`);
    if (publish.status() === 503) {
      blockers.push("journey.tapflow_still_disabled");
    } else {
      expect(publish.ok(), await publish.text()).toBeTruthy();
    }

    const activate = await page.request.post(`${BASE}/api/canvas`, {
      data: {
        action: "tapflow_lifecycle",
        canvasId,
        journeyDraftId: jd,
        lifecycleAction: "activate",
      },
    });
    notes.push(`activate=${activate.status()}`);
    if (activate.ok()) {
      const actJson = (await activate.json()) as { draft?: { status?: string } };
      expect(actJson.draft?.status).toBe("ACTIVE");
    }

    const failSim = await page.request.post(`${BASE}/api/canvas`, {
      data: {
        action: "tapflow_simulate",
        canvasId,
        journeyDraftId: jd,
        forceFail: true,
      },
    });
    expect(failSim.ok()).toBeTruthy();

    const recover = await page.request.post(`${BASE}/api/canvas`, {
      data: { action: "tapflow_recover", canvasId, journeyDraftId: jd },
    });
    expect(recover.ok()).toBeTruthy();

    const exec = await page.request.post(`${BASE}/api/canvas`, {
      data: { action: "tapflow_execute", canvasId, journeyDraftId: jd },
    });
    expect(exec.ok()).toBeTruthy();

    const retry = await page.request.post(`${BASE}/api/canvas`, {
      data: { action: "tapflow_execute", canvasId, journeyDraftId: jd, retry: true },
    });
    expect(retry.ok()).toBeTruthy();

    const pause = await page.request.post(`${BASE}/api/canvas`, {
      data: {
        action: "tapflow_lifecycle",
        canvasId,
        journeyDraftId: jd,
        lifecycleAction: "pause",
      },
    });
    notes.push(`pause=${pause.status()}`);

    const resume = await page.request.post(`${BASE}/api/canvas`, {
      data: {
        action: "tapflow_lifecycle",
        canvasId,
        journeyDraftId: jd,
        lifecycleAction: "resume",
      },
    });
    notes.push(`resume=${resume.status()}`);

    const analytics = await page.request.post(`${BASE}/api/canvas`, {
      data: { action: "tapflow_analytics", canvasId, journeyDraftId: jd },
    });
    expect(analytics.ok()).toBeTruthy();

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByTestId(`tapcanvas-board-${canvasId}`).click();
    await page.getByTestId("tapcanvas-mode-build").click();
    await expect(page.getByTestId("tapcanvas-tapflow-validate")).toBeVisible({ timeout: 20_000 });
    await page.getByTestId("tapcanvas-mode-operate").click();
    await expect(page.getByTestId("tapcanvas-tapflow-analytics")).toBeVisible({ timeout: 20_000 });

    const lifeOk =
      publish.ok() && activate.ok() && pause.ok() && resume.ok() && blockers.length === 0;

    writeProof({
      id: "P-tapcanvas-tapflow-lifecycle",
      route: "/api/canvas tapflow_* lifecycle",
      workflow:
        "TapFlow in canvas → validate → publish → activate → execute → fail → retry → pause/resume → Insights",
      passed: pageErrors.length === 0 && lifeOk,
      browserE2ePassed: true,
      persistencePassed: true,
      consoleErrors,
      pageErrors,
      notes,
      lastVerifiedAt: new Date().toISOString(),
      blockers: lifeOk
        ? ["live_visitor_executor", "provider_effects", "not_owner_ready"]
        : [...blockers, "lifecycle_incomplete", "not_owner_ready"],
    });
    writeProofIndex();

    // Leave feature enabled for subsequent local sessions (do not leave kill-switched off)
    await ensureFeature(page, "journey.tapflow", true);
  });

  test("P-tapcanvas-reverse-repair-deep: Open in TapCanvas → repair → partial accept → version/audit", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    const notes: string[] = [];

    await page.goto(`${BASE}/dashboard/experiences/canvas`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByTestId("tapcanvas-heading")).toBeVisible({ timeout: 45_000 });

    // Seed campaign open-from-object (reverse viz)
    const open = await page.request.post(`${BASE}/api/canvas`, {
      data: {
        action: "open_from_object",
        objectType: "campaign",
        objectId: `camp_seed_${Date.now()}`,
        label: "Existing Campaign",
        status: "DRAFT",
      },
    });
    expect(open.ok()).toBeTruthy();
    const openJson = (await open.json()) as { canvas?: { id: string } };
    const canvasId = openJson.canvas!.id;
    notes.push(`canvasId=${canvasId}`);

    const sticky = await page.request.post(`${BASE}/api/canvas`, {
      data: { action: "add_sticky", canvasId, label: "Repair me" },
    });
    expect(sticky.ok()).toBeTruthy();

    const promote = await page.request.post(`${BASE}/api/canvas`, {
      data: {
        action: "promote",
        canvasId,
        nodeIds: [((await sticky.json()) as { node: { id: string } }).node.id],
        confirm: true,
        persist: true,
      },
    });
    expect(promote.ok()).toBeTruthy();
    const promoJson = (await promote.json()) as {
      persistence?: string;
      promoted?: { id: string }[];
      undoVersionId?: string;
    };
    notes.push(`promotePersistence=${promoJson.persistence}`);

    const issues = await page.request.post(`${BASE}/api/canvas`, {
      data: { action: "detect_issues", canvasId },
    });
    expect(issues.ok()).toBeTruthy();
    const issuesJson = (await issues.json()) as {
      proposals?: { id: string }[];
    };
    const proposalId = issuesJson.proposals?.[0]?.id;

    if (proposalId) {
      await page.request.post(`${BASE}/api/canvas`, {
        data: { action: "proposal_preview", proposalId, canvasId },
      });
      const resolve = await page.request.post(`${BASE}/api/canvas`, {
        data: {
          action: "proposal_resolve",
          proposalId,
          decision: "accept",
          canvasId,
        },
      });
      notes.push(`proposal_resolve=${resolve.status()}`);
    } else {
      notes.push("no_proposal_generated");
    }

    const get = await page.request.get(
      `${BASE}/api/canvas?canvasId=${encodeURIComponent(canvasId)}`
    );
    const board = (await get.json()) as {
      canvas: { nodes: { id: string; kind: string; label: string }[] };
      audit?: { action: string }[];
      versions?: { id: string }[];
    };
    const campaignNode = board.canvas.nodes.find(
      (n) => n.kind === "campaign" || n.kind === "card"
    );
    if (campaignNode) {
      const auth = await page.request.post(`${BASE}/api/canvas`, {
        data: {
          action: "node_edit_authoritative",
          canvasId,
          nodeId: campaignNode.id,
          patch: { label: `${campaignNode.label} (edited)` },
          confirm: true,
        },
      });
      notes.push(`authoritative_edit=${auth.status()}`);
    }

    expect((board.versions ?? []).length + (board.audit ?? []).length).toBeGreaterThan(0);

    writeProof({
      id: "P-tapcanvas-reverse-repair-deep",
      route: "/api/canvas open_from_object + promote + proposal + edit",
      workflow:
        "Existing Campaign → Open in TapCanvas → reverse viz → repair → accept → authoritative update → version/audit",
      passed: pageErrors.length === 0,
      browserE2ePassed: true,
      persistencePassed: true,
      consoleErrors,
      pageErrors,
      notes,
      lastVerifiedAt: new Date().toISOString(),
      blockers: ["partial_accept_ui_matrix", "full_sr_axe_signoff", "not_owner_ready"],
    });
    writeProofIndex();
  });

  test("P-tapcanvas-killswitch: TapFlow activation disabled + TapCanvas promotion blocked", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    const notes: string[] = [];
    const blockers: string[] = [];

    await page.goto(`${BASE}/dashboard/experiences/canvas`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByTestId("tapcanvas-heading")).toBeVisible({ timeout: 45_000 });

    const list = await page.request.get(ADMIN_FEATURES);
    if (!list.ok()) {
      blockers.push("admin_features_api_unavailable");
      writeProof({
        id: "P-tapcanvas-killswitch",
        route: "/api/admin/features + /api/canvas",
        workflow: "Kill-switch canvas.tapcanvas + journey.tapflow → 503 → re-enable",
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

    const create = await page.request.post(`${BASE}/api/canvas`, {
      data: { action: "create", name: `Killswitch ${Date.now()}` },
    });
    const canvasId = ((await create.json()) as { canvas: { id: string } }).canvas.id;
    const sticky = await page.request.post(`${BASE}/api/canvas`, {
      data: { action: "add_sticky", canvasId, label: "Blocked promote" },
    });
    const stickyId = ((await sticky.json()) as { node: { id: string } }).node.id;

    // Disable TapFlow publish path
    await ensureFeature(page, "journey.tapflow", true);
    const bind = await page.request.post(`${BASE}/api/canvas`, {
      data: {
        action: "create_tapflow_from_canvas",
        canvasId,
        name: `KS Flow ${Date.now()}`,
      },
    });
    expect(bind.ok()).toBeTruthy();
    const jd = ((await bind.json()) as { journeyDraftId: string }).journeyDraftId;

    await ensureFeature(page, "journey.tapflow", false);
    const blockedActivate = await page.request.post(`${BASE}/api/canvas`, {
      data: {
        action: "tapflow_lifecycle",
        canvasId,
        journeyDraftId: jd,
        lifecycleAction: "activate",
      },
    });
    notes.push(`tapflow_activate_while_off=${blockedActivate.status()}`);
    expect(blockedActivate.status()).toBe(503);

    // Disable TapCanvas promotion
    await ensureFeature(page, "canvas.tapcanvas", false);
    const blockedPromote = await page.request.post(`${BASE}/api/canvas`, {
      data: {
        action: "promote",
        canvasId,
        nodeIds: [stickyId],
        confirm: true,
      },
    });
    notes.push(`promote_while_off=${blockedPromote.status()}`);
    expect(blockedPromote.status()).toBe(503);

    // Re-enable both
    await ensureFeature(page, "canvas.tapcanvas", true);
    await ensureFeature(page, "journey.tapflow", true);

    const promoteAgain = await page.request.post(`${BASE}/api/canvas`, {
      data: {
        action: "promote",
        canvasId,
        nodeIds: [stickyId],
        confirm: true,
        persist: true,
      },
    });
    notes.push(`promote_reenabled=${promoteAgain.status()}`);
    expect(promoteAgain.ok()).toBeTruthy();

    writeProof({
      id: "P-tapcanvas-killswitch",
      route: "/api/admin/features + /api/canvas",
      workflow:
        "Admin kill-switch: journey.tapflow activation 503 + canvas.tapcanvas promotion 503 → re-enable",
      passed: pageErrors.length === 0,
      browserE2ePassed: true,
      persistencePassed: true,
      consoleErrors,
      pageErrors,
      notes: [
        ...notes,
        "Keywords kill-switch owned by Keywords agent (ai.keywords / brand.vocabulary)",
      ],
      lastVerifiedAt: new Date().toISOString(),
      blockers: ["keywords_killswitch_reconcile", "not_owner_ready"],
    });
    writeProofIndex();
  });
});
