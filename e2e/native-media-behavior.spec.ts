import { expect, test, type APIRequestContext } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "tmp/native-media-proof");
const read = (name: string) =>
  JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));

test.describe("Native media Host behavior", () => {
  test.skip(
    process.env.NATIVE_MEDIA_PROOF !== "1",
    "Requires the isolated real-media proof assets.",
  );
  test.use({
    storageState: path.join(root, "auth.json"),
    viewport: { width: 390, height: 844 },
  });
  async function fixture(
    request: APIRequestContext,
    behavior: Record<string, unknown>,
    variant = "featured",
  ) {
    const created = await request.post("/api/experiences", {
      data: {
        name: "Native behavior validation",
        clientName: "Native media behavior proof",
        startMode: "clone",
        sourceId: read("document.json").id,
      },
    });
    expect(created.ok()).toBe(true);
    const { document } = await created.json();
    const draft = document.draft;
    const home = draft.experience.pages[0];
    const node = home.composition.rootComposition.nodes.find(
      (node: { primitive: string; props: { audioVariant?: string } }) =>
        node.primitive === "audio" && node.props.audioVariant === "featured",
    );
    node.props.mediaBehavior = behavior;
    node.props.audioVariant = variant;
    home.composition.rootComposition.nodes = [node];
    draft.rootComposition = home.composition.rootComposition;
    const saved = await request.put(`/api/card/documents/${document.id}`, {
      data: { draft, expectedRevision: document.draftRevision },
    });
    expect(saved.ok()).toBe(true);
    const published = await request.post(
      `/api/experiences/${document.id}/publication`,
      {
        data: {
          action: "publish",
          expectedDraftRevision: (await saved.json()).revision,
        },
      },
    );
    expect(published.ok()).toBe(true);
    const phone = await request.post("/api/preview/card/session", {
      data: {
        documentId: document.id,
        profile: { displayName: "Media behavior proof" },
        businessName: "Native media behavior proof",
        mode: "freeze",
      },
    });
    expect(phone.ok()).toBe(true);
    return {
      id: document.id,
      urls: [
        `/dashboard/experiences/${document.id}/preview`,
        (await published.json()).publicUrl,
        (await phone.json()).path,
      ],
    };
  }
  async function archive(request: APIRequestContext, id: string) {
    await request.patch(`/api/experiences/${id}`, {
      data: { action: "archive" },
    });
  }

  test("start offset, Replay completion, hidden optional controls, and continuity off work on every delivery surface", async ({
    page,
    request,
  }) => {
    const f = await fixture(request, {
      startSeconds: 2,
      completion: "replay",
      continuity: false,
      artworkVisible: false,
      controls: { volume: false, mute: false, expand: false },
    });
    try {
      for (const url of f.urls) {
        await page.goto(url);
        const player = page.locator('[data-audio-variant="featured"]');
        const engine = page.getByTestId("experience-audio-engine");
        await expect(
          player.getByRole("button", {
            name: "Play Every single mile · WAV sample",
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          player.getByRole("slider", { name: "Audio volume" }),
        ).toHaveCount(0);
        await expect(
          player.getByRole("button", { name: "Mute audio" }),
        ).toHaveCount(0);
        await expect(
          player.getByRole("button", { name: "Expand artwork & details" }),
        ).toHaveCount(0);
        await expect(player.locator("img")).toHaveCount(0);
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
          .toBeGreaterThan(2.1);
        const seek = player.getByRole("slider", {
          name: "Seek Every single mile · WAV sample",
        });
        await seek.focus();
        await page.keyboard.press("End");
        await expect(
          player.getByRole("button", {
            name: "Replay Every single mile · WAV sample",
          }),
        ).toBeVisible();
        expect(
          await engine.evaluate((audio: HTMLAudioElement) => audio.paused),
        ).toBe(true);
        expect(
          await engine.evaluate((audio: HTMLAudioElement) => audio.currentTime),
        ).toBeCloseTo(2, 0);
        await player
          .getByRole("button", {
            name: "Replay Every single mile · WAV sample",
          })
          .click();
        await expect
          .poll(() =>
            engine.evaluate((audio: HTMLAudioElement) => audio.currentTime),
          )
          .toBeGreaterThan(2.1);
        await page
          .getByRole("button", { name: "Song", exact: true })
          .last()
          .click();
        await expect
          .poll(() =>
            engine.evaluate((audio: HTMLAudioElement) => audio.paused),
          )
          .toBe(true);
        await expect(engine).not.toHaveAttribute("src", /.+/);
        await expect(page.getByTestId("experience-audio-dock")).toHaveCount(0);
      }
    } finally {
      await archive(request, f.id);
    }
  });

  test("Current-track loop repeats from the configured start and overrides Replay", async ({
    page,
    request,
  }) => {
    const f = await fixture(request, {
      startSeconds: 2,
      loop: "current",
      completion: "replay",
    });
    try {
      for (const url of f.urls.slice(0, 2)) {
        await page.goto(url);
        const engine = page.getByTestId("experience-audio-engine");
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
          .toBeGreaterThan(2.1);
        await engine.evaluate((audio: HTMLAudioElement) =>
          audio.addEventListener("ended", () => {
            audio.dataset.completedLoops = String(
              Number(audio.dataset.completedLoops || 0) + 1,
            );
          }),
        );
        await page
          .getByRole("slider", { name: "Seek Every single mile · WAV sample" })
          .focus();
        await page.keyboard.press("End");
        await expect
          .poll(async () =>
            Number((await engine.getAttribute("data-completed-loops")) || 0),
          )
          .toBeGreaterThanOrEqual(1);
        await expect
          .poll(() =>
            engine.evaluate((audio: HTMLAudioElement) => audio.paused),
          )
          .toBe(false);
        await expect
          .poll(() =>
            engine.evaluate(
              (audio: HTMLAudioElement) =>
                audio.currentTime >= 2 && audio.currentTime < 5,
            ),
          )
          .toBe(true);
      }
    } finally {
      await archive(request, f.id);
    }
  });

  test("seeking to the end while paused never restarts a loop", async ({
    page,
    request,
  }) => {
    const f = await fixture(request, { loop: "current", startSeconds: 2 });
    try {
      await page.goto(f.urls[1]);
      const engine = page.getByTestId("experience-audio-engine");
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
        .toBeGreaterThan(2.1);
      await page
        .getByRole("button", {
          name: "Pause Every single mile · WAV sample",
          exact: true,
        })
        .click();
      await page
        .getByRole("slider", { name: "Seek Every single mile · WAV sample" })
        .focus();
      await page.keyboard.press("End");
      await page.waitForTimeout(250);
      expect(
        await engine.evaluate((audio: HTMLAudioElement) => audio.paused),
      ).toBe(true);
    } finally {
      await archive(request, f.id);
    }
  });

  test("blocked audio autoplay keeps a visible usable Play button without automatic retries", async ({
    page,
    request,
  }) => {
    await page.addInitScript(() => {
      const original = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        if (this.tagName === "AUDIO") {
          this.dataset.playAttempts = String(
            Number(this.dataset.playAttempts || 0) + 1,
          );
          if (this.dataset.playAttempts === "1")
            return Promise.reject(
              new DOMException("Test browser policy", "NotAllowedError"),
            );
        }
        return original.call(this);
      };
    });
    const f = await fixture(request, {
      initialPlayback: "autoplay",
      startSeconds: 1.5,
      controls: {
        progress: false,
        time: false,
        volume: false,
        mute: false,
        expand: false,
      },
    });
    try {
      for (const url of f.urls) {
        await page.goto(url);
        const engine = page.getByTestId("experience-audio-engine");
        const player = page.locator('[data-audio-variant="featured"]');
        await expect(player.getByRole("alert")).toContainText(
          "Playback was blocked",
        );
        await expect(engine).toHaveAttribute("data-play-attempts", "1");
        expect(
          await engine.evaluate((audio: HTMLAudioElement) => audio.paused),
        ).toBe(true);
        await expect(player.getByRole("slider")).toHaveCount(0);
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
          .toBeGreaterThan(1.6);
        await expect(engine).toHaveAttribute("data-play-attempts", "2");
      }
    } finally {
      await archive(request, f.id);
    }
  });

  test("initial video presentation has start offset and a manual fallback with native controls hidden", async ({
    page,
    request,
  }) => {
    await page.addInitScript(() => {
      const original = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        if (this.tagName === "VIDEO" && !this.dataset.policyAttempted) {
          this.dataset.policyAttempted = "1";
          return Promise.reject(
            new DOMException("Test browser policy", "NotAllowedError"),
          );
        }
        return original.call(this);
      };
    });
    const f = await fixture(
      request,
      {
        initialPlayback: "autoplay",
        presentation: "video",
        startSeconds: 0.5,
        controls: { nativeVideo: false, expand: false },
      },
      "compact",
    );
    try {
      for (const url of f.urls.slice(1)) {
        await page.goto(url);
        const video = page.locator("video");
        await expect(video).toBeVisible();
        await expect(
          page.locator('[data-audio-variant="compact"]').getByRole("alert"),
        ).toContainText("Playback was blocked");
        expect(
          await video.evaluate((media: HTMLVideoElement) => media.controls),
        ).toBe(false);
        await page
          .getByRole("button", { name: "Play video", exact: true })
          .click();
        await expect
          .poll(() =>
            video.evaluate((media: HTMLVideoElement) => media.currentTime),
          )
          .toBeGreaterThan(0.6);
        await page
          .getByRole("button", { name: "Pause video", exact: true })
          .click();
        expect(
          await video.evaluate((media: HTMLVideoElement) => media.paused),
        ).toBe(true);
        await page.getByRole("button", { name: "Audio", exact: true }).click();
        await expect(video).toHaveCount(0);
        await expect(
          page.getByRole("button", {
            name: "Play Every single mile · WAV sample",
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          page.getByTestId("experience-audio-engine"),
        ).not.toHaveAttribute("src", /.+/);
      }
    } finally {
      await archive(request, f.id);
    }
  });

  test("leaving a video page pauses its detached native element", async ({
    page,
    request,
  }) => {
    const f = await fixture(request, {
      presentation: "video",
      controls: { nativeVideo: false },
    });
    try {
      await page.goto(f.urls[1]);
      const video = page.locator("video");
      await page
        .getByRole("button", { name: "Play video", exact: true })
        .click();
      await expect
        .poll(() =>
          video.evaluate((media: HTMLVideoElement) => media.currentTime),
        )
        .toBeGreaterThan(0.2);
      const element = await video.elementHandle();
      await page
        .getByRole("button", { name: "Song", exact: true })
        .last()
        .click();
      await expect(video).toHaveCount(0);
      expect(
        await element!.evaluate((media: HTMLVideoElement) => media.paused),
      ).toBe(true);
    } finally {
      await archive(request, f.id);
    }
  });

  test("browser-permitted autoplay starts real audio once and respects subsequent Pause", async ({
    browserName,
    playwright,
    request,
    baseURL,
  }) => {
    test.skip(
      browserName !== "chromium",
      "Controlled allowed-autoplay policy scenario uses Chromium's test launch policy.",
    );
    const f = await fixture(request, {
      initialPlayback: "autoplay",
      startSeconds: 2,
    });
    // Test-only browser policy, never a production playback workaround.
    const browser = await playwright.chromium.launch({
      args: ["--autoplay-policy=no-user-gesture-required"],
    });
    try {
      const context = await browser.newContext({
        baseURL,
        storageState: path.join(root, "auth.json"),
        viewport: { width: 390, height: 844 },
      });
      const page = await context.newPage();
      await page.goto(f.urls[1]);
      const engine = page.getByTestId("experience-audio-engine");
      await expect
        .poll(() =>
          engine.evaluate((audio: HTMLAudioElement) => audio.currentTime),
        )
        .toBeGreaterThan(2.1);
      await page
        .getByRole("button", {
          name: "Pause Every single mile · WAV sample",
          exact: true,
        })
        .click();
      await page.waitForTimeout(350);
      expect(
        await engine.evaluate((audio: HTMLAudioElement) => audio.paused),
      ).toBe(true);
    } finally {
      await browser.close();
      await archive(request, f.id);
    }
  });

  test("iPhone uses physical volume controls without setting software volume", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "userAgent", {
        value: "iPhone Safari",
        configurable: true,
      });
      const descriptor = Object.getOwnPropertyDescriptor(
        HTMLMediaElement.prototype,
        "volume",
      )!;
      Object.defineProperty(HTMLMediaElement.prototype, "volume", {
        get: descriptor.get,
        set() {
          throw new Error("Software volume must not be set on iOS");
        },
      });
    });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(read("publication.json").publicUrl);
    await expect(
      page.getByRole("slider", { name: "Audio volume" }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Use device volume buttons").first(),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: "Play Every single mile · WAV sample",
        exact: true,
      })
      .click();
    await expect
      .poll(() =>
        page
          .getByTestId("experience-audio-engine")
          .evaluate((media: HTMLAudioElement) => media.currentTime),
      )
      .toBeGreaterThan(0.2);
    await page
      .getByRole("button", { name: "Song", exact: true })
      .last()
      .click();
    await page
      .getByRole("button", { name: "Home", exact: true })
      .last()
      .click();
    expect(errors).toEqual([]);
  });
});

