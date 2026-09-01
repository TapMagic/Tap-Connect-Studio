import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const enabled=process.env.STUDIO_SLICE1_CORRECTION_ACCEPTANCE === "1";
const evidence=path.join("docs","product-reconstitution","creative-studio-platform","proofs","studio-slice1-correction-gate");

test("proves the rejected Slice 1 runtime through the deterministic Product Owner route",async({page})=>{
  test.skip(!enabled,"Set STUDIO_SLICE1_CORRECTION_ACCEPTANCE=1 for local acceptance");
  test.setTimeout(120_000);
  page.setDefaultTimeout(7_000);
  mkdirSync(evidence,{recursive:true});
  await page.setViewportSize({width:1440,height:960});
  await page.goto("/review/studio",{waitUntil:"domcontentloaded"});
  await expect(page).toHaveURL(/\/dashboard\/card\/edit$/);
  await expect(page.getByTestId("studio-reconstitution-shell")).toHaveAttribute("data-session-restored","true");
  await expect(page.getByText("The Monkey Cage · Slice 1 Review",{exact:true}).first()).toBeVisible();

  const modules=page.locator('[data-composition-kind="module"]');
  await expect(modules).toHaveCount(6);
  await expect(page.locator('[data-composition-node="review-text"]')).toBeVisible();
  await expect(page.locator('[data-composition-node="review-standard-button"]')).toBeVisible();
  await expect(page.locator('[data-composition-node="review-divider"]')).toBeVisible();
  await expect(page.locator('[data-composition-node="review-container"]')).toBeVisible();
  await expect(page.locator('[data-composition-node="review-module-single-stack"]')).toBeVisible();
  await expect(page.locator('[data-composition-node="review-module-twin-rail"]')).toBeVisible();

  const divider=page.locator('[data-composition-node="review-divider"]');
  await divider.click();
  await page.getByRole("button",{name:"Edit · Champagne glow Divider",exact:true}).click();
  const inspector=page.getByTestId("studio-composition-inspector");
  await inspector.getByRole("button",{name:"double",exact:true}).click();
  await inspector.getByRole("button",{name:"metallic",exact:true}).click();
  const beforeSpacing=inspector.getByRole("spinbutton",{name:/Space before exact value/i});
  const afterSpacing=inspector.getByRole("spinbutton",{name:/Space after exact value/i});
  await beforeSpacing.fill("2");
  await beforeSpacing.press("Tab");
  await afterSpacing.fill("2");
  await afterSpacing.press("Tab");
  await page.screenshot({path:path.join(evidence,"divider-metallic-dense-flow.png")});
  await inspector.getByRole("button",{name:"Close Inspector",exact:true}).click();

  await divider.click();
  const handle=page.getByTestId("studio-canvas-handle-review-divider");
  const drop=page.getByTestId("studio-canvas-drop-card-1");
  const before=await divider.getAttribute("data-sibling-order");
  const handleBox=await handle.boundingBox();
  expect(handleBox).toBeTruthy();
  await page.mouse.move(handleBox!.x+handleBox!.width/2,handleBox!.y+handleBox!.height/2);
  await page.mouse.down();
  await page.mouse.move(handleBox!.x+handleBox!.width/2,handleBox!.y-24,{steps:3});
  await expect(drop).toHaveAttribute("data-drop-valid","true");
  for(let attempt=0;attempt<6 && await drop.getAttribute("data-drop-active")!=="true";attempt+=1) {
    const dropBox=await drop.boundingBox();
    expect(dropBox).toBeTruthy();
    await page.mouse.move(dropBox!.x+dropBox!.width/2,dropBox!.y+dropBox!.height/2,{steps:attempt===0?8:2});
  }
  await expect(drop).toHaveAttribute("data-drop-active","true");
  await expect(divider).not.toHaveCSS("transform","none");
  await page.screenshot({path:path.join(evidence,"direct-flow-drag.png")});
  await page.mouse.up();
  await expect(divider).not.toHaveAttribute("data-sibling-order",before!);

  const twin=page.locator('[data-composition-node="review-module-twin-rail"]');
  await twin.click({position:{x:8,y:8}});
  await page.getByRole("button",{name:"Move Curated System",exact:true}).click();
  await page.getByTestId("studio-composition-inspector").getByRole("button",{name:"Smoked Glass Container",exact:true}).click();
  await expect(twin).toHaveAttribute("data-parent-id","review-container");
  await page.screenshot({path:path.join(evidence,"twin-container-reparent.png")});

  const save=page.getByTestId("studio-save");
  await save.click();
  await expect(save).toBeDisabled();
  await page.reload({waitUntil:"domcontentloaded"});
  await expect(page.locator('[data-composition-node="review-module-twin-rail"]')).toHaveAttribute("data-parent-id","review-container");
  await page.getByTestId("studio-preview").click();
  await expect(page.getByText("Call the studio",{exact:true}).first()).toBeVisible();
  await page.screenshot({path:path.join(evidence,"preview-parity.png")});

  writeFileSync(path.join(evidence,"acceptance.json"),JSON.stringify({runtimeRoute:"/review/studio",fixture:"phase-1-slice-1-curated-golden-v2",ordinaryModules:["Text","Standard Button","Divider","Container"],curatedPresentations:["Cabinet Noir Single Stack","Cabinet Noir Twin Rail"],canonicalFlow:true,oneDropHistoryAction:true,productOwnerAcceptance:"pending"},null,2)+"\n");
});
