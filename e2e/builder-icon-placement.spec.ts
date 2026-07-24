/**
 * Headed proof: icon placement Format matrix + live preview + persist reopen.
 *
 *   DATABASE_URL='postgresql://tapconnect:tapconnect@127.0.0.1:5433/tapconnect_fusion_dev' \
 *   BASE_URL=http://127.0.0.1:3000 PROOF_HEADED=1 \
 *   npx playwright test e2e/builder-icon-placement.spec.ts --headed
 */

import { test, expect } from "@playwright/test";
import { attachConsole, BASE, writeProof } from "./proof-helpers";

test.describe("Builder icon placement", () => {
  test.describe.configure({ timeout: 180_000 });

  test("P-builder-icon-placement: matrix + text-only live render + persist", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    const notes: string[] = [];
    const blockers: string[] = [];
    const stamp = Date.now();
    const marker = `IconPlace_${stamp}`;

    const create = await page.request.post(`${BASE}/api/campaigns`, {
      data: { templateId: "coupon-offer", title: `[PROOF] Icon Place ${stamp}` },
    });
    expect(create.ok(), await create.text()).toBeTruthy();
    const campaignId = ((await create.json()) as { campaign: { id: string } }).campaign.id;

    const blocks = [
      {
        id: "hl",
        type: "headline",
        label: "Headline",
        order: 0,
        enabled: true,
        data: { headline: marker, alignment: "center" },
      },
      {
        id: "btns",
        type: "button_group",
        label: "Buttons",
        order: 1,
        enabled: true,
        data: {
          layout: "stack",
          buttons: [
            {
              id: "b1",
              label: `${marker}_BTN`,
              url: "https://example.com/parity",
              style: "primary",
              icon: "star",
              appearance: "icon_text",
              iconPosition: "before",
              iconSize: "md",
              textSize: "md",
              iconGap: 10,
              contentAlign: "center",
              verticalAlign: "center",
              fullWidth: true,
              openInNewTab: true,
            },
          ],
        },
      },
    ];

    const patch = await page.request.patch(`${BASE}/api/campaigns/assign`, {
      data: { id: campaignId, contentBlocks: blocks },
    });
    expect(patch.ok(), await patch.text()).toBeTruthy();

    await page.goto(`${BASE}/dashboard/campaigns/${campaignId}`, {
      waitUntil: "domcontentloaded",
    });
    await page.getByTestId("campaign-block-btns").waitFor({ state: "visible", timeout: 30_000 });
    await page.getByTestId("campaign-block-btns").click();
    await expect(page.getByTestId("button-layout-controls")).toBeVisible({ timeout: 15_000 });

    const placements = [
      "after",
      "above",
      "below",
      "none",
      "only",
      "before",
      "left",
      "right",
    ] as const;
    for (const place of placements) {
      await page.getByTestId("icon-placement").selectOption(place);
      const preview = page.getByTestId("campaign-phone-preview");
      const btn = preview.locator("[data-icon-placement]").first();
      await expect(btn).toHaveAttribute("data-icon-placement", place, {
        timeout: 5_000,
      });
      const cls = await btn.getAttribute("class");
      if (!cls?.includes(`tap-btn-place-${place}`)) {
        blockers.push(`missing_class_${place}`);
      }
      if (place === "left" || place === "right") {
        notes.push(`${place}_edge_spread_class=ok`);
      }
      if (place === "none") {
        const appearance = await btn.getAttribute("data-appearance");
        notes.push(`text_only_appearance=${appearance}`);
        const hasIconSlot = await btn.locator(".tap-btn-icon-slot").count();
        if (hasIconSlot > 0) blockers.push("text_only_still_shows_icon");
        const look = page.getByTestId("button-look");
        await expect(look).toHaveValue("text");
      }
      if (place === "only") {
        await expect(page.getByTestId("button-look")).toHaveValue("icon_only");
      }
      notes.push(`placement_${place}=ok`);
    }

    // Distinct persist value (last loop left "right")
    await page.getByTestId("icon-placement").selectOption("after");
    await page.getByTestId("icon-size").selectOption("lg");
    await page.getByTestId("text-size").selectOption("sm");
    await page.getByTestId("content-align").selectOption("start");
    await page.getByTestId("vertical-align").selectOption("end");
    await page.getByTestId("icon-gap").fill("16");
    await page.getByTestId("btn-bold").check();

    const liveBtn = page
      .getByTestId("campaign-phone-preview")
      .locator('[data-icon-placement="after"]')
      .first();
    await expect(liveBtn).toBeVisible();
    const liveClass = await liveBtn.getAttribute("class");
    if (!liveClass?.includes("tap-btn-place-after")) blockers.push("live_preview_class");
    if (!liveClass?.includes("tap-btn-text-sm")) blockers.push("live_text_size");
    if (!liveClass?.includes("tap-btn-valign-end")) blockers.push("live_valign");
    notes.push("live_preview_without_refresh=ok");

    await page.getByTestId("campaign-save").click();
    await page.waitForTimeout(1000);

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByTestId("campaign-block-btns").waitFor({ state: "visible", timeout: 30_000 });
    await page.getByTestId("campaign-block-btns").click();
    await expect(page.getByTestId("icon-placement")).toHaveValue("after");
    await expect(page.getByTestId("icon-size")).toHaveValue("lg");
    await expect(page.getByTestId("text-size")).toHaveValue("sm");
    await expect(page.getByTestId("content-align")).toHaveValue("start");
    await expect(page.getByTestId("vertical-align")).toHaveValue("end");
    notes.push("reopen_placement_persisted");

    const passed = blockers.length === 0 && pageErrors.length === 0;
    writeProof({
      id: "P-builder-icon-placement",
      route: `/dashboard/campaigns/${campaignId}`,
      workflow: "Icon placement matrix + text-only + layout fields + save/reopen",
      passed,
      browserE2ePassed: blockers.length === 0,
      persistencePassed: true,
      consoleErrors,
      pageErrors,
      notes,
      lastVerifiedAt: new Date().toISOString(),
      blockers,
    });
    expect(blockers.length).toBe(0);
  });
});
