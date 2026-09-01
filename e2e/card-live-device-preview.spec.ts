import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { updateButtonLabel } from "@/lib/fusion/creative-studio/button-composition";
import { createFlowContainerNode } from "@/lib/fusion/card/composition-parent-authority";
import { applyStudioSurfaceTreatment } from "@/lib/fusion/creative-studio/platform/surface-capability";

const enabled = process.env.LIVE_DEVICE_RECONSTITUTION_ACCEPTANCE === "1";
const evidence = path.join("tmp", "live-device-preview");

type CompositionNode = {
  primitive?: string;
  compositionKind?: string;
  props?: Record<string, unknown>;
  moduleComposition?: {
    nodes?: CompositionNode[];
    signatureAssembly?: { input?: { actions?: Array<{ id?: string; label?: string; accessibilityLabel?: string }> } };
  };
};

function replaceCuratedIdentitySources(value: unknown, url: string, mediaAssetId: string): void {
  if (Array.isArray(value)) {
    value.forEach((entry) => replaceCuratedIdentitySources(entry, url, mediaAssetId));
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(record, "identityContentUrl")) {
    record.identityContentUrl = url;
    delete record.identityResourceVisual;
  }
  if (record.identityContent && typeof record.identityContent === "object") {
    const identity = record.identityContent as Record<string, unknown>;
    identity.src = url;
    identity.mediaAssetId = mediaAssetId;
    delete identity.visual;
  }
  Object.values(record).forEach((entry) => replaceCuratedIdentitySources(entry, url, mediaAssetId));
}

function writeCompiledActionLabel(nodes: CompositionNode[] | undefined, actionId: string, label: string): void {
  for (const node of nodes || []) {
    if (node.props?.signatureActionId === actionId) {
      node.props = updateButtonLabel(node.props, label, "live-device-proof");
    }
    writeCompiledActionLabel(node.moduleComposition?.nodes, actionId, label);
  }
}

function writeFirstAuthoredLabel(nodes: CompositionNode[] | undefined, label: string): boolean {
  for (const node of nodes || []) {
    const action = node.moduleComposition?.signatureAssembly?.input?.actions?.[0];
    if (action) {
      action.label = label;
      action.accessibilityLabel = label;
      if (action.id) writeCompiledActionLabel(node.moduleComposition?.nodes, action.id, label);
      return true;
    }
    if (node.compositionKind === "module" && node.primitive === "button") {
      node.props = updateButtonLabel(node.props || {}, label, "live-device-proof");
      return true;
    }
    if (writeFirstAuthoredLabel(node.moduleComposition?.nodes, label)) return true;
  }
  return false;
}

