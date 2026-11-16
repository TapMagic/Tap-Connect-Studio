import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mediaByteRange,
  sniffNativeMedia,
  nativeMediaMimeForKey,
} from "../native-media";
import {
  collectStudioMediaBindings,
  validateStudioMediaBindings,
} from "../studio-media-binding";
import {
  audioTime,
  readStudioAudioState,
} from "../../fusion/creative-studio/platform/audio-module";
import { createCompositionNode } from "../../fusion/creative-studio/composition";
import {
  STUDIO_ORDINARY_MODULES,
  validateStudioAddRegistry,
} from "../../fusion/creative-studio/platform/add-discover";
import {
  ordinaryModuleKind,
  resolveOrdinaryModuleCapability,
} from "../../fusion/creative-studio/platform/ordinary-module-authoring";
import { collectDocumentMediaReferences } from "../document-usage";

test("native file identification rejects disguised HTML and matches WAV/M4A/WebM containers", () => {
  assert.equal(
    sniffNativeMedia(Buffer.from("<html>not audio</html>"), "song.mp3"),
    null,
  );
  assert.equal(
    sniffNativeMedia(Buffer.from("RIFF0000WAVE0000"), "song.wav")?.mimeType,
    "audio/wav",
  );
  assert.equal(
    sniffNativeMedia(Buffer.from("0000ftypM4A 0000"), "song.m4a")?.mimeType,
    "audio/mp4",
  );
  assert.equal(
    sniffNativeMedia(
      Buffer.from([0x1a, 0x45, 0xdf, 0xa3, ...Array(20).fill(0)]),
      "clip.webm",
    )?.mimeType,
    "video/webm",
  );
  assert.equal(nativeMediaMimeForKey("tenant/track.wav"), "audio/wav");
});
test("media range responses cover Safari probes, suffix requests and invalid ranges", () => {
  assert.deepEqual(mediaByteRange("bytes=0-1", 100), { start: 0, end: 1 });
  assert.deepEqual(mediaByteRange("bytes=90-", 100), { start: 90, end: 99 });
  assert.deepEqual(mediaByteRange("bytes=-10", 100), { start: 90, end: 99 });
  assert.equal(mediaByteRange("bytes=100-", 100), false);
  assert.equal(mediaByteRange("bytes=0-1,4-5", 100), false);
  assert.equal(mediaByteRange(null, 100), null);
});
test("native audio source bindings reject cross-tenant, spoofed, rejected, or wrong-kind Assets", () => {
  const bindings = collectStudioMediaBindings({
    nodes: [
      {
        primitive: "audio",
        props: {
          mediaAssetId: "a",
          src: "/stored/a.wav",
          relatedVideo: { mediaAssetId: "v", url: "/stored/v.mp4" },
        },
      },
    ],
  });
  const assets = [
    {
      id: "a",
      url: "/stored/a.wav",
      mimeType: "audio/wav",
      approvalStatus: "UNREVIEWED",
    },
    {
      id: "v",
      url: "/stored/v.mp4",
      mimeType: "video/mp4",
      approvalStatus: "APPROVED",
    },
  ];
  assert.doesNotThrow(() => validateStudioMediaBindings(bindings, assets));
  assert.throws(() => validateStudioMediaBindings(bindings, assets.slice(1)));
  assert.throws(() =>
    validateStudioMediaBindings(
      bindings,
      assets.map((asset) => ({ ...asset, url: "https://spoofed.test/file" })),
    ),
  );
  assert.throws(() =>
    validateStudioMediaBindings(
      bindings,
      assets.map((asset) => ({ ...asset, approvalStatus: "REJECTED" })),
    ),
  );
});
test("Audio round trips through canonical module registration, capability, and asset usage", () => {
  const registration = STUDIO_ORDINARY_MODULES.find(
    (item) => item.id === "audio:module",
  )!;
  const node = createCompositionNode("audio", {
    props: {
      ...registration.defaultCanonicalState,
      mediaAssetId: "audio-1",
      src: "/a.wav",
      artwork: { mediaAssetId: "art-1" },
    },
  });
  const saved = JSON.parse(JSON.stringify(node));
  assert.equal(ordinaryModuleKind(saved), "audio");
  assert.ok(
    resolveOrdinaryModuleCapability(saved)?.groups.includes("playback"),
  );
  assert.deepEqual(validateStudioAddRegistry({}), []);
  assert.deepEqual(
    collectDocumentMediaReferences(saved)
      .map((ref) => ref.mediaAssetId)
      .sort(),
    ["art-1", "audio-1"],
  );
  assert.equal(readStudioAudioState(saved.props).variant, "featured");
  assert.equal(audioTime(Infinity), "0:00");
  assert.equal(audioTime(249.216), "4:09");
});

