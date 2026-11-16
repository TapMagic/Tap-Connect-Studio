/** Local-only real media proof setup. Never connects to production. */
const { chromium, request } = require("playwright");
const fs = require("fs");
const baseURL = process.env.BASE_URL || "http://127.0.0.1:3067";
const audioPath = process.env.NATIVE_MEDIA_AUDIO_PATH;
if (!["127.0.0.1", "localhost"].includes(new URL(baseURL).hostname))
  throw new Error("Proof setup requires an isolated local Studio server.");
if (!audioPath || !fs.existsSync(audioPath))
  throw new Error("Set NATIVE_MEDIA_AUDIO_PATH to an owner-supplied M4A file.");
fs.mkdirSync("tmp/native-media-proof", { recursive: true });

async function prepare() {
  const api = await request.newContext({ baseURL: baseURL });
  const review = await api.get("/review/studio");
  console.log("Review status", review.status());
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(baseURL);
  // Decode the real owner file, then serialize a short PCM WAV test derivative.
  const base64 = fs.readFileSync(audioPath).toString("base64");
  const wav = await page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const context = new AudioContext();
    const decoded = await context.decodeAudioData(bytes.buffer);
    const frames = Math.min(decoded.length, decoded.sampleRate * 12);
    const output = new ArrayBuffer(44 + frames * 2);
    const view = new DataView(output);
    const str = (offset, text) =>
      [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
    str(0, "RIFF");
    view.setUint32(4, 36 + frames * 2, true);
    str(8, "WAVE");
    str(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, decoded.sampleRate, true);
    view.setUint32(28, decoded.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    str(36, "data");
    view.setUint32(40, frames * 2, true);
    const samples = decoded.getChannelData(0);
    for (let i = 0; i < frames; i++)
      view.setInt16(
        44 + i * 2,
        Math.max(-1, Math.min(1, samples[i])) * 32767,
        true,
      );
    await context.close();
    return {
      wav: Array.from(new Uint8Array(output)),
      duration: decoded.duration,
      sampleRate: decoded.sampleRate,
    };
  }, base64);
  fs.writeFileSync(
    "tmp/native-media-proof/every-single-mile-12s.wav",
    Buffer.from(wav.wav),
  );
  console.log(
    "Decoded owner M4A:",
    wav.duration,
    "seconds,",
    wav.sampleRate,
    "Hz; wrote 12s WAV derivative",
  );
  const video = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 180;
    const ctx = canvas.getContext("2d");
    const stream = canvas.captureStream(12);
    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp8",
    });
    const chunks = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    const done = new Promise((resolve) => (recorder.onstop = resolve));
    recorder.start();
    let frame = 0;
    const timer = setInterval(() => {
      ctx.fillStyle = "#0b111b";
      ctx.fillRect(0, 0, 320, 180);
      ctx.fillStyle = "#b58b54";
      ctx.font = "24px sans-serif";
      ctx.fillText("TapConnect · Video", 25, 80);
      ctx.fillText(String(frame++), 150, 120);
    }, 80);
    await new Promise((r) => setTimeout(r, 3000));
    recorder.stop();
    await done;
    clearInterval(timer);
    stream.getTracks().forEach((t) => t.stop());
    return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()));
  });
  fs.writeFileSync(
    "tmp/native-media-proof/test-video.webm",
    Buffer.from(video),
  );
  for (const [name, mime, path] of [
    ["Every single mile · original.m4a", "audio/mp4", audioPath],
    [
      "Every single mile · WAV sample.wav",
      "audio/wav",
      "tmp/native-media-proof/every-single-mile-12s.wav",
    ],
    [
      "Native media video fixture.webm",
      "video/webm",
      "tmp/native-media-proof/test-video.webm",
    ],
  ]) {
    let asset;
    if (mime === "audio/mp4" && process.env.NATIVE_MEDIA_EXISTING_AUDIO_ASSET_ID) {
      const response = await api.get("/api/media?kind=audio&limit=100");
      if (!response.ok()) throw Error("Authorized audio library unavailable");
      const data = await response.json();
      asset = data.assets.find(a => a.id === process.env.NATIVE_MEDIA_EXISTING_AUDIO_ASSET_ID && a.mimeType === "audio/mp4");
      if (!asset) throw Error("Registered audio Asset is not in this workspace");
      console.log("Reused existing private audio Asset", asset.id);
    } else {
      const response = await api.post("/api/media/upload", {
        multipart: {
          file: { name, mimeType: mime, buffer: fs.readFileSync(path) },
        },
      });
      const data = await response.json();
      if (!response.ok()) throw Error(JSON.stringify(data));
      asset = data.asset;
      console.log("Uploaded", name, asset.id, asset.mimeType);
    }
    fs.writeFileSync(
      "tmp/native-media-proof/" +
        (mime === "audio/mp4"
          ? "m4a"
          : mime === "audio/wav"
            ? "wav"
            : "video") +
        "-asset.json",
      JSON.stringify(asset),
    );
  }
  await api.storageState({ path: "tmp/native-media-proof/auth.json" });
  await browser.close();
  await api.dispose();
}

