/**
 * Creative Studio rescue — Owner evidence capture (screenshots + Live Device HTTP proofs).
 * Run: BASE_URL=http://127.0.0.1:3000 npx playwright test e2e/creative-studio-evidence.spec.ts
 * Artifacts: tmp/creative-studio-rescue/evidence/walkthrough/
 */
import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  __clearPreviewSessionsForTests,
  createPreviewSession,
  getPreviewSession,
  revokePreviewSession,
  updatePreviewSession,
  verifyPreviewToken,
} from "../lib/fusion/creative-studio/preview/tokens";
import { resolvePreviewBaseUrl } from "../lib/fusion/creative-studio/preview/url";

const ROOT = path.join(process.cwd(), "tmp/creative-studio-rescue/evidence/walkthrough");
const SHOT = (...parts: string[]) => path.join(ROOT, ...parts);

test.setTimeout(120_000);

test.beforeAll(() => {
  fs.mkdirSync(ROOT, { recursive: true });
  fs.mkdirSync(path.join(ROOT, "desktop"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, "tablet"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, "phone-sim"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, "live-device"), { recursive: true });
});

test("desktop Owner workflow evidence", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({
    timeout: 60_000,
  });
  await page.screenshot({ path: SHOT("desktop", "01-dominant-canvas.png") });

  // Direct select via outline if present
  const outlineBtn = page.locator('[data-testid="card-outline-rail"] button').nth(1);
  if (await outlineBtn.count()) {
    await outlineBtn.click();
    await page.screenshot({ path: SHOT("desktop", "02-outline-selection.png") });
  }

  await page.getByTestId("card-tool-buttons").click();
  await page.screenshot({ path: SHOT("desktop", "03-button-inspector.png") });

  await page.getByTestId("card-tool-typography").click();
  await expect(page.getByTestId("card-drawer-typography")).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: SHOT("desktop", "04-text-inspector.png") });
  const openFont = page.getByTestId("text-panel-open-font");
  if (await openFont.count()) {
    await openFont.click();
    if (await page.getByTestId("font-picker-panel").count()) {
      await page.screenshot({ path: SHOT("desktop", "05-font-previews.png") });
    }
  }

  for (const state of ["expanded", "compact", "collapsed", "pinned", "focus"] as const) {
    await page.getByTestId(`chrome-state-${state}`).click();
    await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute(
      "data-chrome-state",
      state
    );
    await page.screenshot({ path: SHOT("desktop", `06-chrome-${state}.png`) });
  }
  await page.getByTestId("chrome-state-expanded").click();
  await page.getByTestId("open-history-panel").click();
  await expect(page.getByTestId("session-history-panel")).toBeVisible();
  await page.screenshot({ path: SHOT("desktop", "07-history.png") });

  // Leave focus/compact before Preview — Preview CTA lives on the command shade.
  await page.getByTestId("chrome-state-expanded").click();
  const previewCta = page.getByTestId("card-preview-as-customer");
  await expect(previewCta).toBeVisible({ timeout: 20_000 });
  await previewCta.click();
  await expect(page.getByTestId("preview-toolbar")).toBeVisible();
  await page.screenshot({ path: SHOT("desktop", "08-preview-toolbar.png") });
  await page.getByTestId("preview-viewport-tablet").click();
  await page.screenshot({ path: SHOT("desktop", "09-preview-tablet.png") });
  await page.getByTestId("preview-viewport-phone").click();
  await page.screenshot({ path: SHOT("desktop", "10-preview-phone.png") });
  await page.getByTestId("preview-live-device").click();
  await expect(page.getByTestId("live-device-dock")).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: SHOT("desktop", "11-live-device-qr.png") });
  await page.getByTestId("preview-exit").click();
  await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute(
    "data-studio-mode",
    "edit"
  );
  await page.screenshot({ path: SHOT("desktop", "12-exit-preview-restored.png") });
});

test("tablet and phone simulation evidence", async ({ page }) => {
  await page.setViewportSize({ width: 834, height: 1112 });
  await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({
    timeout: 60_000,
  });
  await page.screenshot({ path: SHOT("tablet", "01-editor.png") });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({
    timeout: 60_000,
  });
  await page.screenshot({ path: SHOT("phone-sim", "01-editor.png") });
});

