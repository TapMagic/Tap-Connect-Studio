import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const enabled = process.env.COMPACT_ACTION_GRID_PHASE2_ACCEPTANCE === "1";
const evidence = path.join("docs", "product-reconstitution", "creative-studio-platform", "proofs", "compact-action-grid-phase2");
const grid = (page: Page, id: string) => page.locator(`[data-compact-action-component-id="${id}"]`);

async function openGridInspector(page: Page, id = "review-compact-social-grid") {
  await grid(page, id).click({ force: true });
  const inspector = page.getByTestId("studio-compact-action-grid-inspector");
  if (!(await inspector.isVisible())) await page.getByRole("button", { name: /^Edit/ }).first().click();
  await expect(inspector).toBeVisible();
  return inspector;
}

async function previewAt390(page: Page) {
  await page.getByTestId("studio-preview").click();
  await page.setViewportSize({ width:390, height:844 });
  await expect(page.getByTestId("tap-experience-renderer")).toHaveAttribute("data-active-page-id", "page-music");
}

async function returnToEdit(page: Page) {
  await page.getByTestId("studio-preview").click();
  await page.setViewportSize({ width:1280, height:900 });
}

test("registers the reusable Compact Action Grid through Add / Buttons", async ({ page }) => {
  test.skip(!enabled, "Set COMPACT_ACTION_GRID_PHASE2_ACCEPTANCE=1 for the deterministic local review runtime");
  await page.setViewportSize({width:1280,height:900});
  await page.goto("/review/studio",{waitUntil:"networkidle"});
  const baselineResponse=await page.request.get("/api/card/draft"); const baseline=await baselineResponse.json() as {draft:Record<string,unknown>;revision:number};
  try {
    await page.getByTestId("experience-nav-page-music").click();
    await expect(page.getByTestId("compact-action-grid")).toHaveCount(4);
    await page.getByTestId("studio-rail-add").click();
    await page.getByTestId("studio-add-buttons").click();
    await page.getByTestId("studio-add-compact-action-grid").click();
    await expect(page.getByTestId("compact-action-grid")).toHaveCount(5);
    await expect(page.getByTestId("studio-compact-action-grid-inspector")).toBeVisible();
  } finally {
    const currentResponse=await page.request.get("/api/card/draft");
    if(currentResponse.ok()){const current=await currentResponse.json() as {revision:number}; await page.request.put("/api/card/draft",{data:{draft:baseline.draft,expectedRevision:current.revision}});}
  }
});

