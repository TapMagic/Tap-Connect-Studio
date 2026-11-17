/* eslint-disable @next/next/no-img-element -- Library images use canonical authorized URLs. */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  clampMediaStart,
  supportsMediaVolume,
} from "@/lib/fusion/creative-studio/platform/media-behavior";
import { Music2, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import {
  claimMediaPlayback,
  observeMediaOwnership,
  mediaSupport,
  mayAttemptMediaAutoplay,
  ownsMediaPlayback,
} from "@/lib/fusion/creative-studio/platform/media-playback";
import {
  audioTime,
  readStudioAudioState,
  type StudioAudioTrack,
} from "@/lib/fusion/creative-studio/platform/audio-module";
import { resolveMaterialSurfaceFromProps } from "@/lib/fusion/creative-studio/material-surface";
import "./native-media.css";
import { NativeVideo } from "./native-video";
import { MaterialSurfaceLayers } from "@/components/fusion/creative-studio/material-surface-layers";

const subscribePlatform = () => () => {};
const platformVolume = () =>
  typeof navigator === "undefined" || supportsMediaVolume(navigator);
const initial = {
  completed: false,
  playing: false,
  loading: false,
  time: 0,
  duration: 0,
  volume: 1,
  muted: false,
  error: "",
};
type Playback = typeof initial;
type Controller = Playback & {
  track: StudioAudioTrack | null;
  toggle: (track: StudioAudioTrack, automatic?: boolean) => void;
  requestAutoplay: (track: StudioAudioTrack) => void;
  releaseView: (assetId: string) => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  mute: () => void;
  close: () => void;
  reportVisibility: (view: Element, assetId: string, visible: boolean) => void;
};
const AudioContext = createContext<Controller | null>(null);

/** One DOM audio element per experience, outside the keyed page subtree. */
export function ExperienceAudioProvider({
  children,
  persistent = false,
}: {
  children: ReactNode;
  persistent?: boolean;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const trackRef = useRef<StudioAudioTrack | null>(null);
  const requestGeneration = useRef(0);
  const pendingStart = useRef<number | null>(null);
  const intendedPlayback = useRef(false);
  const attemptedAutoplay = useRef(new Set<string>());
  const userEngaged = useRef(false);
  const [track, setTrack] = useState<StudioAudioTrack | null>(null);
  const [state, setState] = useState<Playback>(initial);
  const toggleRef = useRef<Controller["toggle"]>(() => {});
  const requestAutoplay = useCallback((next: StudioAudioTrack) => {
    const key = `${next.mediaAssetId}:${next.url}`;
    if (attemptedAutoplay.current.has(key)) return;
    attemptedAutoplay.current.add(key);
    const element = audio.current;
    if (
      !element ||
      trackRef.current ||
      userEngaged.current ||
      !mayAttemptMediaAutoplay(element.ownerDocument)
    )
      return;
    toggleRef.current(next, true);
  }, []);
  const releaseView = useCallback((assetId: string) => {
    if (
      trackRef.current?.mediaAssetId === assetId &&
      !trackRef.current.behavior.continuity
    ) {
      userEngaged.current = true;
      intendedPlayback.current = false;
      requestGeneration.current++;
      audio.current?.pause();
      audio.current?.removeAttribute("src");
      audio.current?.load();
      trackRef.current = null;
      setTrack(null);
      setState((previous) => ({
        ...previous,
        playing: false,
        time: 0,
        duration: 0,
        completed: false,
        error: "",
        loading: false,
      }));
    }
  }, []);
  const [visibleViews, setVisibleViews] = useState<Map<Element, string>>(
    () => new Map(),
  );
  const reportVisibility = useCallback(
    (view: Element, assetId: string, visible: boolean) => {
      setVisibleViews((current) => {
        if (visible ? current.get(view) === assetId : !current.has(view))
          return current;
        const next = new Map(current);
        if (visible) next.set(view, assetId);
        else next.delete(view);
        return next;
      });
    },
    [],
  );
  const update = (patch: Partial<Playback>) =>
    setState((old) => ({ ...old, ...patch }));
  useEffect(() => {
    const element = audio.current!;
    const release = observeMediaOwnership(element);
    return () => {
      release();
      element.pause();
      element.removeAttribute("src");
      element.load();
    };
  }, []);
  const controller: Controller = {
    ...state,
    track,
    reportVisibility,
    requestAutoplay,
    releaseView,
    toggle(next, automatic = false) {
      if (!automatic) userEngaged.current = true;
      const generation = ++requestGeneration.current;
      const element = audio.current;
      if (!element || !next.mediaAssetId || !next.url) return;
      if (
        trackRef.current?.mediaAssetId === next.mediaAssetId &&
        trackRef.current?.url === next.url &&
        !element.paused &&
        !element.error &&
        !state.error
      ) {
        intendedPlayback.current = false;
        element.pause();
        return;
      }
      if (
        next.mimeType &&
        mediaSupport(element, next.mimeType) === "unsupported"
      ) {
        element.pause();
        element.removeAttribute("src");
        element.load();
        trackRef.current = next;
        setTrack(next);
        update({
          playing: false,
          loading: false,
          time: 0,
          duration: 0,
          error:
            "This browser does not support this audio format. Choose another format or browser.",
        });
        return;
      }
      if (!automatic) claimMediaPlayback(element);
      if (
        trackRef.current?.mediaAssetId !== next.mediaAssetId ||
        trackRef.current?.url !== next.url
      ) {
        element.pause();
        trackRef.current = next;
        setTrack(next);
        update({
          time: 0,
          duration: 0,
          error: "",
          loading: true,
          completed: false,
        });
        pendingStart.current = next.behavior.startSeconds;
        element.src = next.url;
      } else {
        update({ error: "", loading: true });
        if (element.ended || state.completed)
          element.currentTime = clampMediaStart(
            next.behavior.startSeconds,
            element.duration,
          );
        trackRef.current = next;
        setTrack(next);
        update({ completed: false });
        if (element.error || state.error) {
          pendingStart.current = next.behavior.startSeconds;
          element.removeAttribute("src");
          element.load();
          element.src = `${next.url}${next.url.includes("?") ? "&" : "?"}retry=${generation}`;
          element.load();
        }
      }
      intendedPlayback.current = true;
      // play() stays in the user activation stack for Safari and iOS.
      void element.play().catch((error: DOMException) => {
        if (
          generation !== requestGeneration.current ||
          error.name === "AbortError" ||
          trackRef.current?.mediaAssetId !== next.mediaAssetId
        )
          return;
        intendedPlayback.current = false;
        update({
          playing: false,
          loading: false,
          error:
            error.name === "NotAllowedError"
              ? "Playback was blocked. Tap Play to try again."
              : "Unable to play this track. Check your connection or choose another audio asset.",
        });
      });
    },
    seek(time) {
      const element = audio.current;
      if (
        element &&
        Number.isFinite(element.duration) &&
        element.seekable.length
      ) {
        const target = Math.max(0, Math.min(element.duration, time));
        element.currentTime = target;
        update({ time: target, completed: false });
      }
    },
    setVolume(volume) {
      if (audio.current && platformVolume()) {
        audio.current.volume = Math.max(0, Math.min(1, volume));
        audio.current.muted = volume === 0;
        update({ volume: audio.current.volume, muted: audio.current.muted });
      }
    },
    mute() {
      if (audio.current) {
        audio.current.muted = !audio.current.muted;
        update({ muted: audio.current.muted });
      }
    },
    close() {
      intendedPlayback.current = false;
      userEngaged.current = true;
      requestGeneration.current++;
      if (audio.current) {
        audio.current.pause();
        if (platformVolume()) audio.current.volume = 1;
        audio.current.muted = false;
        audio.current.removeAttribute("src");
        audio.current.load();
      }
      trackRef.current = null;
      setTrack(null);
      setState(initial);
    },
  };
  useEffect(() => {
    toggleRef.current = controller.toggle;
  });
  const applyStart = (element: HTMLAudioElement) => {
    if (pendingStart.current == null || !Number.isFinite(element.duration))
      return;
    const target = clampMediaStart(pendingStart.current, element.duration);
    pendingStart.current = null;
    element.currentTime = target;
    update({ time: target });
  };
  return (
    <AudioContext.Provider value={controller}>
      <audio
        ref={audio}
        preload="metadata"
        data-testid="experience-audio-engine"
        onPlay={(event) => {
          const playing =
            !event.currentTarget.paused && !event.currentTarget.error;
          if (playing) intendedPlayback.current = true;
          update({ playing });
        }}
        onPause={(event) => {
          const element = event.currentTarget;
          if (element.paused && !element.ended)
            intendedPlayback.current = false;
          update({
            playing: !element.paused && !element.error,
            loading: false,
          });
        }}
        onPlaying={(event) => {
          const playing =
            !event.currentTarget.paused && !event.currentTarget.error;
          update({
            playing,
            loading: false,
            ...(playing ? { error: "" } : {}),
          });
        }}
        onWaiting={() => update({ loading: true })}
        onStalled={() => update({ loading: true })}
        onLoadedMetadata={(event) => applyStart(event.currentTarget)}
        onCanPlay={(event) => {
          applyStart(event.currentTarget);
          update({ loading: false });
        }}
        onSeeking={() => update({ loading: true })}
        onSeeked={() => update({ loading: false })}
        onTimeUpdate={(e) => update({ time: e.currentTarget.currentTime })}
        onDurationChange={(e) =>
          update({
            duration: Number.isFinite(e.currentTarget.duration)
              ? e.currentTarget.duration
              : 0,
          })
        }
        onVolumeChange={(e) =>
          update({
            volume: e.currentTarget.volume,
            muted: e.currentTarget.muted,
          })
        }
        onEnded={(event) => {
          const element = event.currentTarget;
          if (!element.ended) return;
          const behavior = trackRef.current?.behavior;
          if (!behavior) return;
          const start = clampMediaStart(
            behavior.startSeconds,
            element.duration,
          );
          if (
            behavior.loop === "current" &&
            intendedPlayback.current &&
            ownsMediaPlayback(element)
          ) {
            element.currentTime = start;
            update({ time: start, completed: false });
            const generation = requestGeneration.current;
            void element.play().catch((error: DOMException) => {
              if (
                generation !== requestGeneration.current ||
                error.name === "AbortError"
              )
                return;
              intendedPlayback.current = false;
              update({
                playing: false,
                loading: false,
                error: "Playback stopped. Tap Play to continue.",
              });
            });
          } else {
            if (behavior.completion === "replay") element.currentTime = start;
            update({
              playing: false,
              loading: false,
              completed: true,
              ...(behavior.completion === "replay" ? { time: start } : {}),
            });
          }
        }}
        onError={() => {
          intendedPlayback.current = false;
          if (trackRef.current)
            update({
              playing: false,
              loading: false,
              error:
                "Audio unavailable. The file may be missing, inaccessible, or unsupported by this browser. Try Play again.",
            });
        }}
      />
      {children}
      {persistent &&
      track &&
      ![...visibleViews.values()].includes(track.mediaAssetId) ? (
        <aside
          aria-label="Now playing"
          className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+6.25rem)] left-1/2 z-[1195] -translate-x-1/2 w-[min(94%,430px)] rounded-2xl border border-white/20 bg-[#0b111b]/95 p-3 text-white shadow-2xl backdrop-blur-xl"
          data-testid="experience-audio-dock"
        >
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-xs">{track.title}</strong>
              <span className="text-[10px] text-white/60">{track.artist}</span>
            </div>
            <button
              type="button"
              className="min-h-11 min-w-11"
              onClick={() => controller.toggle(track)}
              aria-label={state.playing ? "Pause audio" : "Play audio"}
            >
              {state.playing ? (
                <Pause className="mx-auto h-5 w-5" />
              ) : (
                <Play className="mx-auto h-5 w-5" />
              )}
            </button>
            <button
              type="button"
              className="min-h-11 min-w-11"
              onClick={controller.close}
              aria-label="Close audio player"
            >
              <X className="mx-auto h-4 w-4" />
            </button>
          </div>
          {state.error ? (
            <p role="status" className="text-xs text-amber-200">
              {state.error}
            </p>
          ) : null}
        </aside>
      ) : null}
    </AudioContext.Provider>
  );
}

export function NativeAudioPlayer({
  props,
  editMode = false,
}: {
  props: Record<string, unknown>;
  editMode?: boolean;
}) {
  const track = readStudioAudioState(props);
  const [expansion, setExpansion] = useState<{
    variant: string;
    expanded: boolean;
  } | null>(null);
  const expanded =
    expansion && expansion.variant === track.variant
      ? expansion.expanded
      : track.variant === "expanded";
  const setExpanded = (next: boolean | ((current: boolean) => boolean)) =>
    setExpansion({
      variant: track.variant,
      expanded: typeof next === "function" ? next(expanded) : next,
    });
  const [modeOverride, setModeOverride] = useState<{
    preference: string;
    mode: "audio" | "video";
  } | null>(null);
  const mode = track.relatedVideo?.url
    ? modeOverride?.preference === track.behavior.presentation
      ? modeOverride.mode
      : track.behavior.presentation
    : "audio";
  const setMode = (mode: "audio" | "video") =>
    setModeOverride({ preference: track.behavior.presentation, mode });
  const volumeSupported = useSyncExternalStore(
    subscribePlatform,
    platformVolume,
    () => true,
  );
  const video = useRef<HTMLVideoElement>(null);
  const switchTime = useRef(0);
  const controller = useContext(AudioContext);
  const view = useRef<HTMLElement>(null);
  const requestAutoplay = controller?.requestAutoplay;
  const releaseView = controller?.releaseView;
  useEffect(
    () => () => releaseView?.(String(props.mediaAssetId || "")),
    [releaseView, props.mediaAssetId],
  );
  useEffect(() => {
    const element = view.current;
    if (
      !element ||
      !requestAutoplay ||
      editMode ||
      mode !== "audio" ||
      modeOverride !== null ||
      track.behavior.initialPlayback !== "autoplay" ||
      typeof IntersectionObserver === "undefined" ||
      !track.url ||
      !track.mediaAssetId
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && entries[0].intersectionRatio >= 0.25)
          requestAutoplay(readStudioAudioState(props));
      },
      { threshold: 0.25 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [
    requestAutoplay,
    editMode,
    mode,
    modeOverride,
    track.behavior.initialPlayback,
    track.url,
    track.mediaAssetId,
    props,
  ]);
  const reportVisibility = controller?.reportVisibility;
  const viewAssetId = String(props.mediaAssetId || "");
  useEffect(() => {
    const element = view.current;
    if (!element || !reportVisibility || !viewAssetId) return;
    if (typeof IntersectionObserver === "undefined") {
      reportVisibility(element, viewAssetId, true);
      return () => reportVisibility(element, viewAssetId, false);
    }
    const observer = new IntersectionObserver(
      (entries) =>
        reportVisibility(
          element,
          viewAssetId,
          entries[0].isIntersecting && entries[0].intersectionRatio >= 0.25,
        ),
      { threshold: [0, 0.25] },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      reportVisibility(element, viewAssetId, false);
    };
  }, [reportVisibility, viewAssetId]);
  if (!controller)
    return (
      <ExperienceAudioProvider>
        <NativeAudioPlayer props={props} editMode={editMode} />
      </ExperienceAudioProvider>
    );
  const selected =
    controller.track?.mediaAssetId === track.mediaAssetId &&
    controller.track?.url === track.url;
  const state = selected ? controller : initial;
  const surface = resolveMaterialSurfaceFromProps(
    { fill: "#0b111b", borderColor: "#ffffff24", borderWidth: 1, ...props },
    "container",
  );
  const presentation = expanded
    ? "expanded"
    : track.variant === "expanded"
      ? "featured"
      : track.variant;
  const disabled = editMode || !track.mediaAssetId || !track.url;
  return (
    <section
      ref={view}
      aria-label={`${track.title} audio player`}
      data-audio-variant={presentation}
      data-studio-keyboard-owner="audio"
      className="relative h-full min-w-0 overflow-auto rounded-2xl text-white"
      style={
        {
          background: surface.background,
          border: `${surface.borderWidth}px ${surface.borderStyle} ${surface.borderColor}`,
          boxShadow: surface.boxShadow,
          opacity: surface.opacity,
          borderRadius: Number(props.borderRadius ?? 18),
          "--audio-accent": track.accent,
        } as CSSProperties
      }
      onKeyDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        if (!editMode) event.stopPropagation();
      }}
    >
      <MaterialSurfaceLayers surface={surface} testIdPrefix="audio-material" />
      {track.behavior.artworkVisible &&
      props.artworkAtmosphere === true &&
      track.artwork ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <img
            src={track.artwork}
            alt=""
            className="h-full w-full scale-125 object-cover opacity-20 blur-2xl"
          />
        </div>
      ) : null}
      <div
        className={`relative flex h-full min-w-0 flex-col justify-center gap-3 p-4 ${presentation === "expanded" ? "sm:p-6" : ""}`}
      >
        <div
          className={
            presentation === "compact" && !track.relatedVideo?.mediaAssetId
              ? "hidden"
              : "flex flex-wrap items-center justify-between gap-2"
          }
        >
          {track.behavior.controls.expand && presentation !== "compact" ? (
            <button
              type="button"
              disabled={editMode}
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
              className="min-h-11 rounded-full px-3 text-xs text-white/70 hover:bg-white/10"
            >
              {expanded ? "Collapse" : "Expand artwork & details"}
            </button>
          ) : (
            <span />
          )}
          {track.relatedVideo?.mediaAssetId ? (
            <div
              role="group"
              aria-label="Playback media"
              className="flex gap-2"
            >
              <button
                type="button"
                aria-pressed={mode === "audio"}
                disabled={editMode}
                className="min-h-11 px-3 text-xs aria-pressed:text-[var(--audio-accent)]"
                onClick={() => {
                  switchTime.current =
                    video.current?.currentTime || switchTime.current;
                  video.current?.pause();
                  setMode("audio");
                  if (selected) controller.seek(switchTime.current);
                }}
              >
                Audio
              </button>
              <button
                type="button"
                aria-pressed={mode === "video"}
                disabled={editMode}
                className="min-h-11 px-3 text-xs aria-pressed:text-[var(--audio-accent)]"
                onClick={() => {
                  switchTime.current = state.time;
                  if (state.playing) controller.toggle(track);
                  setMode("video");
                }}
              >
                Video
              </button>
            </div>
          ) : null}
        </div>
        {mode === "video" && track.relatedVideo?.url ? (
          <div className="aspect-video w-full">
            <NativeVideo
              interactive={!editMode}
              mediaRef={video}
              src={track.relatedVideo.url}
              mimeType={track.relatedVideo.mimeType}
              poster={
                track.behavior.artworkVisible
                  ? track.artwork || undefined
                  : undefined
              }
              controls={track.behavior.controls.nativeVideo}
              behavior={{
                ...track.behavior,
                initialPlayback:
                  editMode || modeOverride
                    ? "manual"
                    : track.behavior.initialPlayback,
              }}
              playsInline
              preload="metadata"
              className="h-full w-full object-contain"
              onLoadedMetadata={(event) => {
                event.currentTarget.currentTime = Math.min(
                  modeOverride
                    ? switchTime.current
                    : track.behavior.startSeconds,
                  event.currentTarget.duration || 0,
                );
              }}
            />
          </div>
        ) : null}
        <div
          className={`studio-audio-main flex min-w-0 gap-4 ${presentation === "expanded" ? "flex-col" : "items-center"}`}
        >
          {presentation !== "compact" &&
          track.behavior.artworkVisible &&
          mode === "audio" ? (
            <div
              style={{
                aspectRatio:
                  props.artworkAspect === "portrait"
                    ? "3 / 4"
                    : props.artworkAspect === "landscape"
                      ? "16 / 9"
                      : "1",
              }}
              className={`grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white/5 ${presentation === "expanded" ? "mx-auto w-full max-w-72" : "h-16 w-16"}`}
            >
              {track.artwork ? (
                <img
                  src={track.artwork}
                  alt=""
                  style={{
                    aspectRatio:
                      props.artworkAspect === "portrait"
                        ? "3 / 4"
                        : props.artworkAspect === "landscape"
                          ? "16 / 9"
                          : "1",
                    objectFit:
                      props.artworkFit === "contain" ? "contain" : "cover",
                    objectPosition: `${Number(props.artworkFocalX ?? 50)}% ${Number(props.artworkFocalY ?? 50)}%`,
                  }}
                  className="h-full w-full"
                />
              ) : (
                <Music2 className="h-7 w-7 text-white/40" aria-hidden />
              )}
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <h3
              className={`break-words font-semibold ${presentation === "expanded" ? "text-xl" : "text-sm"}`}
            >
              {track.title}
            </h3>
            {presentation !== "compact" && track.artist ? (
              <p className="mt-1 break-words text-xs text-white/60">
                {track.artist}
              </p>
            ) : null}
            {presentation !== "compact" && track.album ? (
              <p className="mt-1 text-xs text-white/50">{track.album}</p>
            ) : null}
            {presentation === "expanded" && track.description ? (
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/65">
                {track.description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            disabled={disabled || mode === "video"}
            onClick={() => controller.toggle(track)}
            aria-label={`${state.playing ? "Pause" : state.completed && track.behavior.completion === "replay" ? "Replay" : "Play"} ${track.title}`}
            className={
              mode === "video"
                ? "hidden"
                : "grid min-h-11 min-w-11 shrink-0 place-items-center self-center rounded-full bg-[var(--audio-accent)] text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:opacity-40"
            }
          >
            {state.playing ? (
              <Pause className="h-5 w-5" aria-hidden />
            ) : (
              <Play className="ml-0.5 h-5 w-5" aria-hidden />
            )}
          </button>
        </div>
        <div>
          {track.behavior.controls.progress && mode === "audio" ? (
            <input
              type="range"
              min={0}
              max={state.duration || 1}
              step={0.1}
              value={Math.min(state.time, state.duration || 1)}
              disabled={disabled || !state.duration}
              onChange={(e) => controller.seek(Number(e.target.value))}
              aria-label={`Seek ${track.title}`}
              aria-valuetext={`${audioTime(state.time)} of ${audioTime(state.duration)}`}
              className="block h-8 w-full cursor-pointer accent-[var(--audio-accent)] disabled:opacity-40"
            />
          ) : null}
          {track.behavior.controls.time && mode === "audio" ? (
            <div className="flex justify-between text-[11px] tabular-nums text-white/60">
              <span>{audioTime(state.time)}</span>
              <span>{audioTime(state.duration)}</span>
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {track.behavior.controls.mute && mode === "audio" ? (
            <button
              type="button"
              disabled={editMode}
              onClick={controller.mute}
              aria-label={controller.muted ? "Unmute audio" : "Mute audio"}
              aria-pressed={controller.muted}
              className="grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-white/10"
            >
              {controller.muted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
          ) : null}
          {track.behavior.controls.volume &&
          volumeSupported &&
          mode === "audio" ? (
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={controller.muted ? 0 : controller.volume}
              disabled={editMode}
              onChange={(e) => controller.setVolume(Number(e.target.value))}
              aria-label="Audio volume"
              className="h-8 w-24 max-w-[40%] accent-[var(--audio-accent)]"
            />
          ) : track.behavior.controls.volume &&
            !volumeSupported &&
            mode === "audio" ? (
            <span className="text-[10px] text-white/60">
              Use device volume buttons
            </span>
          ) : null}
          {presentation === "compact" && track.behavior.controls.expand ? (
            <button
              type="button"
              disabled={editMode}
              onClick={() => setExpanded(true)}
              className="min-h-11 px-2 text-xs text-white/70"
              aria-label="Expand artwork & details"
            >
              Details
            </button>
          ) : null}
          {mode === "audio" ? (
            <span role="status" className="ml-auto text-[10px] text-white/60">
              {editMode
                ? "Play in Preview"
                : state.loading
                  ? "Buffering…"
                  : !track.mediaAssetId
                    ? "Choose an audio asset"
                    : state.completed ||
                        (state.duration && state.time >= state.duration)
                      ? "Completed"
                      : ""}
            </span>
          ) : null}
        </div>
        {mode === "audio" && state.error ? (
          <p role="alert" className="text-xs leading-relaxed text-amber-200">
            {state.error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