test.describe("Host playback authoring persistence", () => {
  test.skip(
    process.env.NATIVE_MEDIA_PROOF !== "1",
    "Requires isolated native media proof.",
  );
  test.use({
    storageState: path.join(root, "auth.json"),
    viewport: { width: 1440, height: 1000 },
  });
  test("Host settings persist through Inspector, Save, reload and publication without playing in Edit", async ({
    page,
    request,
  }) => {
    const created = await request.post("/api/experiences", {
      data: {
        name: "Native behavior authoring proof",
        clientName: "Native behavior authoring proof",
        startMode: "clone",
        sourceId: read("document.json").id,
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
      await controls
        .getByLabel("Audio MediaAsset", { exact: true })
        .selectOption(read("wav-asset.json").id);
      await controls
        .getByLabel("Track title", { exact: true })
        .fill("Behavior authoring test");
      const behavior = controls.getByTestId("studio-media-behavior-controls");
      await behavior
        .getByLabel("Initial playback", { exact: true })
        .selectOption("autoplay");
      await behavior
        .getByLabel("Loop", { exact: true })
        .selectOption("current");
      await behavior
        .getByLabel("Media start position exact value", { exact: true })
        .fill("2.5");
      await behavior
        .getByLabel("Completion behavior", { exact: true })
        .selectOption("replay");
      await behavior
        .getByLabel("Continue audio across Experience Pages", { exact: true })
        .uncheck();
      await behavior.getByLabel("Display artwork", { exact: true }).uncheck();
      await behavior
        .getByLabel("Show seek progress", { exact: true })
        .uncheck();
      await behavior
        .getByLabel("Show native video controls", { exact: true })
        .uncheck();
      await controls
        .getByLabel("Video MediaAsset", { exact: true })
        .selectOption(read("video-asset.json").id);
      await behavior
        .getByLabel("Initial media presentation", { exact: true })
        .selectOption("video");
      expect(
        await page
          .locator("audio,video")
          .evaluateAll((elements) =>
            elements.every((element) => (element as HTMLMediaElement).paused),
          ),
      ).toBe(true);
      await page.getByTestId("studio-save").click();
      await expect
        .poll(async () => {
          const saved = (
            await (await request.get(`/api/experiences/${document.id}`)).json()
          ).document;
          return JSON.stringify(saved.draft).includes('"startSeconds":2.5');
        })
        .toBe(true);
      await page.reload();
      await expect(
        page.getByText("Behavior authoring test", { exact: true }).first(),
      ).toBeVisible();
      const saved = (
        await (await request.get(`/api/experiences/${document.id}`)).json()
      ).document;
      const nodes = saved.draft.experience.pages.flatMap(
        (p: {
          composition: {
            rootComposition: {
              nodes: {
                props: { audioTitle?: string; mediaBehavior?: unknown };
              }[];
            };
          };
        }) => p.composition.rootComposition.nodes,
      );
      const state = nodes.find(
        (n: { props: { audioTitle?: string } }) =>
          n.props.audioTitle === "Behavior authoring test",
      ).props.mediaBehavior;
      expect(state).toMatchObject({
        initialPlayback: "autoplay",
        loop: "current",
        startSeconds: 2.5,
        completion: "replay",
        continuity: false,
        artworkVisible: false,
        presentation: "video",
        controls: { progress: false, nativeVideo: false },
      });
      const published = await request.post(
        `/api/experiences/${document.id}/publication`,
        {
          data: {
            action: "publish",
            expectedDraftRevision: saved.draftRevision,
          },
        },
      );
      expect(published.ok()).toBe(true);
      await page.goto((await published.json()).publicUrl);
      await expect(page.locator("video")).toBeVisible();
    } finally {
      await request.patch(`/api/experiences/${document.id}`, {
        data: { action: "archive" },
      });
    }
  });
});
