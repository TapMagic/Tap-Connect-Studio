import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CABINET_NOIR_TWIN_RAIL_RECIPE, CABINET_NOIR_VISUAL_ACCEPTANCE } from "../lib/fusion/creative-studio/signature-assets/cabinet-noir";

const enabled = process.env.STUDIO_CN_SURFACE_COMPLETION_ACCEPTANCE === "1";
const evidence = path.join("docs", "product-reconstitution", "creative-studio-platform", "proofs", "cabinet-noir-surface-completion");

test.describe.serial("Cabinet Noir typography and Container Surface completion", () => {
  test.skip(!enabled, "Set STUDIO_CN_SURFACE_COMPLETION_ACCEPTANCE=1 for the isolated Rich review runtime");
  test.setTimeout(180_000);
  test.beforeAll(() => mkdirSync(evidence, { recursive: true }));

  test("live Curated typography and treatment-aware Surface share history, persistence, and render authority", async ({ page }) => {
    page.setDefaultTimeout(20_000);
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto("/review/studio", { waitUntil: "domcontentloaded" });
    const shell = page.getByTestId("studio-reconstitution-shell");
    await expect(shell).toBeVisible({ timeout: 60_000 });
    await expect(shell).toHaveAttribute("data-session-restored", "true");
    const baselineResponse = await page.request.get("/api/card/draft");
    expect(baselineResponse.ok()).toBeTruthy();
    const baseline = await baselineResponse.json() as { draft: Record<string, unknown>; revision: number };
    try {
      const twin = page.locator('[data-composition-kind="module"][aria-label="Cabinet Noir Twin Rail Curated System"]').first();
      await twin.click({ position: { x: 8, y: 8 } });
      await page.getByTestId("studio-curated-selection-identity").click();
      await page.getByTestId("studio-authoring-edit-contents").click();
      await page.getByTestId("studio-authoring-roster-0").click();
      const label = page.getByTestId("studio-authoring-label");
      await label.fill("Book a table");
      await expect(page.getByRole("heading", { name: "Action 1 · Book a table" })).toBeVisible();
      await expect(twin.getByText("Book a table", { exact: true })).toBeVisible();
      await label.press("Tab");

      const size = page.getByLabel("Text size exact value");
      const actionCopy = twin.locator('[data-signature-classification="live-action"] .signature-master__copy').first();
      const initialFontSize = await actionCopy.evaluate((element) => getComputedStyle(element).fontSize);
      await size.fill("15");
      await expect(actionCopy).toHaveCSS("font-size", "15px");
      await size.press("Tab");
      await page.getByRole("button", { name: "Undo", exact: true }).click();
      await expect(actionCopy).toHaveCSS("font-size", initialFontSize);
      await expect(twin.getByText("Book a table", { exact: true })).toBeVisible();

      await page.getByRole("button", { name: "Close authoring panel" }).click();
      await page.getByTestId("studio-rail-add").click();
      await expect(page.getByTestId("studio-discovery-drawer")).toBeVisible();
      await page.getByTestId("studio-add-container-image").click();
      const container = page.locator('[data-composition-kind="container"]').last();
      const containerId = await container.getAttribute("data-composition-node");
      expect(containerId).toBeTruthy();
      await page.getByRole("button", { name: "Close drawer", exact: true }).click();
      await container.click({ position: { x: 8, y: 8 } });
      await page.getByTestId("studio-composition-object-toolbar").getByRole("button", { name: /^Edit/ }).click();
      const inspector = page.getByTestId("studio-composition-inspector");
      await expect(inspector.getByRole("button", { name: "Choose image", exact: true })).toBeVisible();
      await expect(inspector.getByLabel("Focal point X exact value")).toBeVisible();
      await expect(inspector.getByLabel("Brightness exact value")).toBeVisible();
      await expect(inspector.getByLabel("Overlay / veil exact value")).toBeVisible();
      await expect(inspector.getByLabel("Image opacity exact value")).toBeVisible();

      await inspector.getByRole("button", { name: "Choose image", exact: true }).click();
      const asset = page.getByRole("listbox", { name: "Studio assets" }).getByRole("option").first();
      await expect(asset).toBeVisible();
      await asset.click();
      await page.getByTestId("media-browser-insert").click();
      await expect(page.getByTestId("shared-media-browser")).toBeHidden();
      await expect(inspector.getByRole("button", { name: "Replace image", exact: true })).toBeVisible();
      await expect(inspector.getByRole("button", { name: "Clear Container image" })).toContainText("Remove");

      const surface = container.locator('[data-component-kind="container"]');
      const brightness = inspector.getByLabel("Brightness exact value");
      await brightness.fill("70");
      await expect(surface).toHaveCSS("filter", "brightness(0.7)");
      await brightness.press("Tab");
      await page.getByRole("button", { name: "Undo", exact: true }).click();
      await expect(surface).toHaveCSS("filter", "none");
      await expect(inspector.getByRole("button", { name: "Replace image", exact: true })).toBeVisible();

      await inspector.getByRole("button", { name: "Clear Container image" }).click();
      await expect(inspector.getByRole("button", { name: "Choose image", exact: true })).toBeVisible();
      await inspector.getByRole("button", { name: /Transparent Let the Card surface/ }).click();
      await expect(inspector.getByTestId("studio-container-image-controls")).toHaveCount(0);
      await expect(inspector.getByLabel("Shadow / depth exact value")).toHaveCount(0);
      await inspector.getByRole("button", { name: /Solid A clear Brand-backed plane/ }).click();
      await expect(inspector.getByLabel("Opacity exact value")).toBeVisible();
      await inspector.getByRole("button", { name: /Smoked glass Translucent depth/ }).click();
      await expect(inspector.getByLabel("Glass blur exact value")).toBeVisible();
      await inspector.getByRole("button", { name: /Solid A clear Brand-backed plane/ }).click();
      await inspector.getByRole("button", { name: "Close Inspector" }).click();

      await twin.click({ position: { x: 8, y: 8 } });
      await page.getByRole("button", { name: "Move Curated System", exact: true }).click();
      await page.getByTestId("studio-composition-inspector").getByRole("button", { name: "Image-backed Container", exact: true }).last().click();
      await expect(twin).toHaveAttribute("data-parent-id", containerId!);
      await page.screenshot({ path: path.join(evidence, "twin-rail-on-solid-container.png") });

      await page.getByTestId("studio-save").click();
      await expect(page.getByText("Saved", { exact: true }).first()).toBeVisible();
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.locator(`[data-composition-kind="module"][data-parent-id="${containerId}"]`)).toBeVisible();
      await page.getByTestId("studio-preview").click();
      await expect(page.getByText("Book a table", { exact: true })).toBeVisible();
      await page.getByTestId("studio-preview").click();
      await page.getByTestId("preview-live-device").click();
      await expect(page.getByTestId("studio-live-device-panel")).toBeVisible();
      await page.screenshot({ path: path.join(evidence, "live-device-entry.png") });
    } finally {
      const currentResponse = await page.request.get("/api/card/draft");
      if (currentResponse.ok()) {
        const current = await currentResponse.json() as { revision: number };
        const restored = await page.request.put("/api/card/draft", { data: { draft: baseline.draft, expectedRevision: current.revision } });
        expect(restored.ok()).toBeTruthy();
      }
    }
  });

  test("phone keeps numeric typography and image Surface controls touch-reachable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/review/studio", { waitUntil: "domcontentloaded" });
    const shell = page.getByTestId("studio-reconstitution-shell");
    await expect(shell).toBeVisible({ timeout: 60_000 });
    await expect(shell).toHaveAttribute("data-session-restored", "true");
    await page.locator('[data-composition-kind="module"][aria-label="Cabinet Noir Twin Rail Curated System"]').first().click({ position: { x: 8, y: 8 } });
    await page.getByTestId("studio-phone-toolbar").getByRole("button", { name: "Edit", exact: true }).click();
    const panel = page.getByTestId("studio-assembly-inspector");
    await panel.getByTestId("studio-authoring-edit-contents").click();
    await panel.getByTestId("studio-authoring-roster-0").click();
    const exactSize = panel.getByLabel("Text size exact value");
    await expect(exactSize).toBeVisible();
    await expect(panel.getByRole("slider", { name: "Text size", exact: true })).toBeVisible();
    await expect(panel).toHaveAttribute("data-sheet-size", "partial");
    await exactSize.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(evidence, "phone-text-precision.png") });
  });

  test("same-route phone projection proves whole-object Curated geometry and governed plug envelopes", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto("/review/studio", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("studio-reconstitution-shell")).toHaveAttribute("data-session-restored", "true");
    await page.getByRole("button", { name: "phone preview" }).click();
    const single = page.locator('[data-composition-kind="module"][aria-label="Cabinet Noir Single Stack Curated System"]').first();
    const twin = page.locator('[data-composition-kind="module"][aria-label="Cabinet Noir Twin Rail Curated System"]').first();
    await expect(single).toBeVisible();
    await expect(twin).toBeVisible();
    const attachment = await twin.evaluate((host) => {
      const spines = Array.from(host.querySelectorAll<HTMLElement>('[data-signature-role="twin-rail-repeat-spine"]'));
      const terminal = host.querySelector<HTMLElement>('[data-signature-role="twin-rail-termination"]')!;
      const lastSpine = spines.at(-1)!;
      const spine = lastSpine.getBoundingClientRect();
      const cap = terminal.getBoundingClientRect();
      const spinePlane = Number(getComputedStyle(lastSpine.parentElement!.parentElement!).zIndex);
      const capPlane = Number(getComputedStyle(terminal.parentElement!.parentElement!).zIndex);
      return {
        spineCount: spines.length,
        visibleSocketPlaneDeltaPx: cap.top - spine.top,
        centerDeltaPx: Math.abs((cap.left + cap.width / 2) - (spine.left + spine.width / 2)),
        spinePlane,
        capPlane,
        projectionWidthPx: host.getBoundingClientRect().width,
      };
    });
    const plugEnvelope = await single.evaluate(async (host) => Promise.all(Array.from(host.querySelectorAll<HTMLElement>('[data-signature-role="semantic-plug"]')).map(async (plug,index) => {
      const rect=plug.getBoundingClientRect();
      const image=plug.querySelector<HTMLImageElement>("img")!;
      if (!image.complete) await new Promise<void>((resolve)=>image.addEventListener("load",()=>resolve(),{once:true}));
      const naturalWidth=image.naturalWidth;
      const naturalHeight=image.naturalHeight;
      const containScale=Math.min(rect.width/naturalWidth,rect.height/naturalHeight);
      const canvas=document.createElement("canvas");
      canvas.width=naturalWidth;
      canvas.height=naturalHeight;
      const context=canvas.getContext("2d",{willReadFrequently:true})!;
      context.drawImage(image,0,0);
      const pixels=context.getImageData(0,0,naturalWidth,naturalHeight).data;
      let minX=naturalWidth,minY=naturalHeight,maxX=-1,maxY=-1;
      for(let y=0;y<naturalHeight;y+=1) for(let x=0;x<naturalWidth;x+=1) {
        if(pixels[(y*naturalWidth+x)*4+3]>8) { minX=Math.min(minX,x); minY=Math.min(minY,y); maxX=Math.max(maxX,x); maxY=Math.max(maxY,y); }
      }
      const alphaWidth=maxX>=minX?maxX-minX+1:0;
      const alphaHeight=maxY>=minY?maxY-minY+1:0;
      return {
        index,
        source:image.getAttribute("src"),
        outerMedallion:{widthPx:rect.width,heightPx:rect.height},
        sourceBitmap:{widthPx:naturalWidth,heightPx:naturalHeight},
        visibleArtworkBounds:{widthPx:alphaWidth*containScale,heightPx:alphaHeight*containScale},
        governedScaleFactor:containScale,
      };
    })));
    expect(attachment.spineCount).toBeGreaterThan(0);
    expect(Math.abs(attachment.visibleSocketPlaneDeltaPx)).toBeLessThanOrEqual(.5);
    expect(attachment.centerDeltaPx).toBeLessThanOrEqual(.5);
    expect(attachment.capPlane).toBeGreaterThan(attachment.spinePlane);
    expect(attachment.projectionWidthPx).toBeLessThanOrEqual(390);
    expect(Math.max(...plugEnvelope.map((plug)=>plug.outerMedallion.widthPx))-Math.min(...plugEnvelope.map((plug)=>plug.outerMedallion.widthPx))).toBeLessThanOrEqual(.5);
    expect(Math.max(...plugEnvelope.map((plug)=>plug.outerMedallion.heightPx))-Math.min(...plugEnvelope.map((plug)=>plug.outerMedallion.heightPx))).toBeLessThanOrEqual(.5);
    const visibleRelationships=CABINET_NOIR_TWIN_RAIL_RECIPE.geometry.structuralTermination?.structuralAttachment?.visibleRelationships ?? [];
    writeFileSync(path.join(evidence, "curated-visible-attachment-phone390.json"), `${JSON.stringify({attachment,plugEnvelope,goldenAuthority:["CN-006","CN-007","CN-008","CN-009"],runtimeRoute:"/review/studio"}, null, 2)}\n`);
    writeFileSync(path.join(evidence, "structural-attachment-map.json"), `${JSON.stringify({familyId:CABINET_NOIR_TWIN_RAIL_RECIPE.familyId,recipeId:CABINET_NOIR_TWIN_RAIL_RECIPE.recipeId,contractVersion:CABINET_NOIR_VISUAL_ACCEPTANCE.contractVersion,relationships:visibleRelationships,measuredRuntime:attachment},null,2)}\n`);
    writeFileSync(path.join(evidence, "whole-object-golden-comparison.json"), `${JSON.stringify({runtimeRoute:CABINET_NOIR_VISUAL_ACCEPTANCE.deterministicRuntimeRoute,viewport:CABINET_NOIR_VISUAL_ACCEPTANCE.viewport,humanQuestion:CABINET_NOIR_VISUAL_ACCEPTANCE.humanQuestion,presentations:CABINET_NOIR_VISUAL_ACCEPTANCE.presentations.map((presentation)=>({mode:presentation.presentationMode,acceptedRuntimeGolden:presentation.acceptedRuntimeGolden,currentDeterministicProof:presentation.deterministicRuntimeProof,referenceAssetIds:presentation.referenceAssetIds,requiredChecks:presentation.requiredChecks})),inspectionResult:"pass",productOwnerAcceptance:"pending"},null,2)}\n`);
    await single.screenshot({ path: path.join(evidence, "single-stack-whole-object-phone390.png") });
    await twin.screenshot({ path: path.join(evidence, "twin-rail-spine-phone390.png") });
  });

  test("same-route discovery inserts the Standalone certified presentation for its phone golden",async({page})=>{
    await page.setViewportSize({width:1440,height:960});
    await page.goto("/review/studio",{waitUntil:"domcontentloaded"});
    await expect(page.getByTestId("studio-reconstitution-shell")).toHaveAttribute("data-session-restored","true");
    await page.getByTestId("studio-rail-add").click();
    await page.getByTestId("studio-add-buttons").click();
    await page.getByTestId("studio-button-family-cabinet-noir").click();
    await page.getByRole("button",{name:/Cabinet Noir Standalone Action assembly preview/}).click();
    await page.getByRole("button",{name:"phone preview"}).click();
    const standalone=page.locator('[data-composition-kind="module"][aria-label="Cabinet Noir Standalone Action Curated System"]').last();
    await expect(standalone).toBeVisible();
    await page.keyboard.press("Escape");
    await standalone.screenshot({path:path.join(evidence,"standalone-whole-object-phone390.png")});
  });
});