async function create() {
  const api = await request.newContext({
    baseURL: baseURL,
    storageState: "tmp/native-media-proof/auth.json",
  });
  const res = await api.post("/api/experiences", {
    data: {
      name: "Native Media Validation",
      clientName: "The Forecast · EverEncore",
      experienceType: "DEMO",
      startMode: "blank",
    },
  });
  const data = await res.json();
  if (!res.ok()) throw Error(JSON.stringify(data));
  fs.writeFileSync(
    "tmp/native-media-proof/document.json",
    JSON.stringify(data.document, null, 2),
  );
  console.log("Created isolated validation document", data.document.id);
  await api.dispose();
}

async function configure() {
  const api = await request.newContext({
    baseURL: baseURL,
    storageState: "tmp/native-media-proof/auth.json",
  });
  const original = JSON.parse(
    fs.readFileSync("tmp/native-media-proof/document.json"),
  );
  const document = (
    await (await api.get("/api/experiences/" + original.id)).json()
  ).document;
  const draft = document.draft;
  const read = (name) =>
    JSON.parse(
      fs.readFileSync("tmp/native-media-proof/" + name + "-asset.json"),
    );
  const wav = read("wav"),
    m4a = read("m4a"),
    video = read("video");
  const assetResponse = await api.get("/api/media?limit=100");
  const assets = (await assetResponse.json()).assets;
  const artwork = assets.find(
    (a) =>
      /forecast/i.test(a.filename || "") && a.mimeType.startsWith("image/"),
  );
  const node = (id, asset, variant, index) => ({
    id,
    primitive: "audio",
    name: variant + " Audio Player",
    compositionKind: "module",
    parentId: null,
    order: index,
    x: 0.05,
    y: 0.05,
    width: 0.9,
    height: 0.5,
    zIndex: index + 1,
    visible: true,
    props: {
      elementKind: "audio",
      src: asset.url,
      mediaAssetId: asset.id,
      mediaMimeType: asset.mimeType,
      audioTitle:
        variant === "compact"
          ? "Every single mile · original"
          : "Every single mile · WAV sample",
      audioArtist: "Owner-supplied playback validation",
      audioAlbum: "Native media validation",
      audioDescription:
        "Reusable native playback in a dark navy and bronze Studio surface.",
      audioVariant: variant,
      audioAccent: "#c49a68",
      fill: "#0b1626",
      borderColor: "#b68c5544",
      borderWidth: 1,
      artworkUrl: artwork?.url || "",
      artwork: artwork ? { mediaAssetId: artwork.id } : undefined,
      artworkFit: "contain",
      artworkAspect: "square",
      relatedVideo: {
        mediaAssetId: video.id,
        url: video.url,
        mimeType: video.mimeType,
      },
      flowWidthPercent: 100,
      flowAlignment: "stretch",
      aspectLocked: false,
    },
  });
  const home = draft.experience.pages[0];
  home.slug = "home";
  home.composition.rootComposition.nodes = [
    node("audio-featured", wav, "featured", 0),
    node("audio-compact", m4a, "compact", 1),
  ];
  home.composition.rootComposition.background = {
    kind: "solid",
    value: "#080f1c",
  };
  const song = structuredClone(home);
  song.pageId = "native-song-page";
  song.slug = "song";
  song.title = "Song";
  song.navLabel = "Song";
  song.navOrder = 1;
  song.navigationSlot = 1;
  song.navDestinationPageId = song.pageId;
  song.composition.rootComposition.id = "native-song-root";
  song.composition.rootComposition.nodes = [
    node("audio-expanded", wav, "expanded", 0),
  ];
  draft.experience.pages = [home, song];
  draft.rootComposition = home.composition.rootComposition;
  draft.surfaceColor = "#080f1c";
  draft.utilityLayer.enabled = false;
  const saved = await api.put("/api/card/documents/" + document.id, {
    data: { draft, expectedRevision: document.draftRevision },
  });
  const saveData = await saved.json();
  if (!saved.ok()) throw Error(JSON.stringify(saveData));
  console.log("Saved audio components", saved.status(), saveData.revision);
  fs.writeFileSync(
    "tmp/native-media-proof/saved-document.json",
    JSON.stringify(saveData.document, null, 2),
  );
  const published = await api.post(
    "/api/experiences/" + document.id + "/publication",
    { data: { action: "publish", expectedDraftRevision: saveData.revision } },
  );
  const publication = await published.json();
  if (!published.ok()) throw Error(JSON.stringify(publication));
  console.log(
    "Published local validation Experience",
    JSON.stringify(publication),
  );
  fs.writeFileSync(
    "tmp/native-media-proof/publication.json",
    JSON.stringify(publication, null, 2),
  );
  const preview = await api.post("/api/preview/card/session", {
    data: {
      documentId: document.id,
      profile: { displayName: "The Forecast", organization: "EverEncore" },
      businessName: "The Forecast",
      mode: "freeze",
      revision: saveData.revision,
    },
  });
  const previewData = await preview.json();
  console.log("Phone preview created", preview.status());
  fs.writeFileSync(
    "tmp/native-media-proof/preview.json",
    JSON.stringify(previewData, null, 2),
  );
  await api.dispose();
}

(async () => {
  await prepare();
  await create();
  await configure();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