test("anonymous delivery excludes media referenced only by locked or hidden Pages", async () => {
  const { publiclyReferencedMediaIds } = await import("../public-native-media");
  const visible = {
    pageVisible: true,
    access: { state: "public" },
    composition: { mediaAssetId: "public" },
  };
  const locked = {
    pageVisible: true,
    access: { state: "locked" },
    composition: { mediaAssetId: "private" },
  };
  const hidden = {
    pageVisible: false,
    composition: { mediaAssetId: "hidden" },
  };
  assert.deepEqual(
    [
      ...publiclyReferencedMediaIds({
        document: { experience: { pages: [visible, locked, hidden] } },
      }),
    ],
    ["public"],
  );
});
test("native media URLs project to scoped publication and preview credentials", async () => {
  const { projectPublicExperienceMedia } = await import(
    "../public-experience-media"
  );
  const { resolvePreviewVisualResources } = await import(
    "../../fusion/creative-studio/preview/visual-resources"
  );
  const canonical = { src: "/api/public/native-media/asset_1" };
  assert.equal(
    projectPublicExperienceMedia(canonical, "test").src,
    "/api/public/native-media/asset_1?publication=test",
  );
  assert.equal(
    resolvePreviewVisualResources(canonical, "signed-token").src,
    "/api/public/native-media/asset_1?preview=signed-token",
  );
  assert.equal(canonical.src, "/api/public/native-media/asset_1");
});

test("shared playback ownership releases competing native streams", async () => {
  const { observeMediaOwnership, claimMediaPlayback } = await import(
    "../../fusion/creative-studio/platform/media-playback"
  );
  const document = new EventTarget();
  class FakeMedia extends EventTarget {
    ownerDocument = document;
    paused = false;
    pause() {
      this.paused = true;
    }
  }
  const audio = new FakeMedia(),
    video = new FakeMedia();
  const releaseAudio = observeMediaOwnership(
    audio as unknown as HTMLMediaElement,
  );
  const releaseVideo = observeMediaOwnership(
    video as unknown as HTMLMediaElement,
  );
  claimMediaPlayback(audio as unknown as HTMLMediaElement);
  assert.equal(video.paused, true);
  assert.equal(audio.paused, false);
  claimMediaPlayback(video as unknown as HTMLMediaElement);
  assert.equal(audio.paused, true);
  releaseAudio();
  releaseVideo();
});

test("hidden or locked media nodes do not grant public file access", async () => {
  const { publiclyReferencedMediaIds } = await import("../public-native-media");
  assert.deepEqual(
    [
      ...publiclyReferencedMediaIds({
        nodes: [
          { visible: false, props: { mediaAssetId: "hidden" } },
          { props: { accessState: "locked", mediaAssetId: "locked" } },
          { props: { mediaAssetId: "visible" } },
        ],
      }),
    ],
    ["visible"],
  );
});

test("behavior defaults preserve manual playback and existing controls", async () => {
  const { readStudioMediaBehavior } = await import(
    "../../fusion/creative-studio/platform/media-behavior"
  );
  const state = readStudioMediaBehavior({});
  assert.equal(state.initialPlayback, "manual");
  assert.equal(state.loop, "off");
  assert.equal(state.startSeconds, 0);
  assert.equal(state.completion, "stop");
  assert.equal(state.continuity, true);
  assert.ok(Object.values(state.controls).every(Boolean));
});
test("behavior normalizes unsafe numbers and preserves future extension fields", async () => {
  const { readStudioMediaBehavior, patchStudioMediaBehavior, clampMediaStart } =
    await import("../../fusion/creative-studio/platform/media-behavior");
  assert.equal(
    readStudioMediaBehavior({ mediaBehavior: { startSeconds: Infinity } })
      .startSeconds,
    0,
  );
  assert.equal(
    readStudioMediaBehavior({ mediaBehavior: { startSeconds: -8 } })
      .startSeconds,
    0,
  );
  assert.equal(clampMediaStart(500, 12), 11.95);
  const props = {
    mediaBehavior: {
      startSeconds: 2,
      futureQueue: { preserved: true },
      controls: { futureControl: "retained" },
    },
  };
  const patched = patchStudioMediaBehavior(props, { loop: "current" });
  assert.deepEqual(patched.futureQueue, { preserved: true });
  assert.equal(
    (patched.controls as Record<string, unknown>).futureControl,
    "retained",
  );
  assert.equal(patched.startSeconds, 2);
});
test("iPhone and desktop-mode iPad do not expose software volume", async () => {
  const { supportsMediaVolume } = await import(
    "../../fusion/creative-studio/platform/media-behavior"
  );
  assert.equal(
    supportsMediaVolume({
      userAgent: "iPhone",
      platform: "iPhone",
      maxTouchPoints: 5,
    }),
    false,
  );
  assert.equal(
    supportsMediaVolume({
      userAgent: "Macintosh Safari",
      platform: "MacIntel",
      maxTouchPoints: 5,
    }),
    false,
  );
  assert.equal(
    supportsMediaVolume({
      userAgent: "Macintosh Chrome",
      platform: "MacIntel",
      maxTouchPoints: 0,
    }),
    true,
  );
});
test("autoplay cannot interrupt a document with prior playback ownership", async () => {
  const { mayAttemptMediaAutoplay, claimPlaybackOwner } = await import(
    "../../fusion/creative-studio/platform/media-playback"
  );
  const doc = Object.assign(new EventTarget(), {
    querySelectorAll: () => [],
  }) as unknown as Document;
  assert.equal(mayAttemptMediaAutoplay(doc), true);
  claimPlaybackOwner({}, doc);
  assert.equal(mayAttemptMediaAutoplay(doc), false);
});
