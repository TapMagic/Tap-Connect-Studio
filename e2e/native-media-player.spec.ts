import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// The provisioned proof uses the owner's real M4A and a PCM WAV derivative.
// Run prepare/configure in tmp/native-media-proof, then set NATIVE_MEDIA_PROOF=1.
const proofRoot = path.join(process.cwd(), "tmp/native-media-proof");
test.describe("Studio native media delivery", () => {
  test.skip(
    process.env.NATIVE_MEDIA_PROOF !== "1",
    "Requires a separate local validation Experience and real audio MediaAssets.",
  );
  test.use({
    storageState: path.join(proofRoot, "auth.json"),
    viewport: { width: 390, height: 844 },
  });
  test("WAV and M4A play, seek, pause, replace, and survive page navigation on all delivery surfaces", async ({
    page,
  }) => {
    const document = JSON.parse(
      fs.readFileSync(path.join(proofRoot, "document.json"), "utf8"),
    );
    const publication = JSON.parse(
      fs.readFileSync(path.join(proofRoot, "publication.json"), "utf8"),
    );
    const preview = JSON.parse(
      fs.readFileSync(path.join(proofRoot, "preview.json"), "utf8"),
    );
    for (const url of [
      `/dashboard/experiences/${document.id}/preview`,
      publication.publicUrl,
      preview.path,
    ]) {
      await page.goto(url);
      const engine = page.getByTestId("experience-audio-engine");
      await expect(engine).toHaveCount(1);
      await expect
        .poll(() => engine.evaluate((audio: HTMLAudioElement) => audio.paused))
        .toBe(true);
      await expect(engine).not.toHaveAttribute("src", /.+/);
      await page
        .getByRole("button", {
          name: "Play Every single mile · WAV sample",
          exact: true,
        })
        .click();
      await expect
        .poll(() =>
          engine.evaluate((audio: HTMLAudioElement) => audio.currentTime),
        )
        .toBeGreaterThan(0.2);
      expect(
        await engine.evaluate((audio: HTMLAudioElement) => audio.duration),
      ).toBeCloseTo(12, 0);
      await page
        .getByRole("button", {
          name: "Pause Every single mile · WAV sample",
          exact: true,
        })
        .click();
      const seek = page.getByRole("slider", {
        name: "Seek Every single mile · WAV sample",
        exact: true,
      });
      await seek.focus();
      await page.keyboard.press("Home");
      for (let i = 0; i < 50; i++) await page.keyboard.press("ArrowRight");
      await expect
        .poll(() =>
          engine.evaluate((audio: HTMLAudioElement) => audio.currentTime),
        )
        .toBeGreaterThan(4.9);
      await page
        .getByRole("button", {
          name: "Play Every single mile · WAV sample",
          exact: true,
        })
        .click();
      if (url === preview.path) {
        // The preview credit must respect the Experience's navigation clearance,
        // including when a visitor reaches the bottom of a long artwork page.
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      }
      await page.getByRole("button", { name: /Song/ }).last().click();
      await expect(
        page.locator('[data-audio-variant="expanded"]'),
      ).toBeVisible();
      await expect
        .poll(() =>
          engine.evaluate((audio: HTMLAudioElement) => audio.currentTime),
        )
        .toBeGreaterThan(5.2);
      expect(
        await engine.evaluate((audio: HTMLAudioElement) => audio.paused),
      ).toBe(false);
      await page
        .getByRole("button", {
          name: "Pause Every single mile · WAV sample",
          exact: true,
        })
        .click();
      await page
        .getByRole("button", { name: "Home", exact: true })
        .last()
        .click();
      await page
        .getByRole("button", {
          name: "Play Every single mile · original",
          exact: true,
        })
        .click();
      await expect
        .poll(() =>
          engine.evaluate((audio: HTMLAudioElement) => audio.currentTime),
        )
        .toBeGreaterThan(0.2);
      expect(
        await engine.evaluate((audio: HTMLAudioElement) => audio.duration),
      ).toBeGreaterThan(249);
      await page
        .getByRole("button", { name: "Song", exact: true })
        .last()
        .click();
      await expect(page.getByTestId("experience-audio-dock")).toBeVisible();
      await page
        .getByTestId("experience-audio-dock")
        .getByRole("button", { name: "Pause audio", exact: true })
        .click();
    }
  });
});