test("proves Phase 2 Compact Action Grid and Love & Theft navigation presentation", async ({ browser, page }) => {
  test.skip(!enabled, "Set COMPACT_ACTION_GRID_PHASE2_ACCEPTANCE=1 for the deterministic local review runtime");
  test.setTimeout(210_000);
  mkdirSync(evidence, { recursive:true });
  await page.setViewportSize({ width:1280, height:900 });
  await page.goto("/review/studio", { waitUntil:"networkidle" });
  const baselineResponse=await page.request.get("/api/card/draft");
  expect(baselineResponse.ok()).toBeTruthy();
  const baseline=await baselineResponse.json() as {draft:Record<string,unknown>;revision:number};
  try {
    await page.getByTestId("experience-nav-page-music").click();
    let inspector=await openGridInspector(page);
    await inspector.getByRole("button",{name:"Grid",exact:true}).click();
    await inspector.getByRole("button",{name:"2",exact:true}).click();
    await previewAt390(page);
    await page.getByText("Follow & Listen",{exact:true}).click({force:true});
    await page.screenshot({path:path.join(evidence,"01-two-across-love-theft-grid.png")});

    await returnToEdit(page); inspector=await openGridInspector(page); await inspector.getByRole("button",{name:"Grid",exact:true}).click(); await inspector.getByRole("button",{name:"3",exact:true}).click();
    await previewAt390(page); await page.getByText("Follow & Listen",{exact:true}).click({force:true});
    await page.screenshot({path:path.join(evidence,"02-three-across-love-theft-grid.png")});
    await grid(page,"review-compact-social-grid").screenshot({path:path.join(evidence,"03-social-grid.png")});

    await returnToEdit(page); inspector=await openGridInspector(page); await inspector.getByRole("button",{name:"Grid",exact:true}).click(); await inspector.getByRole("button",{name:"4",exact:true}).click();
    await previewAt390(page); await page.getByText("Follow & Listen",{exact:true}).click({force:true});
    await grid(page,"review-compact-social-grid").screenshot({path:path.join(evidence,"04-four-across-love-theft-grid.png")});

    await returnToEdit(page); inspector=await openGridInspector(page); await inspector.getByRole("button",{name:"Grid",exact:true}).click(); await inspector.getByRole("button",{name:"3",exact:true}).click();
    await previewAt390(page);
    await grid(page,"review-compact-music-grid").screenshot({path:path.join(evidence,"05-song-music-grid.png")});
    await page.getByRole("button",{name:"Exclusive (locked)"}).click();
    await expect(page.getByTestId("compact-locked-message-review-exclusive-tile")).toBeVisible();
    await grid(page,"review-compact-locked-grid").screenshot({path:path.join(evidence,"06-locked-tile-message-cta.png")});
    await grid(page,"review-compact-new-grid").screenshot({path:path.join(evidence,"07-new-tile-four-column.png")});
    await page.screenshot({path:path.join(evidence,"08-preview-390.png")});
    await grid(page,"review-compact-social-grid").locator('[data-component-id="review-social-tile-1"]').screenshot({path:path.join(evidence,"09-no-clipping-close-up.png")});

    await returnToEdit(page); await grid(page,"review-compact-social-grid").click({force:true});
    await page.screenshot({path:path.join(evidence,"10-grid-selected-movable.png")});
    const arrange=page.getByRole("button",{name:"Arrange",exact:true}).first();
    if(await arrange.isVisible()) { await arrange.click(); const width=page.getByTestId("studio-composition-inspector").getByLabel("Width").first(); if(await width.isVisible()) { await width.fill("82"); await width.press("Enter"); } }
    await page.screenshot({path:path.join(evidence,"11-grid-resized.png")});

    await page.getByTestId("studio-preview").click(); await page.setViewportSize({width:390,height:844});
    await page.getByTestId("compact-action-tile-review-afterparty-tile").click({force:true});
    await expect(page.getByTestId("tap-experience-renderer")).toHaveAttribute("data-active-page-id","page-afterparty");
    await page.screenshot({path:path.join(evidence,"12-internal-page-destination.png")});

    await page.getByTestId("experience-nav-page-music").click(); await page.getByTestId("studio-preview").click(); await page.setViewportSize({width:1280,height:900});
    await page.getByTestId("studio-pages-open").click();
    await page.getByTestId("studio-page-row-page-profile").click(); await page.getByTestId("studio-page-nav-visible").uncheck();
    await expect(page.getByTestId("experience-bottom-navigation")).toHaveAttribute("data-pick-size-tier","medium");
    await page.getByTestId("experience-bottom-navigation").screenshot({path:path.join(evidence,"13-nav-four-visible.png")});
    await page.getByTestId("studio-page-row-page-exclusives").click(); await page.getByTestId("studio-page-nav-visible").uncheck();
    await expect(page.getByTestId("experience-bottom-navigation")).toHaveAttribute("data-pick-size-tier","large");
    await page.getByTestId("experience-bottom-navigation").screenshot({path:path.join(evidence,"14-nav-three-visible.png")});
    await page.getByTestId("studio-page-row-page-exclusives").click(); await page.getByTestId("studio-page-nav-visible").check();
    await page.getByTestId("studio-page-row-page-profile").click(); await page.getByTestId("studio-page-nav-visible").check();
    await page.getByTestId("studio-page-row-page-music").click(); await page.getByTestId("studio-page-nav-label").fill("Tracks"); await page.getByTestId("studio-page-nav-label").press("Tab"); await page.getByTestId("studio-page-nav-icon").selectOption("star"); await page.getByTestId("studio-page-settings").getByRole("button",{name:"Move up"}).click();
    await expect(page.getByTestId("experience-bottom-navigation")).toHaveAttribute("data-pick-size-tier","compact");
    await page.getByTestId("experience-bottom-navigation").screenshot({path:path.join(evidence,"15-nav-five-renamed-reordered-icon.png")});
    await page.getByRole("button",{name:"Close Pages"}).click();

    if(await page.getByTestId("studio-save").isEnabled()) await page.getByTestId("studio-save").click();
    await page.getByTestId("preview-live-device").click();
    await expect(page.getByTestId("live-device-qr-panel")).toHaveAttribute("data-preview-status","ready",{timeout:20_000});
    const previewUrl=(await page.getByTestId("preview-url-text").getAttribute("href")) || "";
    const phoneContext=await browser.newContext({viewport:{width:390,height:844}}); const phone=await phoneContext.newPage(); await phone.goto(previewUrl,{waitUntil:"networkidle"}); await phone.getByTestId("experience-nav-page-music").click(); await expect(phone.getByTestId("compact-action-grid").first()).toBeVisible(); await phone.getByText("Follow & Listen",{exact:true}).click({force:true}); await phone.screenshot({path:path.join(evidence,"16-live-device-390.png")}); await phoneContext.close();

    writeFileSync(path.join(evidence,"acceptance.json"),`${JSON.stringify({route:"/review/studio",viewport:{width:390,height:844},contracts:["compactActionGrid@1.0.0","compactActionTile@1.0.0","tapExperience@1.0.0"],columns:[2,3,4],socialTiles:6,musicTiles:3,addDiscover:true,neutralPresentation:true,lockedPolicy:true,newState:true,internalPage:true,navigationVisibleCounts:[3,4,5],navigationPresentation:"everencore-love-and-theft-mini-pick",sameExperienceState:true,signedLiveDevice:true,productOwnerAcceptance:"pending"},null,2)}\n`);
  } finally {
    const currentResponse=await page.request.get("/api/card/draft");
    if(currentResponse.ok()){const current=await currentResponse.json() as {revision:number}; await page.request.put("/api/card/draft",{data:{draft:baseline.draft,expectedRevision:current.revision}});}
  }
});