test("Live Device token + LAN preview HTTP evidence", async ({ page, request }) => {
  process.env.PREVIEW_TOKEN_SECRET =
    process.env.PREVIEW_TOKEN_SECRET || "tc-evidence-passphrase-not-for-commit";
  __clearPreviewSessionsForTests();

  const configured = process.env.NEXT_PUBLIC_PREVIEW_BASE_URL || "";
  const resolved = resolvePreviewBaseUrl({ configured });
  const report: Record<string, unknown> = {
    configuredBasePresent: Boolean(configured),
    reachableForPhone: resolved.reachableForPhone,
    isLocalhost: resolved.isLocalhost,
    previewEnvType: "local_test_lan_non_production",
    physicalPhoneModel: null,
    physicalBrowser: null,
    notes: [],
  };

  const session = createPreviewSession({
    businessId: "biz_demo",
    brandKitId: "bk_demo",
    cardName: "Demo Café Card",
    businessName: "Demo Café",
    snapshotJson: JSON.stringify({
      version: 1,
      sections: [],
      accentColor: "#22c55e",
      surfaceColor: "#0b0f19",
      textColor: "#f8fafc",
    }),
    profileJson: JSON.stringify({ displayName: "Demo Café" }),
    revision: 1,
  });
  const other = createPreviewSession({
    businessId: "biz_other",
    brandKitId: "bk_other",
    cardName: "Other Card",
    businessName: "Other Biz",
    snapshotJson: "{}",
    profileJson: "{}",
  });

  report.tokenLength = session.token.length;
  report.path = session.path;
  report.verifyOk = verifyPreviewToken(session.token).ok;
  report.crossTenantIsolated =
    getPreviewSession(session.token).ok &&
    getPreviewSession(other.token).ok &&
    (getPreviewSession(session.token) as { ok: true; record: { businessId: string } })
      .record.businessId !==
      (getPreviewSession(other.token) as { ok: true; record: { businessId: string } })
        .record.businessId;

  const updated = updatePreviewSession(session.token, {
    snapshotJson: JSON.stringify({ revisionMark: 2 }),
    revision: 2,
  });
  report.updateOk = updated.ok;

  const lanBase = configured || "http://192.168.2.24:3000";
  // In-process store is not shared with Next server — exercise public route via API create when possible.
  // Fall back: open editor Live Device UI and capture QR panel (server-side session).
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({
    timeout: 60_000,
  });
  await page.getByTestId("card-preview-as-customer").click();
  await page.getByTestId("preview-live-device").click();
  await expect(page.getByTestId("live-device-dock")).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: SHOT("live-device", "01-qr-panel.png") });

  const generate = page.getByTestId("preview-generate-qr");
  if (await generate.isVisible()) {
    await generate.click();
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: SHOT("live-device", "02-qr-generated.png") });

  const previewLink = page.getByTestId("preview-url-text");
  let previewUrl = "";
  if (await previewLink.count()) {
    previewUrl = ((await previewLink.textContent()) || "").trim();
  }
  report.uiPreviewUrlPresent = Boolean(previewUrl);
  report.uiPreviewUsesLan =
    previewUrl.includes("192.168.2.24") || previewUrl.startsWith(lanBase);

  if (previewUrl) {
    const phone = await request.get(previewUrl);
    report.phoneHttpStatus = phone.status();
    const html = await phone.text();
    report.bannerNotPublished = /not published|preview only|working draft/i.test(html);
    report.noClerkSessionMarker = !/clerk\.accounts|__clerk|ClerkProvider/i.test(html);
    report.noAdminMutationChrome = !/Retire card|Brand Kit|Save Card|dashboard\/card\/edit/i.test(
      html
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(previewUrl, { waitUntil: "domcontentloaded" });
    await page.screenshot({ path: SHOT("live-device", "03-phone-sim-preview.png") });
    if (await page.getByTestId("preview-draft-banner").count()) {
      await expect(page.getByTestId("preview-draft-banner")).toBeVisible();
    }
  } else {
    (report.notes as string[]).push(
      "QR URL not exposed in DOM testids — panel screenshot captured; configure Generate if required."
    );
  }

  const revoked = revokePreviewSession(session.token);
  report.revokeOk = revoked.ok;
  report.afterRevokeDenied = !getPreviewSession(session.token).ok;

  fs.writeFileSync(
    SHOT("live-device", "acceptance-report.json"),
    JSON.stringify(report, null, 2)
  );
  expect(report.verifyOk).toBe(true);
  expect(report.crossTenantIsolated).toBe(true);
  expect(report.revokeOk).toBe(true);
});