test.describe("Native media controls and failure behavior", () => {
  test.skip(
    process.env.NATIVE_MEDIA_PROOF !== "1",
    "Requires isolated native-media proof assets.",
  );
  test.use({
    storageState: path.join(proofRoot, "auth.json"),
    viewport: { width: 390, height: 844 },
  });
  test("volume, mute, completion, lazy video, non-overlap, and fullscreen fallback", async ({
    page,
  }) => {
    const publication = JSON.parse(
      fs.readFileSync(path.join(proofRoot, "publication.json"), "utf8"),
    );
    const videoAsset = JSON.parse(
      fs.readFileSync(path.join(proofRoot, "video-asset.json"), "utf8"),
    );
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    await page.goto(publication.publicUrl);
    const player = page.locator('[data-audio-variant="featured"]');
    const engine = page.getByTestId("experience-audio-engine");
    await player
      .getByRole("button", {
        name: "Play Every single mile · WAV sample",
        exact: true,
      })
      .click();
    await expect
      .poll(() =>
        engine.evaluate((audio: HTMLAudioElement) => audio.currentTime),
      )
      .toBeGreaterThan(0.2);
    expect(requests.some((url) => url.includes(videoAsset.id))).toBe(false);
    await player
      .getByRole("button", { name: "Mute audio", exact: true })
      .click();
    expect(
      await engine.evaluate((audio: HTMLAudioElement) => audio.muted),
    ).toBe(true);
    await player
      .getByRole("button", { name: "Unmute audio", exact: true })
      .click();
    const volume = player.getByRole("slider", { name: "Audio volume" });
    await volume.focus();
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowRight");
    expect(
      await engine.evaluate((audio: HTMLAudioElement) => audio.volume),
    ).toBeLessThan(0.2);
    await player.getByRole("button", { name: "Video", exact: true }).click();
    await expect
      .poll(() => engine.evaluate((audio: HTMLAudioElement) => audio.paused))
      .toBe(true);
    const video = player.locator("video");
    await expect(video).toBeVisible();
    await video.evaluate((element: HTMLVideoElement) => element.play());
    await expect
      .poll(() =>
        video.evaluate((element: HTMLVideoElement) => element.currentTime),
      )
      .toBeGreaterThan(0.2);
    expect(
      await engine.evaluate((audio: HTMLAudioElement) => audio.paused),
    ).toBe(true);
    await page.evaluate(() => {
      Object.defineProperty(document, "fullscreenEnabled", {
        value: false,
        configurable: true,
      });
    });
    await video.evaluate(
      (element: HTMLVideoElement & { webkitEnterFullscreen?: unknown }) => {
        Object.defineProperty(element, "webkitEnterFullscreen", {
          value: undefined,
          configurable: true,
        });
      },
    );
    await player
      .getByRole("button", { name: "Expand video", exact: true })
      .click();
    await expect(
      player.getByRole("button", { name: "Collapse video", exact: true }),
    ).toBeVisible();
    await player
      .getByRole("button", { name: "Collapse video", exact: true })
      .click();
    await player.getByRole("button", { name: "Audio", exact: true }).click();
    await expect(video).toHaveCount(0);
    await player
      .getByRole("button", {
        name: "Play Every single mile · WAV sample",
        exact: true,
      })
      .click();
    const seek = player.getByRole("slider", {
      name: "Seek Every single mile · WAV sample",
      exact: true,
    });
    await seek.focus();
    await page.keyboard.press("End");
    await expect
      .poll(() => engine.evaluate((audio: HTMLAudioElement) => audio.ended))
      .toBe(true);
    await player
      .getByRole("button", {
        name: "Play Every single mile · WAV sample",
        exact: true,
      })
      .click();
    await expect
      .poll(() =>
        engine.evaluate((audio: HTMLAudioElement) => audio.currentTime),
      )
      .toBeLessThan(2);
    await player
      .getByRole("button", {
        name: "Pause Every single mile · WAV sample",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "Song", exact: true })
      .last()
      .click();
    await expect(page.locator('[data-audio-variant="expanded"]')).toBeVisible();
    await page.setViewportSize({ width: 844, height: 390 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
  test("inaccessible media produces a useful error and can be retried", async ({
    page,
  }) => {
    const publication = JSON.parse(
      fs.readFileSync(path.join(proofRoot, "publication.json"), "utf8"),
    );
    const wav = JSON.parse(
      fs.readFileSync(path.join(proofRoot, "wav-asset.json"), "utf8"),
    );
    await page.route(`**/api/public/native-media/${wav.id}*`, (route) =>
      route.fulfill({ status: 404, body: "Unavailable" }),
    );
    await page.goto(publication.publicUrl);
    const player = page.locator('[data-audio-variant="featured"]');
    await player
      .getByRole("button", {
        name: "Play Every single mile · WAV sample",
        exact: true,
      })
      .click();
    await expect(player.getByRole("alert")).toContainText(
      /unavailable|Unable to play/,
    );
    await page.unroute(`**/api/public/native-media/${wav.id}*`);
    await player
      .getByRole("button", {
        name: "Play Every single mile · WAV sample",
        exact: true,
      })
      .click();
    await expect
      .poll(() =>
        page
          .getByTestId("experience-audio-engine")
          .evaluate((audio: HTMLAudioElement) => audio.currentTime),
      )
      .toBeGreaterThan(0.2);
  });
});

test.describe("Native media authorization", () => {
  test.skip(
    process.env.NATIVE_MEDIA_PROOF !== "1",
    "Requires local native media proof assets.",
  );
  test.use({ storageState: path.join(proofRoot, "auth.json") });
  test("private originals require ownership, signed preview, or an active referencing publication", async ({
    playwright,
    request,
    baseURL,
  }) => {
    const publication = JSON.parse(
      fs.readFileSync(path.join(proofRoot, "publication.json"), "utf8"),
    );
    const preview = JSON.parse(
      fs.readFileSync(path.join(proofRoot, "preview.json"), "utf8"),
    );
    const source = JSON.parse(
      fs.readFileSync(path.join(proofRoot, "wav-asset.json"), "utf8"),
    );
    const slug = publication.publicUrl.split("/").pop();
    const bytes = fs.readFileSync(
      path.join(proofRoot, "every-single-mile-12s.wav"),
    );
    const privateBytes = Buffer.from(bytes);
    privateBytes[privateBytes.length - 1] ^= 1;
    const uploaded = await request.post("/api/media/upload", {
      multipart: {
        file: {
          name: "Unpublished private test.wav",
          mimeType: "audio/wav",
          buffer: privateBytes,
        },
      },
    });
    expect(uploaded.ok()).toBe(true);
    const privateAsset = (await uploaded.json()).asset;
    const visitor = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { Cookie: "tapconnect_control_identity=visitor" },
    });
    try {
      expect((await visitor.get(privateAsset.url)).status()).toBe(404);
      expect(
        (await visitor.get(`${privateAsset.url}?publication=${slug}`)).status(),
      ).toBe(404);
      expect(
        (await visitor.get(`${source.url}?preview=invalid`)).status(),
      ).toBe(404);
      expect(
        (
          await visitor.get(`${source.url}?publication=unrelated-publication`)
        ).status(),
      ).toBe(404);
      const range = await visitor.get(`${source.url}?publication=${slug}`, {
        headers: { Range: "bytes=0-1" },
      });
      expect(range.status()).toBe(206);
      expect((await range.body()).byteLength).toBe(2);
      expect(range.headers()["content-type"]).toBe("audio/wav");
      const validPreview = await visitor.get(
        `${source.url}?preview=${encodeURIComponent(preview.token)}`,
        { headers: { Range: "bytes=0-1" } },
      );
      expect(validPreview.status()).toBe(206);
    } finally {
      await visitor.dispose();
    }
  });
});

test.describe("Native media capability fallback", () => {
  test.skip(
    process.env.NATIVE_MEDIA_PROOF !== "1",
    "Requires isolated native media proof.",
  );
  test.use({
    storageState: path.join(proofRoot, "auth.json"),
    viewport: { width: 390, height: 844 },
  });
  test("an unsupported selected format stops the previous track and reports a fallback", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const original = HTMLMediaElement.prototype.canPlayType;
      HTMLMediaElement.prototype.canPlayType = function (type: string) {
        return type === "audio/wav" ? "" : original.call(this, type);
      };
    });
    const publication = JSON.parse(
      fs.readFileSync(path.join(proofRoot, "publication.json"), "utf8"),
    );
    await page.goto(publication.publicUrl);
    const engine = page.getByTestId("experience-audio-engine");
    await page
      .getByRole("button", {
        name: "Play Every single mile · original",
        exact: true,
      })
      .click();
    await expect
      .poll(() =>
        engine.evaluate((audio: HTMLAudioElement) => audio.currentTime),
      )
      .toBeGreaterThan(0.2);
    await page
      .getByRole("button", {
        name: "Play Every single mile · WAV sample",
        exact: true,
      })
      .click();
    await expect(
      page.locator('[data-audio-variant="featured"]').getByRole("alert"),
    ).toContainText("does not support");
    expect(
      await engine.evaluate((audio: HTMLAudioElement) => audio.paused),
    ).toBe(true);
    await expect(engine).not.toHaveAttribute("src", /.+/);
  });
});