test("hands the canonical Rich draft to a fresh phone context through one stable LAN QR", async ({ browser, page }) => {
  test.skip(!enabled, "Set LIVE_DEVICE_RECONSTITUTION_ACCEPTANCE=1 for the isolated Rich review runtime");
  test.setTimeout(120_000);
  mkdirSync(evidence, { recursive: true });

  await page.goto("/review/studio", { waitUntil: "networkidle" });
  await expect(page.getByTestId("studio-reconstitution-shell")).toBeVisible();
  await expect(page.getByText("The Monkey Cage · Slice 1 Review", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "phone preview", exact: true }).click();
  await expect(page.locator('[data-parent-authority="flow-v1"]')).toBeVisible();
  const studioGeometry = await page.evaluate(() => {
    const bounds = (selector: string) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { x: rect.x, width: rect.width, height: rect.height };
    };
    const canvas = document.querySelector('[data-testid="card-preview-canvas"]');
    return {
      viewport: bounds('[data-testid="card-preview-phone"]'),
      card: bounds(".tcc"),
      composition: bounds('[data-testid="creative-composition-canvas"]'),
      scroll: canvas ? { clientHeight: canvas.clientHeight, scrollHeight: canvas.scrollHeight } : null,
    };
  });
  expect(studioGeometry.viewport?.width).toBeGreaterThanOrEqual(388);
  expect(Math.abs((studioGeometry.card?.width || 0) - (studioGeometry.viewport?.width || 0))).toBeLessThanOrEqual(2);
  expect(Math.abs((studioGeometry.composition?.width || 0) - (studioGeometry.card?.width || 0))).toBeLessThanOrEqual(1);
  expect(studioGeometry.scroll?.scrollHeight || 0).toBeGreaterThan(studioGeometry.scroll?.clientHeight || 0);
  await page.screenshot({ path: path.join(evidence, "01-studio-phone-full-width.png"), fullPage: true });

  await page.getByTestId("preview-live-device").click();
  const panel = page.getByTestId("live-device-qr-panel");
  await expect(panel).toHaveAttribute("data-preview-status", "ready", { timeout: 15_000 });
  await expect(panel).toHaveAttribute("data-candidate-kind", "lan_candidate");
  await expect(panel).toHaveAttribute("data-physically-verified", "false");
  await expect(page.getByTestId("preview-qr-image")).toBeVisible();
  await expect(page.getByTestId("lan-preview-reachability")).toHaveAttribute("data-status", "reachable", { timeout: 10_000 });
  const previewUrl = (await page.getByTestId("preview-url-text").getAttribute("href")) || "";
  expect(previewUrl).toMatch(/^http:\/\/(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)\d+\.\d+:3050\/preview\/live\/[A-Za-z0-9_.-]+\?debug=1$/);
  expect(previewUrl).not.toMatch(/localhost|127\.0\.0\.1/);
  await page.screenshot({ path: path.join(evidence, "02-live-device-qr.png"), fullPage: true });

  await page.getByRole("button", { name: "Close Live Device Preview" }).click();
  await expect(page.getByTestId("studio-live-device-panel")).toBeHidden();
  await page.getByTestId("preview-live-device").click();
  await expect(panel).toHaveAttribute("data-preview-status", "ready");
  await expect(page.getByTestId("preview-url-text")).toHaveAttribute("href", previewUrl);

  const phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  expect(await phoneContext.cookies()).toEqual([]);
  const phone = await phoneContext.newPage();
  const phoneRuntimeErrors: string[] = [];
  phone.on("pageerror", (error) => phoneRuntimeErrors.push(error.message));
  const previewAssetResponses: Array<{ url: string; status: number; authority: string | null }> = [];
  phone.on("response", async (response) => {
    if (!response.url().includes("/api/preview/card/asset/")) return;
    previewAssetResponses.push({
      url: response.url(),
      status: response.status(),
      authority: response.headers()["x-tapconnect-preview-resource"] || null,
    });
  });
  await phone.goto(previewUrl, { waitUntil: "networkidle" });
  await expect(phone.getByTestId("preview-live-page")).toBeVisible();
  await expect(phone.getByTestId("preview-live-page")).toHaveAttribute("data-preview-mode", "follow");
  await expect(phone.getByTestId("preview-card-composition-host").locator('[data-parent-authority="flow-v1"]')).toBeVisible();
  await expect(phone.locator('[data-signature-family="cabinet-noir"]').first()).toBeVisible();
  await expect(phone.getByRole("img", { name: "The Monkey Cage identity" })).toHaveCount(2);
  const readPlugProjection = (root: typeof page) => root.locator('[data-signature-role="semantic-plug"]').evaluateAll((elements) => elements.map((element) => {
    const image = element.querySelector<HTMLImageElement>("img.signature-master__asset");
    const depth = element.querySelector<HTMLElement>(".signature-master__depth");
    const depthStyle = depth ? getComputedStyle(depth) : null;
    return {
      actionId: element.getAttribute("data-signature-action-id"),
      assetId: element.getAttribute("data-signature-asset-id"),
      sourceSha: element.getAttribute("data-signature-source-sha"),
      componentId: element.getAttribute("data-signature-component-id"),
      rendererVersion: element.getAttribute("data-signature-renderer-version"),
      depth: element.getAttribute("data-signature-depth"),
      depthRenderer: depth?.getAttribute("data-signature-depth-renderer") || null,
      depthComputed: depthStyle ? { display: depthStyle.display, zIndex: depthStyle.zIndex, filter: depthStyle.filter, boxShadow: depthStyle.boxShadow } : null,
      legacyPseudoContent: getComputedStyle(element, "::before").content,
      appearance: element.getAttribute("data-signature-appearance-options"),
      rendererValues: element.getAttribute("data-signature-appearance-renderer-values"),
      plugFace: element.getAttribute("data-signature-plug-face"),
      source: image?.getAttribute("src") || null,
      loaded: Boolean(image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0),
    };
  }));
  const studioPlugProjection = await readPlugProjection(page);
  const phonePlugProjection = await readPlugProjection(phone);
  expect(phonePlugProjection).toEqual(studioPlugProjection);
  expect(phonePlugProjection.length).toBeGreaterThan(0);
  expect(phonePlugProjection.every((plug) => plug.loaded
    && Boolean(plug.actionId)
    && Boolean(plug.sourceSha)
    && plug.rendererVersion === "signature-master-bridge@2.0.0"
    && plug.depth === "raised-contact"
    && plug.depthRenderer === "portable-layer-v1"
    && plug.depthComputed?.display === "block"
    && plug.depthComputed?.zIndex === "0"
    && plug.depthComputed?.filter === "none"
    && plug.legacyPseudoContent === "none"
    && Boolean(plug.plugFace)
    && Boolean(plug.appearance)
    && Boolean(plug.rendererValues)
    && Boolean(plug.source?.includes("?tcv=")))).toBe(true);
  await expect(phone.getByTestId("live-device-debug-evidence")).toContainText(`revision ${await phone.getByTestId("preview-live-page").getAttribute("data-preview-revision")}`);
  await expect(phone.getByTestId("live-device-debug-evidence")).toContainText("signed-hmac-sha256.v1");
  await expect(phone.getByTestId("live-device-debug-evidence")).toContainText("Projection fingerprint:");
  await expect(phone.getByTestId("live-device-debug-plug")).toHaveCount(phonePlugProjection.length);
  const visualResourceProof = await phone.evaluate(() => {
    const images = Array.from(document.images).map((image) => ({
      src: image.currentSrc || image.src,
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    }));
    const backgrounds = Array.from(document.querySelectorAll<HTMLElement>("*"))
      .map((element) => getComputedStyle(element).backgroundImage)
      .filter((value) => value && value !== "none");
    return { images, backgrounds };
  });
  const signedImages = visualResourceProof.images.filter((image) => image.src.includes("/api/preview/card/asset/"));
  expect(signedImages.every((image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0)).toBe(true);
  expect(visualResourceProof.images.some((image) => image.src.includes("/api/media/local"))).toBe(false);
  expect(visualResourceProof.backgrounds.some((background) => background.includes("/api/media/local"))).toBe(false);
  expect(previewAssetResponses.every((response) => response.status === 200 && response.authority === "resolved")).toBe(true);
  await expect(phone.getByTestId("preview-phone-refresh")).toBeVisible();
  expect(await phoneContext.cookies()).toEqual([]);
  const phoneGeometry = await phone.evaluate(() => {
    const bounds = (selector: string) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { x: rect.x, width: rect.width, height: rect.height };
    };
    return {
      viewport: bounds('[data-testid="live-device-card-viewport"]'),
      card: bounds(".tcc"),
      composition: bounds('[data-testid="creative-composition-canvas"]'),
      scroll: { clientHeight: document.documentElement.clientHeight, scrollHeight: document.documentElement.scrollHeight },
    };
  });
  expect(phoneGeometry.viewport?.width).toBe(390);
  expect(phoneGeometry.card?.width).toBe(390);
  expect(phoneGeometry.composition?.width).toBe(390);
  expect(phoneGeometry.scroll.scrollHeight).toBeGreaterThan(phoneGeometry.scroll.clientHeight);
  await phone.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
  });
  expect(await phone.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await phone.screenshot({ path: path.join(evidence, "03-phone-runtime-full-width.png"), fullPage: true });

  const baselineResponse = await page.request.get("/api/card/draft");
  expect(baselineResponse.ok()).toBeTruthy();
  const baseline = await baselineResponse.json() as { draft: Record<string, unknown>; revision: number };
  const marker = `Live Device follow proof ${Date.now()}`;
  const updated = structuredClone(baseline.draft) as Record<string, unknown> & {
    rootComposition?: { nodes?: CompositionNode[] };
  };
  expect(writeFirstAuthoredLabel(updated.rootComposition?.nodes, marker)).toBe(true);

  try {
    const save = await page.request.put("/api/card/draft", { data: { draft: updated, expectedRevision: baseline.revision } });
    expect(save.ok()).toBeTruthy();
    await Promise.all([
      phone.waitForNavigation({ waitUntil: "networkidle" }),
      phone.getByTestId("preview-phone-refresh").click(),
    ]);
    await expect(phone.getByTestId("preview-live-page")).toHaveAttribute("data-preview-revision", String(baseline.revision + 1));
    expect(phone.url()).toBe(previewUrl);
  } finally {
    const currentResponse = await page.request.get("/api/card/draft");
    if (currentResponse.ok()) {
      const current = await currentResponse.json() as { revision: number };
      const restore = await page.request.put("/api/card/draft", { data: { draft: baseline.draft, expectedRevision: current.revision } });
      expect(restore.ok()).toBeTruthy();
    }

    await page.getByTestId("preview-regenerate").click();
    await expect(page.getByTestId("preview-url-text")).not.toHaveAttribute("href", previewUrl);
    const replacementUrl = (await page.getByTestId("preview-url-text").getAttribute("href")) || "";
    expect(replacementUrl).toContain("/preview/live/");
    await phone.goto(previewUrl, { waitUntil: "networkidle" });
    await expect(phone.getByRole("heading", { name: "This preview was revoked" })).toBeVisible();
    await phone.goto(replacementUrl, { waitUntil: "networkidle" });
    await expect(phone.getByTestId("preview-live-page")).toBeVisible();
    expect(phoneRuntimeErrors).toEqual([]);
    await phoneContext.close();
  }
});

