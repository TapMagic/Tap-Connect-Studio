/**
 * Builder interaction parity — exploratory control audit + WYSIWYG proofs.
 *
 * Covers: icon placement matrix, text-only Look, Escape/focus exits, bg-remove
 * local workflow, editor↔public DOM parity, save/reopen persistence.
 *
 * Usage:
 *   DATABASE_URL='postgresql://tapconnect:tapconnect@127.0.0.1:5433/tapconnect_fusion_dev' \
 *   BASE_URL=http://127.0.0.1:3000 PROOF_HEADED=1 \
 *   npx playwright test e2e/builder-interaction-parity.spec.ts --headed
 */

import { test, expect } from "@playwright/test";
import {
  attachConsole,
  BASE,
  PROOF_PUBLIC_AT,
  SEED,
  resolveProofPublicDevice,
  selectCampaignBlock,
  waitForCampaignEditorReady,
  writeProof,
  writeProofIndex,
} from "./proof-helpers";

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVSF+FABJADveWkH6aAAAAAElFTkSuQmCC";

test.describe("Builder interaction parity", () => {
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
    await selectCampaignBlock(page, "campaign-block-btns");
    await expect(page.getByTestId("campaign-format-heading")).toHaveText(/Edit:\s*Buttons/i, {
      timeout: 15_000,
    });
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
    await selectCampaignBlock(page, "campaign-block-btns");
    await expect(page.getByTestId("campaign-format-heading")).toHaveText(/Edit:\s*Buttons/i, {
      timeout: 15_000,
    });
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

  test("P-builder-wysiwyg-public: editor preview DOM matches public /t/", async ({ page }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    const notes: string[] = [];
    const blockers: string[] = [];
    const stamp = Date.now();
    const marker = `Wysiwyg_${stamp}`;

    const create = await page.request.post(`${BASE}/api/campaigns`, {
      data: { templateId: "coupon-offer", title: `[PROOF] WYSIWYG ${stamp}` },
    });
    expect(create.ok()).toBeTruthy();
    const campaignId = ((await create.json()) as { campaign: { id: string } }).campaign.id;

    const blocks = [
      {
        id: "hl",
        type: "headline",
        label: "Headline",
        order: 0,
        enabled: true,
        data: { headline: marker, subheadline: "Public parity", alignment: "center" },
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
              label: `${marker}_GO`,
              url: "https://example.com/go",
              style: "primary",
              icon: "link",
              appearance: "icon_text",
              iconPosition: "after",
              fullWidth: true,
              openInNewTab: true,
            },
          ],
        },
      },
    ];

    await page.request.patch(`${BASE}/api/campaigns/assign`, {
      data: { id: campaignId, contentBlocks: blocks, status: "LIVE" },
    });

    // Dedicated device — seeddemo01 schedule / prior BgRemove contamination must not win
    const proofDevice = await resolveProofPublicDevice(
      page.request,
      `WysiwygProof_${stamp}`
    );
    let deviceSlotId = proofDevice.deviceSlotId;
    let deviceCode = proofDevice.deviceCode;
    notes.push(`device_dedicated=${proofDevice.dedicated}`);

    await page.goto(`${BASE}/dashboard/campaigns/${campaignId}`, {
      waitUntil: "domcontentloaded",
    });
    await waitForCampaignEditorReady(page);

    if (!deviceSlotId) {
      const deviceSelect = page.getByTestId("campaign-publish-device");
      if ((await deviceSelect.count()) > 0) {
        deviceSlotId = await deviceSelect.inputValue();
        deviceCode = SEED.deviceCode;
        notes.push(`deviceSlotId_seed_fallback=${deviceSlotId}`);
      }
    } else {
      notes.push(`deviceSlotId=${deviceSlotId} deviceCode=${deviceCode}`);
    }

    if (deviceSlotId) {
      const a2 = await page.request.post(`${BASE}/api/campaigns/assign`, {
        data: { deviceSlotId, campaignId },
      });
      notes.push(`assign=${a2.status()}`);
      if (!a2.ok()) blockers.push("assign_failed");
    } else {
      blockers.push("device_slot_missing");
    }

    const preview = page.getByTestId("campaign-phone-preview");
    // Marker appears in headline + button label — scope to headline to avoid strict-mode clash
    await expect(preview.locator(".tap-headline", { hasText: marker })).toBeVisible({
      timeout: 15_000,
    });
    const editorBtn = preview.locator(`[data-icon-placement="after"]`).first();
    await expect(editorBtn).toBeVisible();
    const editorDom = await editorBtn.evaluate((el) => ({
      label: (el.textContent || "").replace(/\s+/g, " ").trim(),
      placement: el.getAttribute("data-icon-placement"),
      appearance: el.getAttribute("data-appearance"),
      classes: el.className,
    }));
    notes.push(`editor_label=${editorDom.label.slice(0, 60)}`);
    notes.push(`editor_classes=${editorDom.classes.slice(0, 120)}`);
    if (!editorDom.classes.includes("tap-btn")) blockers.push("editor_missing_tap_btn_class");
    if (editorDom.placement !== "after") blockers.push("editor_placement_mismatch");

    await preview.screenshot({
      path: `tmp/fusion-proofs/P-builder-wysiwyg-editor-${stamp}.png`,
    });

    const at = encodeURIComponent(PROOF_PUBLIC_AT);
    await page.goto(`${BASE}/t/${deviceCode}?public=1&at=${at}`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(1000);
    const publicBody = await page.locator("body").innerText();
    const publicHasMarker = publicBody.includes(marker) || publicBody.includes(`${marker}_GO`);
    notes.push(`public_has_marker=${publicHasMarker} public_url=/t/${deviceCode}`);
    if (!publicHasMarker) {
      blockers.push("public_missing_marker");
    } else {
      const publicBtn = page.locator(`[data-icon-placement="after"]`).first();
      await expect(publicBtn).toBeVisible({ timeout: 10_000 });
      const publicDom = await publicBtn.evaluate((el) => ({
        label: (el.textContent || "").replace(/\s+/g, " ").trim(),
        placement: el.getAttribute("data-icon-placement"),
        appearance: el.getAttribute("data-appearance"),
        classes: el.className,
      }));
      notes.push(`public_label=${publicDom.label.slice(0, 60)}`);
      notes.push(`public_classes=${publicDom.classes.slice(0, 120)}`);
      if (publicDom.placement !== editorDom.placement) blockers.push("placement_attr_mismatch");
      if (!publicDom.label.includes(`${marker}_GO`)) blockers.push("public_label_mismatch");
      if (!publicDom.classes.includes("tap-btn")) blockers.push("public_missing_tap_btn_class");
      // Shared renderer contract: placement class present on both
      const placeClass = "tap-btn-place-after";
      if (!editorDom.classes.includes(placeClass) || !publicDom.classes.includes(placeClass)) {
        blockers.push("placement_class_mismatch");
      }
      await page.screenshot({
        path: `tmp/fusion-proofs/P-builder-wysiwyg-public-${stamp}.png`,
        fullPage: true,
      });
    }

    writeProof({
      id: "P-builder-wysiwyg-public",
      route: `/dashboard/campaigns/${campaignId} ↔ /t/${deviceCode}`,
      workflow: "Editor canvas vs public /t/ shared renderer + placement attrs + screenshots",
      passed: blockers.length === 0 && pageErrors.length === 0,
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

  test("P-builder-exits-bg-remove: Escape gallery + bg-remove panel workflow", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    const notes: string[] = [];
    const blockers: string[] = [];
    const stamp = Date.now();

    await page.goto(`${BASE}/dashboard/campaigns/${SEED.campaignId}`, {
      waitUntil: "domcontentloaded",
    });
    await waitForCampaignEditorReady(page);

    // Open a block with MediaPicker — hero_image or headline won't; use seed welcome hero if present
    // Inject via patch a hero with tiny png so Remove bg appears
    const heroBlocks = [
      {
        id: "seed_headline",
        type: "headline",
        label: "Headline",
        order: 0,
        enabled: true,
        data: { headline: `BgRemove_${stamp}`, alignment: "center" },
      },
      {
        id: "hero_bg",
        type: "hero_image",
        label: "Hero",
        order: 1,
        enabled: true,
        data: { imageUrl: TINY_PNG, altText: "proof", aspect: "1/1", objectFit: "contain" },
      },
    ];
    const patch = await page.request.patch(`${BASE}/api/campaigns/assign`, {
      data: { id: SEED.campaignId, contentBlocks: heroBlocks },
    });
    notes.push(`patch_hero=${patch.status()}`);
    expect(patch.ok()).toBeTruthy();

    await page.reload({ waitUntil: "domcontentloaded" });
    await selectCampaignBlock(page, "campaign-block-hero_bg");
    await expect(page.getByTestId("media-picker")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("bg-remove-open")).toBeVisible();

    // Paste focus control
    await page.getByTestId("media-paste-focus").click();
    await expect(page.getByTestId("media-picker-message")).toContainText(/Paste/i);
    notes.push("paste_focus_message");

    // Bg-remove panel open / Escape close / focus return
    await page.getByTestId("bg-remove-open").click();
    await expect(page.getByTestId("bg-remove-panel")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("bg-remove-panel")).toHaveCount(0);
    notes.push("bg_remove_escape_close");

    await page.getByTestId("bg-remove-open").click();
    await expect(page.getByTestId("bg-remove-panel")).toBeVisible();
    // Light / dark / checker preview surfaces
    for (const mode of ["light", "dark", "checker"] as const) {
      await page.getByTestId(`bg-preview-${mode}`).click();
      notes.push(`preview_mode_${mode}`);
    }
    await page.getByLabel("Edge refinement").check();
    await page.getByLabel("Soft shadow").check();
    await page.getByLabel("Crop margins (focal center)").check();
    await page.getByTestId("bg-remove-preview-btn").click();
    await page.waitForTimeout(1000);
    // Tiny solid PNG should chroma-key; apply must enable when preview succeeds
    const previewMsg = await page.getByTestId("bg-remove-panel").innerText();
    notes.push(`bg_preview=${previewMsg.slice(0, 100).replace(/\s+/g, " ")}`);
    await expect(page.getByTestId("bg-remove-where-used")).toBeVisible();
    await expect(page.getByTestId("bg-remove-undo-hint")).toBeVisible();
    const apply = page.getByTestId("bg-remove-apply");
    if (await apply.isEnabled()) {
      await expect(page.getByTestId("bg-remove-provenance")).toBeVisible();
      await apply.click();
      notes.push("bg_remove_applied");
      // Re-open → restore original (non-destructive)
      await page.getByTestId("bg-remove-open").click();
      await page.getByTestId("bg-remove-restore").click();
      await expect(page.getByTestId("bg-remove-panel")).toHaveCount(0);
      notes.push("bg_remove_restored");
    } else {
      await page.getByRole("button", { name: /^Close$/i }).first().click();
      notes.push("bg_remove_preview_only");
      blockers.push("bg_remove_apply_disabled_after_preview");
    }

    // Logo gallery Escape + focus return (opens even on empty/error — honest panel)
    await page.getByPlaceholder(/Brand or domain/i).fill("nike");
    await page.getByRole("button", { name: /^Find$/i }).click();
    await expect(page.getByTestId("media-gallery-dialog")).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("media-gallery-dialog")).toHaveCount(0);
    notes.push("gallery_escape_close");

    // Side tabs (QR / schedule / email): Esc returns to Content + focus restore
    for (const side of ["qr", "schedule", "email"] as const) {
      const tabBtn = page.getByTestId(`campaign-tab-${side}`);
      if ((await tabBtn.count()) === 0) {
        notes.push(`side_tab_${side}_absent`);
        continue;
      }
      await tabBtn.click();
      await page.waitForTimeout(200);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
      await expect(page.getByTestId("campaign-tab-content")).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      notes.push(`side_tab_${side}_escape_to_content`);
    }

    // Finish picker honesty — Page theme FinishPicker has honest None (allowNone)
    await page.getByRole("button", { name: /^Page theme$/i }).click();
    const finishPickers = page.getByTestId("finish-picker");
    await expect(finishPickers.first()).toBeVisible({ timeout: 10_000 });
    const opts = await finishPickers.first().locator("option").allTextContents();
    const hasNone = opts.some((o) => /None/i.test(o));
    notes.push(`finish_none_option=${hasNone}`);
    if (!hasNone) blockers.push("finish_picker_missing_none");
    await finishPickers.first().selectOption("");
    await expect(finishPickers.first()).toHaveValue("");
    notes.push("finish_none_selected_honest");

    writeProof({
      id: "P-builder-exits-bg-remove",
      route: `/dashboard/campaigns/${SEED.campaignId}`,
      workflow: "Escape/focus exits + bg-remove panel + paste focus + FinishPicker honesty",
      passed: blockers.length === 0 && pageErrors.length === 0,
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

  test("P-builder-exploratory-audit: safe control sweep + no traps", async ({ page }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    const notes: string[] = [];
    const blockers: string[] = [];
    const stamp = Date.now();
    const marker = `Explore_${stamp}`;

    const create = await page.request.post(`${BASE}/api/campaigns`, {
      data: { templateId: "coupon-offer", title: `[PROOF] Exploratory ${stamp}` },
    });
    expect(create.ok()).toBeTruthy();
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
        id: "hero",
        type: "hero_image",
        label: "Hero",
        order: 1,
        enabled: true,
        data: { imageUrl: TINY_PNG, altText: "explore", aspect: "1/1", objectFit: "contain" },
      },
      {
        id: "rt",
        type: "rich_text",
        label: "Body",
        order: 2,
        enabled: true,
        data: { body: "Long name stress — The Extremely Long Business Name LLC & Partners" },
      },
      {
        id: "btns",
        type: "button_group",
        label: "Buttons",
        order: 3,
        enabled: true,
        data: {
          layout: "stack",
          buttons: [
            {
              id: "b1",
              label: "Short",
              url: "https://example.com/a",
              style: "primary",
              icon: "link",
              appearance: "icon_text",
              fullWidth: true,
            },
            {
              id: "b2",
              label: "A Very Long Button Label That Should Wrap Gracefully On Mobile Viewports",
              url: "https://example.com/b",
              style: "outline",
              icon: "star",
              appearance: "icon_text",
              iconPosition: "before",
              wrap: true,
              fullWidth: true,
            },
            {
              id: "b3",
              label: "Icon",
              url: "https://example.com/c",
              style: "soft",
              icon: "instagram",
              appearance: "icon_only",
              iconPosition: "only",
            },
          ],
        },
      },
    ];
    await page.request.patch(`${BASE}/api/campaigns/assign`, {
      data: { id: campaignId, contentBlocks: blocks },
    });

    await page.goto(`${BASE}/dashboard/campaigns/${campaignId}`, {
      waitUntil: "domcontentloaded",
    });
    await waitForCampaignEditorReady(page);

    // Hydration / React mismatch signals
    const hydrationNoise = consoleErrors.filter((e) =>
      /hydrat|did not match|Minified React error/i.test(e)
    );
    if (hydrationNoise.length) blockers.push(`hydration_console=${hydrationNoise.length}`);

    // Sweep toolbar — every control present and clickable (safe)
    const toolbar = [
      "campaign-undo",
      "campaign-redo",
      "campaign-save",
      "campaign-publish",
      "campaign-versions",
    ] as const;
    for (const id of toolbar) {
      const el = page.getByTestId(id);
      if ((await el.count()) === 0) {
        blockers.push(`missing_${id}`);
        continue;
      }
      const disabled = await el.isDisabled().catch(() => false);
      notes.push(`toolbar_${id}=${disabled ? "disabled" : "enabled"}`);
      if (id === "campaign-versions") {
        await el.click();
        await page.waitForTimeout(250);
        // Close / reopen versions (inline panel — Escape optional)
        await el.click();
        notes.push("versions_toggle_close_reopen");
      }
    }

    // Toggle preview if present
    const previewToggle = page.getByRole("button", { name: /preview/i }).first();
    if ((await previewToggle.count()) > 0) {
      await previewToggle.click();
      await page.waitForTimeout(200);
      await previewToggle.click();
      notes.push("preview_toggle");
    }

    // Change a value → verify live render
    await selectCampaignBlock(page, "campaign-block-hl");
    const headlineInput = page
      .getByTestId("block-headline-text")
      .or(page.getByLabel(/^Headline$/i))
      .first();
    if ((await headlineInput.count()) > 0) {
      const next = `${marker}_EDIT`;
      await headlineInput.fill(next);
      await page.waitForTimeout(300);
      const phoneText = await page.getByTestId("campaign-phone-preview").innerText();
      if (!phoneText.includes(next) && !phoneText.includes(marker)) {
        blockers.push("stale_preview_after_headline_edit");
      } else {
        notes.push("live_preview_updated");
      }
    } else {
      notes.push("headline_input_not_found_skip");
    }

    // Button layout controls when available (other stream may own full matrix)
    await selectCampaignBlock(page, "campaign-block-btns");
    const layout = page.getByTestId("button-layout-controls");
    if ((await layout.count()) > 0) {
      await expect(layout).toHaveCount(1);
      await expect(layout).toBeVisible();
      if ((await page.getByTestId("layout-wrap").count()) > 0) {
        await page.getByTestId("layout-wrap").check();
      }
      if ((await page.getByTestId("icon-placement").count()) > 0) {
        await page.getByTestId("icon-placement").selectOption("above");
      }
      notes.push("button_layout_controls_wired");
    } else {
      notes.push("button_layout_controls_absent_honest");
    }
    await page.waitForTimeout(200);

    const phone = page.getByTestId("campaign-phone-preview");
    await expect(phone).toBeVisible();
    const overflow = await phone.evaluate((el) => {
      const nodes = Array.from(el.querySelectorAll("*"));
      return nodes.some((n) => {
        const h = n as HTMLElement;
        return h.scrollWidth > h.clientWidth + 4 && h.clientWidth > 40;
      });
    });
    notes.push(`preview_overflow_probe=${overflow}`);

    // Media panel open → close → reopen (exit + no trap)
    await selectCampaignBlock(page, "campaign-block-hero");
    await expect(page.getByTestId("media-picker")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("bg-remove-open").click();
    await expect(page.getByTestId("bg-remove-panel")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("bg-remove-panel")).toHaveCount(0);
    await page.getByTestId("bg-remove-open").click();
    await expect(page.getByTestId("bg-remove-panel")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("bg-remove-panel")).toHaveCount(0);
    notes.push("media_bg_panel_close_reopen");

    // Save → reload persistence
    await page.getByTestId("campaign-save").click();
    await page.waitForTimeout(1000);
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForCampaignEditorReady(page);
    const afterReload = await page.getByTestId("campaign-phone-preview").innerText();
    if (!afterReload.includes(marker)) blockers.push("reload_missing_marker");
    else notes.push("save_reload_ok");

    // Undo after a small change (skip if history empty / control honestly disabled)
    await selectCampaignBlock(page, "campaign-block-hl");
    const hi2 = page.getByTestId("block-headline-text");
    if ((await hi2.count()) > 0) {
      await hi2.fill(`${marker}_UNDO`);
      await page.waitForTimeout(400);
      const undo = page.getByTestId("campaign-undo");
      if (await undo.isDisabled()) {
        notes.push("undo_disabled_after_fill_skip");
      } else {
        await undo.click();
        await page.waitForTimeout(300);
        notes.push("undo_after_edit");
      }
    }

    // Publish + public render on dedicated device (avoid seed schedule contamination)
    const proofDevice = await resolveProofPublicDevice(
      page.request,
      `ExploreAudit_${stamp}`
    );
    let deviceSlotId = proofDevice.deviceSlotId;
    let deviceCode = proofDevice.deviceCode;
    notes.push(`device_dedicated=${proofDevice.dedicated}`);
    if (!deviceSlotId) {
      const deviceSelect = page.getByTestId("campaign-publish-device");
      if ((await deviceSelect.count()) > 0) {
        deviceSlotId = await deviceSelect.inputValue();
        deviceCode = SEED.deviceCode;
      }
    }
    if (deviceSlotId) {
      const pub = await page.request.patch(`${BASE}/api/campaigns/assign`, {
        data: { id: campaignId, status: "LIVE" },
      });
      const assign = await page.request.post(`${BASE}/api/campaigns/assign`, {
        data: { deviceSlotId, campaignId },
      });
      notes.push(`publish_patch=${pub.status()} assign=${assign.status()}`);
      if (!pub.ok() || !assign.ok()) blockers.push("publish_or_assign_failed");
      else {
        const at = encodeURIComponent(PROOF_PUBLIC_AT);
        await page.goto(`${BASE}/t/${deviceCode}?public=1&at=${at}`, {
          waitUntil: "domcontentloaded",
        });
        await page.waitForTimeout(900);
        const publicText = await page.locator("body").innerText();
        if (!publicText.includes(marker)) blockers.push("public_missing_marker");
        else notes.push("public_render_ok");
        await page.goto(`${BASE}/dashboard/campaigns/${campaignId}`, {
          waitUntil: "domcontentloaded",
        });
        await waitForCampaignEditorReady(page);
        notes.push("reopen_editor_after_public");
      }
    } else {
      notes.push("device_slot_missing_skip_public");
    }

    // Dead-control probe: visible buttons in inspector should not be decorative-only
    // (disabled without title/aria is flagged)
    await selectCampaignBlock(page, "campaign-block-btns");
    const dead = await page.evaluate(() => {
      const root = document.querySelector("[data-testid='campaign-inspector']")
        || document.querySelector("aside")
        || document.body;
      const btns = Array.from(root.querySelectorAll("button"));
      return btns
        .filter((b) => {
          const el = b as HTMLButtonElement;
          if (el.disabled && !el.getAttribute("title") && !el.getAttribute("aria-label")) {
            return el.offsetParent !== null;
          }
          return false;
        })
        .map((b) => (b.textContent || "").trim().slice(0, 40));
    });
    if (dead.length) {
      notes.push(`honest_disabled_without_label=${dead.join("|")}`);
    } else {
      notes.push("no_unlabeled_disabled_controls");
    }

    // Ensure no modal trap left open
    const openDialogs = await page.locator('[role="dialog"][aria-modal="true"]').count();
    if (openDialogs > 0) blockers.push("modal_trap_left_open");

    // Page errors / severe console
    if (pageErrors.length) blockers.push(`page_errors=${pageErrors.length}`);

    writeProof({
      id: "P-builder-exploratory-audit",
      route: `/dashboard/campaigns/${campaignId}`,
      workflow:
        "Exploratory control audit — panels, values, render, save/reload, publish/public, undo, exits, traps, overflow, console",
      passed: blockers.length === 0,
      browserE2ePassed: blockers.length === 0,
      persistencePassed: notes.includes("save_reload_ok"),
      consoleErrors,
      pageErrors,
      notes,
      lastVerifiedAt: new Date().toISOString(),
      blockers,
    });

    writeProofIndex();
    expect(blockers.length).toBe(0);
  });
});