test.describe("Native media authoring lifecycle", () => {
  test.skip(
    process.env.NATIVE_MEDIA_PROOF !== "1",
    "Requires isolated native media proof.",
  );
  test.use({
    storageState: path.join(proofRoot, "auth.json"),
    viewport: { width: 1440, height: 1000 },
  });
  test("Add, select Asset, edit metadata and variant, save, and reload", async ({
    page,
    request,
  }) => {
    const source = JSON.parse(
      fs.readFileSync(path.join(proofRoot, "document.json"), "utf8"),
    );
    const created = await request.post("/api/experiences", {
      data: {
        name: "Native media automated authoring proof",
        clientName: "The Forecast · EverEncore",
        startMode: "clone",
        sourceId: source.id,
      },
    });
    expect(created.ok()).toBe(true);
    const { document } = await created.json();
    try {
      await page.goto(`/dashboard/card/edit?experience=${document.id}`);
      await page.getByTestId("studio-context").waitFor();
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Add", exact: true }).click();
      await page.getByTestId("studio-add-image").click();
      await page.getByTestId("studio-add-audio-module").click();
      await page
        .getByRole("button", { name: "Edit · Audio Player", exact: true })
        .click();
      const controls = page.getByTestId("studio-audio-controls");
      const asset = JSON.parse(
        fs.readFileSync(path.join(proofRoot, "m4a-asset.json"), "utf8"),
      );
      await controls
        .getByLabel("Audio MediaAsset", { exact: true })
        .selectOption(asset.id);
      await controls
        .getByLabel("Track title", { exact: true })
        .fill("Saved Audio authoring proof");
      await controls.getByLabel("Artist", { exact: true }).fill("The Forecast");
      await controls
        .getByLabel("Presentation", { exact: true })
        .selectOption("expanded");
      await expect(
        page.locator('[data-audio-variant="expanded"]').first(),
      ).toBeVisible();
      await controls
        .getByLabel("Presentation", { exact: true })
        .selectOption("compact");
      await page.getByTestId("studio-save").click();
      await expect
        .poll(async () =>
          JSON.stringify(
            (
              await (
                await request.get(`/api/experiences/${document.id}`)
              ).json()
            ).document.draft,
          ),
        )
        .toContain("Saved Audio authoring proof");
      await page.reload();
      await expect(
        page.getByText("Saved Audio authoring proof", { exact: true }).first(),
      ).toBeVisible();
    } finally {
      await request.patch(`/api/experiences/${document.id}`, {
        data: { action: "archive" },
      });
    }
  });
});