test("delivers committed identity, Image Module, image Container, and Brand visuals to a cookie-free phone", async ({ browser, page }) => {
  test.skip(!enabled, "Set LIVE_DEVICE_RECONSTITUTION_ACCEPTANCE=1 for the isolated Rich review runtime");
  test.setTimeout(180_000);
  mkdirSync(evidence, { recursive: true });

  await page.goto("/review/studio", { waitUntil: "networkidle" });
  await expect(page.getByTestId("studio-reconstitution-shell")).toBeVisible();
  const baselineResponse = await page.request.get("/api/card/draft");
  expect(baselineResponse.ok()).toBeTruthy();
  const baseline = await baselineResponse.json() as { draft: Record<string, unknown>; revision: number };
  const mediaResponse = await page.request.get("/api/media?limit=100");
  expect(mediaResponse.ok()).toBeTruthy();
  const media = await mediaResponse.json() as { assets: Array<{ id: string; url: string; mimeType: string }> };
  const localAssets = media.assets.filter((asset) => asset.url.includes("/api/media/local?key="));
  expect(localAssets.length).toBeGreaterThanOrEqual(1);
  const transparentCandidate = localAssets.find((asset) => asset.mimeType === "image/png") || localAssets[0]!;
  const opaqueCandidate = localAssets.find((asset) => /image\/(?:jpe?g|webp)/.test(asset.mimeType)) || localAssets.at(1) || transparentCandidate;

  const proof = structuredClone(baseline.draft) as Record<string, unknown> & {
    rootComposition?: { nodes?: Array<Record<string, unknown>>; parentAuthority?: Record<string, unknown> };
  };
  expect(proof.rootComposition).toBeTruthy();
  const root = proof.rootComposition!;
  root.parentAuthority ||= { version: 1, layout: "flow", cardGapPx: 16 };
  root.nodes ||= [];
  const nextOrder = root.nodes.reduce((highest, node) => Math.max(highest, Number(node.siblingOrder ?? -1)), -1) + 1;
  const imageContainer = createFlowContainerNode("Live Device Image-backed Container", "image") as unknown as Record<string, unknown>;
  imageContainer.id = "live-device-proof-image-container";
  imageContainer.siblingOrder = nextOrder + 1;
  imageContainer.zIndex = nextOrder + 2;
  imageContainer.height = 0.32;
  imageContainer.props = applyStudioSurfaceTreatment(
    imageContainer.props as Record<string, unknown>,
    "image",
    { mediaUrl: opaqueCandidate.url, mediaAssetId: opaqueCandidate.id }
  );
  root.nodes.push(
    {
      id: "live-device-proof-image-module",
      name: "Live Device Image Module",
      primitive: "image",
      compositionKind: "module",
      parentId: null,
      siblingOrder: nextOrder,
      x: 0,
      y: 0,
      width: 1,
      height: 0.45,
      zIndex: nextOrder + 1,
      visible: true,
      props: { src: transparentCandidate.url, mediaSrc: transparentCandidate.url, mediaAssetId: transparentCandidate.id, alt: "Live Device image module proof", fit: "contain", opacity: 1 },
    },
    imageContainer
  );
  proof.headerLogoUrl = transparentCandidate.url;
  proof.showHeaderLogo = true;
  replaceCuratedIdentitySources(proof, transparentCandidate.url, transparentCandidate.id);

  try {
    const save = await page.request.put("/api/card/draft", { data: { draft: proof, expectedRevision: baseline.revision } });
    expect(save.ok()).toBeTruthy();
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("button", { name: "phone preview", exact: true }).click();
    const studioImageModule = page.getByRole("img", { name: "Live Device image module proof", exact: true });
    await expect(studioImageModule).toBeVisible();
    expect(await studioImageModule.evaluate((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0 && image.src.includes("/api/media/local"))).toBe(true);
    const studioContainer = page.locator('[data-composition-node="live-device-proof-image-container"] [data-component-kind="container"]');
    await expect(studioContainer).toBeVisible();
    expect(await studioContainer.evaluate((element) => getComputedStyle(element).backgroundImage)).toContain("/api/media/local");
    const studioCuratedIdentity = page.locator('[data-signature-role="identity-header"] [data-semantic-mask-viewport] img');
    await expect(studioCuratedIdentity).toHaveCount(2);
    expect(await studioCuratedIdentity.evaluateAll((images) => images.every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0 && image.src.includes("/api/media/local")))).toBe(true);
    await page.screenshot({ path: path.join(evidence, "04-studio-shared-visual-resources-top.png"), fullPage: true });
    await page.getByTestId("card-preview-canvas").evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await page.screenshot({ path: path.join(evidence, "05-studio-shared-visual-resources-bottom.png"), fullPage: true });
    await page.getByTestId("preview-live-device").click();
    const panel = page.getByTestId("live-device-qr-panel");
    await expect(panel).toHaveAttribute("data-preview-status", "ready", { timeout: 15_000 });
    const previewUrl = (await page.getByTestId("preview-url-text").getAttribute("href")) || "";
    expect(previewUrl).toContain("/preview/live/");

    const phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const phone = await phoneContext.newPage();
    const resourceResponses: Array<{ status: number; authority: string | null }> = [];
    phone.on("response", (response) => {
      if (response.url().includes("/api/preview/card/asset/")) resourceResponses.push({ status: response.status(), authority: response.headers()["x-tapconnect-preview-resource"] || null });
    });
    await phone.goto(previewUrl, { waitUntil: "networkidle" });
    expect(await phoneContext.cookies()).toEqual([]);
    const imageModule = phone.getByRole("img", { name: "Live Device image module proof", exact: true });
    await expect(imageModule).toBeVisible();
    await expect.poll(() => imageModule.evaluate((image) => image instanceof HTMLImageElement ? image.naturalWidth : 0)).toBeGreaterThan(0);
    const runtimeContainer = phone.locator('[data-composition-node="live-device-proof-image-container"] [data-component-kind="container"]');
    await expect(runtimeContainer).toBeVisible();
    const containerBackground = await runtimeContainer.evaluate((element) => getComputedStyle(element).backgroundImage);
    expect(containerBackground).toContain("/api/preview/card/asset/");
    const curatedIdentityImages = phone.locator('[data-signature-role="identity-header"] [data-semantic-mask-viewport] img');
    await expect(curatedIdentityImages).toHaveCount(2);
    expect(await curatedIdentityImages.evaluateAll((images) => images.every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0 && image.src.includes("/api/preview/card/asset/")))).toBe(true);
    const brandLogo = phone.locator(".tcc-header-logo-img");
    await expect(brandLogo).toBeVisible();
    expect(await brandLogo.evaluate((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0 && image.src.includes("/api/preview/card/asset/"))).toBe(true);
    const runtimeSources = await phone.evaluate(() => Array.from(document.images).map((image) => image.currentSrc || image.src));
    expect(runtimeSources.some((source) => source.includes("/api/media/local"))).toBe(false);
    expect(runtimeSources.filter((source) => source.includes("/api/preview/card/asset/")).length).toBeGreaterThanOrEqual(2);
    expect(resourceResponses.length).toBeGreaterThanOrEqual(2);
    expect(resourceResponses.every((response) => response.status === 200 && response.authority === "resolved")).toBe(true);
    await phone.screenshot({ path: path.join(evidence, "06-cookie-free-shared-visual-resources.png"), fullPage: true });
    await phoneContext.close();
  } finally {
    const currentResponse = await page.request.get("/api/card/draft");
    if (currentResponse.ok()) {
      const current = await currentResponse.json() as { revision: number };
      const restore = await page.request.put("/api/card/draft", { data: { draft: baseline.draft, expectedRevision: current.revision } });
      expect(restore.ok()).toBeTruthy();
    }
  }
});
