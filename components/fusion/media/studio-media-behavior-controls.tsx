"use client";
import type { CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";
import type { CardEditorLiveModel } from "@/components/fusion/card/card-editor-live";
import {
  readStudioMediaBehavior,
  patchStudioMediaBehavior,
  type StudioMediaBehavior,
} from "@/lib/fusion/creative-studio/platform/media-behavior";
import { StudioPrecisionControl } from "@/components/fusion/card/reconstitution/studio-precision-control";

export function StudioMediaBehaviorControls({
  node,
  model,
  hasVideo,
}: {
  node: CreativeCompositionNode;
  model: CardEditorLiveModel;
  hasVideo: boolean;
}) {
  const behavior = readStudioMediaBehavior(node.props);
  const patch = (change: Partial<StudioMediaBehavior>, label: string) =>
    model.patchCompositionNode(
      node.id,
      {
        props: {
          ...node.props,
          mediaBehavior: patchStudioMediaBehavior(node.props, change),
        },
      },
      label,
    );
  const select = (
    label: string,
    value: string,
    options: [string, string][],
    change: (value: string) => void,
  ) => (
    <label className="block text-xs">
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(event) => change(event.target.value)}
        className="mt-1 min-h-11 w-full rounded-lg bg-[#0b111b] px-3"
      >
        {options.map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <section
      className="space-y-3 rounded-xl border border-white/10 p-3"
      data-testid="studio-media-behavior-controls"
    >
      <h4 className="text-xs font-semibold">Playback behavior</h4>
      {select(
        "Initial playback",
        behavior.initialPlayback,
        [
          ["manual", "Manual"],
          ["autoplay", "Autoplay when permitted"],
        ],
        (value) =>
          patch(
            {
              initialPlayback: value as StudioMediaBehavior["initialPlayback"],
            },
            "Changed initial media playback",
          ),
      )}
      <p className="text-[10px] leading-4 text-white/55">
        Audible autoplay is never guaranteed. A blocked attempt leaves a visible
        Play button. Autoplay does not interrupt another session or retry after
        a visitor pauses or closes playback.
      </p>
      {select(
        "Loop",
        behavior.loop,
        [
          ["off", "Off"],
          ["current", "Current track"],
        ],
        (value) =>
          patch(
            { loop: value as StudioMediaBehavior["loop"] },
            "Changed media loop",
          ),
      )}
      <StudioPrecisionControl
        label="Media start position"
        value={behavior.startSeconds}
        descriptor={{
          unit: "number",
          min: 0,
          max: 86400,
          step: 0.1,
          defaultValue: 0,
        }}
        onBegin={model.beginLiveAdjustment}
        onPreview={(value) =>
          model.previewCompositionNode?.(node.id, {
            props: {
              ...node.props,
              mediaBehavior: patchStudioMediaBehavior(node.props, {
                startSeconds: value,
              }),
            },
          })
        }
        onCommit={() =>
          model.commitLiveAdjustment?.("Changed media start position")
        }
        onCancel={model.cancelLiveAdjustment}
      />
      <p className="text-[10px] text-white/50">
        Seconds from the beginning; clamped to the available duration.
      </p>
      {select(
        "Completion behavior",
        behavior.completion,
        [
          ["stop", "Stop"],
          ["replay", "Replay"],
        ],
        (value) =>
          patch(
            { completion: value as StudioMediaBehavior["completion"] },
            "Changed media completion",
          ),
      )}
      <p className="text-[10px] leading-4 text-white/50">
        Stop leaves the playhead at the end. Replay resets to the start position
        and offers a Replay button. Only Loop repeats automatically; Loop takes
        precedence.
      </p>
      <label className="flex min-h-11 items-center gap-3 text-xs">
        <input
          type="checkbox"
          checked={behavior.continuity}
          onChange={(event) =>
            patch(
              { continuity: event.target.checked },
              "Changed media page continuity",
            )
          }
        />
        Continue audio across Experience Pages
      </label>
      <p className="text-[10px] text-white/50">
        Audio only. Native video remains page-local.
      </p>
      <label className="block text-xs">
        Initial media presentation
        <select
          aria-label="Initial media presentation"
          value={behavior.presentation}
          onChange={(event) =>
            patch(
              { presentation: event.target.value as "audio" | "video" },
              "Changed initial media presentation",
            )
          }
          className="mt-1 min-h-11 w-full rounded-lg bg-[#0b111b] px-3"
        >
          <option value="audio">Audio</option>
          <option value="video" disabled={!hasVideo}>
            Video{hasVideo ? "" : " — select a related video first"}
          </option>
        </select>
      </label>
      <label className="flex min-h-11 items-center gap-3 text-xs">
        <input
          type="checkbox"
          checked={behavior.artworkVisible}
          onChange={(event) =>
            patch(
              { artworkVisible: event.target.checked },
              "Changed media artwork visibility",
            )
          }
        />
        Display artwork
      </label>
      <h5 className="text-xs font-semibold">Supported controls</h5>
      {(
        Object.entries({
          progress: "Show seek progress",
          time: "Show elapsed and total time",
          volume: "Show volume where supported",
          mute: "Show mute",
          expand: "Show expansion control",
          nativeVideo: "Show native video controls",
        }) as [keyof StudioMediaBehavior["controls"], string][]
      ).map(([key, label]) => (
        <label key={key} className="flex min-h-11 items-center gap-3 text-xs">
          <input
            type="checkbox"
            checked={behavior.controls[key]}
            onChange={(event) =>
              patch(
                {
                  controls: {
                    ...behavior.controls,
                    [key]: event.target.checked,
                  },
                },
                `Changed media ${label.toLowerCase()}`,
              )
            }
          />
          {label}
        </label>
      ))}
      <p className="text-[10px] leading-4 text-white/50">
        Play/Pause and autoplay fallback always remain usable. On iOS, volume is
        controlled by the device. Browser-owned video controls are shown or
        hidden as one set.
      </p>
    </section>
  );
}
