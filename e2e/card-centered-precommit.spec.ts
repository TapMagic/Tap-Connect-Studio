/**
 * Pre-commit proofs for Card-Centered Owner Experience + Zone Identity V1.
 * Decision Queue recovery · Card lifecycle handoff · zone perceptibility.
 *
 * Usage:
 *   PROOF_HEADED=1 BASE_URL=http://127.0.0.1:3000 \
 *   npx playwright test e2e/card-centered-precommit.spec.ts --headed --workers=1
 */
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";
import { BASE, SEED, attachConsole } from "./proof-helpers";

const SHOT = path.join("tmp", "card-centered-owner-experience-precommit");
const headed = process.env.PROOF_HEADED === "1";

test.describe("Card-centered precommit proofs", () => {
  test.skip(!headed, "Set PROOF_HEADED=1");
  test.describe.configure({ timeout: 180_000 });

  test.beforeAll(() => {
    fs.mkdirSync(SHOT, { recursive: true });
  });

  test("Decision Queue: assign fail → visible meta → discard → cleared", async ({
    page,
  }) => {
    attachConsole(page);
    const fakeDevice = `missing_slot_${Date.now()}`;
    const failRes = await page.request.post(`${BASE}/api/campaigns/assign`, {
      data: { campaignId: SEED.campaignId, deviceSlotId: fakeDevice },
    });
    expect(failRes.ok()).toBeFalsy();

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
    expect(match).toBeTruthy();

    await page.goto(`${BASE}/dashboard#decision-queue`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByTestId("decision-queue")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("decision-queue-items")).toBeVisible({ timeout: 15_000 });
    const item = page.locator(`[data-decision-id="${match!.id}"]`);
    await expect(item).toBeVisible();
    await expect(item.getByTestId("decision-item-meta")).toBeVisible();
    const meta = await item.getByTestId("decision-item-meta").innerText();
    expect(meta).toContain(`campaign:${SEED.campaignId}`);
    const itemText = (await item.innerText()).replace(/\s+/g, " ");
    expect(/Open Tap Points/i.test(itemText)).toBeTruthy();
    await page.screenshot({
      path: path.join(SHOT, "02-decision-queue-active.png"),
      fullPage: true,
    });

    const discard = await page.request.post(`${BASE}/api/outbox`, {
      data: { action: "discard", id: match!.id, reason: "precommit_cleanup" },
    });
    expect(discard.ok()).toBeTruthy();
    await page.screenshot({
      path: path.join(SHOT, "03-decision-queue-dismissed.png"),
      fullPage: true,
    });

    await expect(async () => {
      const afterDead = await page.request.get(`${BASE}/api/outbox?view=dead`);
      const afterJson = (await afterDead.json()) as { records?: { id: string }[] };
      expect((afterJson.records ?? []).some((r) => r.id === match!.id)).toBeFalsy();
    }).toPass({ timeout: 10_000 });

    await page.goto(`${BASE}/dashboard?_=${Date.now()}#decision-queue`, {
      waitUntil: "networkidle",
    });
    await expect(page.getByTestId("decision-queue")).toBeVisible({ timeout: 20_000 });
    expect(await page.locator(`[data-decision-id="${match!.id}"]`).count()).toBe(0);
    await page.screenshot({
      path: path.join(SHOT, "04-decision-queue-recovered.png"),
      fullPage: true,
    });
  });

  test("Card lifecycle entry opens authoritative retire control", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/card`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-where-used")).toBeVisible({ timeout: 25_000 });
    await expect(page.getByTestId("card-retire-entry")).toBeVisible();
    await page.screenshot({
      path: path.join(SHOT, "05-card-assembly-lifecycle-entry.png"),
      fullPage: true,
    });
    await page.getByTestId("card-retire-entry").click();
    await expect(page).toHaveURL(/\/dashboard\/card\/edit/);
    await expect(page.getByTestId("card-drawer-lifecycle")).toBeVisible({
      timeout: 25_000,
    });
    await page.screenshot({
      path: path.join(SHOT, "06-card-editor-lifecycle-drawer.png"),
    });
    await expect(page.getByTestId("card-retire-toggle")).toBeVisible({
      timeout: 25_000,
    });
    await page.screenshot({ path: path.join(SHOT, "07-card-retire-toggle.png") });
    await expect(page.getByTestId("card-where-used-link")).toBeVisible();
    await page.screenshot({ path: path.join(SHOT, "08-card-where-used.png") });
    await expect(page.getByTestId("freeform-honest-disabled")).toBeVisible();
  });

  test("Home command center + Experiences + Brand + Integrations", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    await expect(page.getByTestId("home-card-command-center")).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId("home-next-action-go")).toHaveCount(1);
    await page.screenshot({
      path: path.join(SHOT, "01-home-card-command-center.png"),
      fullPage: true,
    });

    await page.goto(`${BASE}/dashboard/experiences`, { waitUntil: "networkidle" });
    await expect(page.getByTestId("experiences-primary-card")).toBeVisible();
    await expect(page.getByTestId("experiences-labs")).not.toHaveAttribute("open", "");

    await page.goto(`${BASE}/dashboard/brand/edit`, { waitUntil: "networkidle" });
    await expect(page.getByTestId("brand-edit-workspace-host")).toHaveAttribute(
      "data-brand-default-owner-path",
      "true"
    );

    await page.goto(`${BASE}/dashboard/integrations`, { waitUntil: "networkidle" });
    await expect(page.getByTestId("integrations-group-works-now")).toBeVisible();
    await expect(page.getByTestId("integrations-group-after-setup")).toBeVisible();
    await expect(page.getByTestId("integrations-group-local-test")).toBeVisible();
    await expect(page.getByTestId("integrations-group-planned")).toBeVisible();
  });

  test("Zone identity captures + comparison sheet", async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 700 });
    const zones: Array<{ file: string; url: string; sel: string; label: string }> = [
      { file: "09-zone-card.png", url: "/dashboard/card", sel: ".zone-card, .card-zone-glow", label: "Card" },
      {
        file: "10-zone-brand.png",
        url: "/dashboard/brand/edit",
        sel: ".zone-brand, .brand-zone-glow",
        label: "Brand",
      },
      { file: "11-zone-campaign.png", url: "/dashboard/campaigns", sel: "body", label: "Campaign" },
      { file: "12-zone-email.png", url: "/dashboard/campaigns", sel: "body", label: "Email" },
      {
        file: "13-zone-audience.png",
        url: "/dashboard/audience",
        sel: ".zone-audience",
        label: "Audience",
      },
      {
        file: "14-zone-service.png",
        url: "/dashboard/audience/inbox",
        sel: ".zone-service",
        label: "Service",
      },
      {
        file: "15-zone-autopilot.png",
        url: "/dashboard/card?wire=offer",
        sel: ".zone-autopilot, .zone-card",
        label: "Autopilot",
      },
      {
        file: "16-zone-insights.png",
        url: "/dashboard/insights",
        sel: ".zone-insights",
        label: "Insights",
      },
      {
        file: "17-zone-integrations.png",
        url: "/dashboard/integrations",
        sel: ".zone-integrations",
        label: "Integrations",
      },
      {
        file: "18-zone-tap-points.png",
        url: "/dashboard/tap-points",
        sel: ".zone-tap-points",
        label: "Tap Points",
      },
      {
        file: "19-zone-settings.png",
        url: "/dashboard/settings",
        sel: ".zone-settings",
        label: "Settings",
      },
    ];

    await page.goto(`${BASE}/dashboard/campaigns`, { waitUntil: "networkidle" });
    const camp = page.locator('a[href^="/dashboard/campaigns/"]').first();
    let campaignHref: string | null = null;
    if (await camp.isVisible().catch(() => false)) {
      campaignHref = await camp.getAttribute("href");
    }

    for (const z of zones) {
      let url = z.url;
      let sel = z.sel;
      if (z.label === "Campaign" && campaignHref) {
        url = campaignHref;
        sel = ".campaign-zone-glow, .zone-campaign";
      }
      if (z.label === "Email" && campaignHref) {
        url = `${campaignHref}/email`;
        sel = ".email-zone-glow, .zone-email";
      }
      await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);
      // Viewport crop (not full tall element) so comparison sheet shows atmosphere + edge rail
      await page.screenshot({
        path: path.join(SHOT, z.file),
        clip: { x: 0, y: 0, width: 1100, height: 700 },
      });
    }

    const tiles = zones.map((z) => {
      const buf = fs.readFileSync(path.join(SHOT, z.file));
      return { label: z.label, dataUrl: `data:image/png;base64,${buf.toString("base64")}` };
    });

    await page.setViewportSize({ width: 1480, height: 980 });
    await page.setContent(`<!doctype html>
<html><head><meta charset="utf-8" /></head>
<body style="margin:0;background:#0b0f19;color:#e8e4dc;font-family:ui-sans-serif,system-ui">
  <h1 style="padding:16px 20px 8px;font-size:20px;font-weight:600">Zone identity comparison</h1>
  <p style="padding:0 20px 12px;font-size:12px;color:#9aa3b5;max-width:70ch">
    Same viewport crops. Edge rail + atmosphere should let a normal viewer tell Campaign from Email,
    Insights from Audience, and TapInbox from Autopilot without relying only on the page title.
  </p>
  <div id="grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:8px 20px 24px"></div>
  <script>
    const tiles = ${JSON.stringify(tiles)};
    const grid = document.getElementById('grid');
    for (const t of tiles) {
      const cell = document.createElement('div');
      cell.style.cssText = 'border:1px solid rgba(255,255,255,.14);border-radius:10px;overflow:hidden;background:#11151f';
      const label = document.createElement('div');
      label.textContent = t.label;
      label.style.cssText = 'padding:8px 10px;font-size:13px;font-weight:650;letter-spacing:.02em;background:#161b28';
      const img = document.createElement('img');
      img.src = t.dataUrl;
      img.alt = t.label + ' zone';
      img.style.cssText = 'width:100%;height:180px;object-fit:cover;display:block';
      cell.appendChild(label); cell.appendChild(img); grid.appendChild(cell);
    }
  </script>
</body></html>`);
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SHOT, "20-zone-identity-comparison.png"),
      fullPage: true,
    });
    // Also copy to the wave folder alias required by the brief
    fs.copyFileSync(
      path.join(SHOT, "20-zone-identity-comparison.png"),
      path.join("tmp", "card-centered-owner-experience", "zone-identity-comparison.png")
    );
  });

  test("Phone + axe matrix", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    await expect(page.getByTestId("home-card-command-center")).toBeVisible({
      timeout: 60_000,
    });
    await page.screenshot({ path: path.join(SHOT, "21-home-phone.png"), fullPage: true });
    await page.goto(`${BASE}/dashboard/integrations`, { waitUntil: "networkidle" });
    await page.screenshot({
      path: path.join(SHOT, "22-integrations-phone.png"),
      fullPage: true,
    });

    const routes = [
      "/dashboard",
      "/dashboard/card",
      "/dashboard/audience",
      "/dashboard/audience/inbox",
      "/dashboard/insights",
      "/dashboard/integrations",
      "/dashboard/tap-points",
      "/dashboard/settings",
    ];
    for (const [w, h] of [
      [1280, 900],
      [768, 1024],
      [390, 844],
    ] as const) {
      await page.setViewportSize({ width: w, height: h });
      for (const route of routes) {
        await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa"])
          .analyze();
        const serious = results.violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical"
        );
        expect(
          serious,
          `${w}x${h} ${route}: ${serious.map((v) => v.id).join(",")}`
        ).toEqual([]);
      }
    }
  });
});
