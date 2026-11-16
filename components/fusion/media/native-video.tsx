"use client";
import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type RefObject,
} from "react";
import {
  observeMediaOwnership,
  mayAttemptMediaAutoplay,
  ownsMediaPlayback,
  mediaSupport,
  type StudioMediaSource,
} from "@/lib/fusion/creative-studio/platform/media-playback";

import {
  clampMediaStart,
  readStudioMediaBehavior,
  type StudioMediaBehavior,
} from "@/lib/fusion/creative-studio/platform/media-behavior";

type Props = ComponentProps<"video"> & {
  mediaRef?: RefObject<HTMLVideoElement | null>;
  mimeType?: string;
  mediaSource?: StudioMediaSource;
  behavior?: StudioMediaBehavior;
  interactive?: boolean;
  userActivated?: boolean;
};
/** Native video presentation over the same HTMLMediaElement ownership contract as audio. */
export function NativeVideo({
  mediaRef,
  mimeType: declaredMimeType,
  mediaSource,
  behavior: suppliedBehavior,
  interactive = true,
  userActivated = false,
  ...inputProps
}: Props) {
  const mimeType = mediaSource?.mimeType || declaredMimeType;
  const props = { ...inputProps, src: mediaSource?.url || inputProps.src };
  const behavior =
    suppliedBehavior ||
    readStudioMediaBehavior({
      mediaBehavior: {
        initialPlayback: inputProps.autoPlay ? "autoplay" : "manual",
        loop: inputProps.loop ? "current" : "off",
      },
    });
  const ownRef = useRef<HTMLVideoElement>(null);
  const ref = mediaRef || ownRef;
  const frame = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [completed, setCompleted] = useState(false);
  const attempted = useRef(false);
  const intendedPlayback = useRef(false);
  const tryPlay = () => {
    const element = ref.current;
    if (!element || !interactive) return;
    setError("");
    setCompleted(false);
    if (element.ended)
      element.currentTime = clampMediaStart(
        behavior.startSeconds,
        element.duration,
      );
    intendedPlayback.current = true;
    void element.play().catch((error: DOMException) => {
      if (error.name === "AbortError") return;
      intendedPlayback.current = false;
      setPlaying(false);
      setError(
        error.name === "NotAllowedError"
          ? "Playback was blocked. Tap Play to start this video."
          : "Unable to play this video. Tap Play to retry.",
      );
    });
  };
  const playRef = useRef(tryPlay);
  useEffect(() => {
    playRef.current = tryPlay;
  });
  useEffect(() => {
    const element = ref.current;
    if (
      !element ||
      !interactive ||
      behavior.initialPlayback !== "autoplay" ||
      typeof IntersectionObserver === "undefined" ||
      attempted.current
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          !entries[0].isIntersecting ||
          entries[0].intersectionRatio < 0.25 ||
          attempted.current
        )
          return;
        attempted.current = true;
        if (userActivated || mayAttemptMediaAutoplay(element.ownerDocument))
          playRef.current();
      },
      { threshold: 0.25 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, behavior.initialPlayback, interactive, userActivated]);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const release = observeMediaOwnership(element);
    return () => {
      release();
      element.pause();
    };
  }, [ref]);
  useEffect(() => {
    if (
      ref.current &&
      mimeType &&
      mediaSupport(ref.current, mimeType) === "unsupported"
    )
      setError(
        "This browser cannot play this media format. Choose another format or browser.",
      );
    else setError("");
  }, [props.src, mimeType, ref]);
  return (
    <div
      ref={frame}
      onKeyDown={(event) => {
        if (event.key === "Escape" && expanded) {
          event.stopPropagation();
          setExpanded(false);
        }
      }}
      className={`relative bg-black ${expanded ? "fixed inset-0 z-[5000] flex flex-col justify-center overflow-auto p-[max(12px,env(safe-area-inset-top))]" : "h-full w-full"}`}
    >
      <video
        {...props}
        ref={ref}
        controls={interactive && props.controls}
        autoPlay={false}
        loop={false}
        onLoadedMetadata={(event) => {
          if (behavior.startSeconds > 0)
            event.currentTarget.currentTime = clampMediaStart(
              behavior.startSeconds,
              event.currentTarget.duration,
            );
          props.onLoadedMetadata?.(event);
        }}
        onPlay={(event) => {
          if (!event.currentTarget.paused && !event.currentTarget.error)
            intendedPlayback.current = true;
          setPlaying(!event.currentTarget.paused && !event.currentTarget.error);
          setCompleted(false);
          props.onPlay?.(event);
        }}
        onPause={(event) => {
          if (event.currentTarget.paused && !event.currentTarget.ended)
            intendedPlayback.current = false;
          setPlaying(!event.currentTarget.paused && !event.currentTarget.error);
          props.onPause?.(event);
        }}
        onEnded={(event) => {
          const element = event.currentTarget;
          if (!element.ended) return;
          if (
            behavior.loop === "current" &&
            intendedPlayback.current &&
            ownsMediaPlayback(element)
          ) {
            element.currentTime = clampMediaStart(
              behavior.startSeconds,
              element.duration,
            );
            playRef.current();
          } else {
            if (behavior.completion === "replay")
              element.currentTime = clampMediaStart(
                behavior.startSeconds,
                element.duration,
              );
            setPlaying(false);
            setCompleted(true);
          }
          props.onEnded?.(event);
        }}
        onError={(event) => {
          intendedPlayback.current = false;
          setError(
            "Video unavailable. This file may be inaccessible or use an unsupported codec. Try another format or browser.",
          );
          props.onError?.(event);
        }}
      />
      {!props.controls || !playing || error ? (
        <button
          type="button"
          disabled={!interactive}
          aria-label={
            playing
              ? "Pause video"
              : completed && behavior.completion === "replay"
                ? "Replay video"
                : "Play video"
          }
          className="absolute left-2 top-2 z-10 min-h-11 rounded-full bg-black/80 px-4 text-xs text-white"
          onClick={() => {
            if (playing && !error) {
              intendedPlayback.current = false;
              ref.current?.pause();
            } else {
              if (ref.current?.error) ref.current.load();
              tryPlay();
            }
          }}
        >
          {playing && !error
            ? "Pause"
            : completed && behavior.completion === "replay"
              ? "Replay"
              : "Play"}
        </button>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="absolute inset-x-0 bottom-0 bg-black/85 p-3 text-xs text-amber-200"
        >
          {error}
        </p>
      ) : null}
      {behavior.controls.expand ? (
        <button
          type="button"
          disabled={!interactive}
          aria-label={expanded ? "Collapse video" : "Expand video"}
          className="absolute right-2 top-2 z-10 min-h-11 rounded-full bg-black/80 px-3 text-xs text-white"
          onClick={async () => {
            if (expanded) {
              setExpanded(false);
              return;
            }
            const element = ref.current as
              | (HTMLVideoElement & { webkitEnterFullscreen?: () => void })
              | null;
            try {
              if (element?.requestFullscreen && document.fullscreenEnabled) {
                await element.requestFullscreen();
                return;
              }
              if (element?.webkitEnterFullscreen) {
                element.webkitEnterFullscreen();
                return;
              }
            } catch {
              /* In-page expansion remains available. */
            }
            setExpanded(true);
          }}
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      ) : null}
      {expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="min-h-11 p-3 text-white"
          onKeyDown={(event) => {
            if (event.key === "Escape") setExpanded(false);
          }}
        >
          Close expanded video
        </button>
      ) : null}
    </div>
  );
}
