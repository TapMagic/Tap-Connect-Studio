"use client";
import type { CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";
import type { CardEditorLiveModel } from "@/components/fusion/card/card-editor-live";
import { StudioPrecisionControl } from "@/components/fusion/card/reconstitution/studio-precision-control";
import { StudioMediaBehaviorControls } from "./studio-media-behavior-controls";
import { MediaAssetSelect } from "./media-asset-select";
import { patchStudioMediaBehavior } from "@/lib/fusion/creative-studio/platform/media-behavior";
import { readStudioAudioState } from "@/lib/fusion/creative-studio/platform/audio-module";

export function StudioAudioControls({
  node,
  model,
}: {
  node: CreativeCompositionNode;
  model: CardEditorLiveModel;
}) {
  const state = readStudioAudioState(node.props);
  const patch = (props: Record<string, unknown>, label: string) =>
    model.patchCompositionNode(
      node.id,
      { props: { ...node.props, ...props } },
      label,
    );
  return (
    <div
      className="space-y-4 rounded-xl bg-white/4 p-3 text-white"
      data-testid="studio-audio-controls"
    >
      <h3 className="text-xs font-semibold">Audio Player</h3>
      <MediaAssetSelect
        kind="audio"
        value={state.mediaAssetId}
        uploadReady={model.mediaUploadReady}
        onChange={(asset) =>
          patch(
            {
              mediaAssetId: asset?.id,
              src: asset?.url || "",
              mediaMimeType: asset?.mimeType,
              audioTitle:
                state.title === "Audio track" && asset?.filename
                  ? asset.filename.replace(/\.[^.]+$/, "")
                  : state.title,
            },
            asset ? "Selected audio MediaAsset" : "Removed audio MediaAsset",
          )
        }
      />
      <StudioMediaBehaviorControls
        node={node}
        model={model}
        hasVideo={Boolean(state.relatedVideo?.mediaAssetId)}
      />
      <label className="block text-xs">
        Presentation
        <select
          aria-label="Presentation"
          value={state.variant}
          onChange={(event) =>
            patch(
              { audioVariant: event.target.value },
              "Changed Audio presentation",
            )
          }
          className="mt-1 h-11 w-full rounded-lg bg-[#0b111b] px-3"
        >
          {["compact", "featured", "expanded"].map((variant) => (
            <option key={variant}>{variant}</option>
          ))}
        </select>
      </label>
      {[
        ["audioTitle", "Track title"],
        ["audioArtist", "Artist"],
        ["audioAlbum", "Album / single"],
        ["audioDescription", "Description"],
      ].map(([key, label]) => (
        <AudioTextField
          key={key}
          node={node}
          model={model}
          field={key}
          label={label}
          multiline={key === "audioDescription"}
        />
      ))}
      <label className="flex min-h-11 items-center justify-between text-xs">
        Control accent
        <input
          type="color"
          value={state.accent}
          onChange={(event) =>
            patch({ audioAccent: event.target.value }, "Changed Audio accent")
          }
        />
      </label>
      <label className="block text-xs">
        Artwork fit
        <select
          aria-label="Artwork fit"
          value={String(node.props.artworkFit || "cover")}
          onChange={(event) =>
            patch(
              { artworkFit: event.target.value },
              "Changed Audio artwork fit",
            )
          }
          className="mt-1 h-11 w-full rounded-lg bg-[#0b111b] px-3"
        >
          <option>cover</option>
          <option>contain</option>
        </select>
      </label>
      <label className="block text-xs">
        Artwork aspect
        <select
          aria-label="Artwork aspect"
          value={String(node.props.artworkAspect || "square")}
          onChange={(event) =>
            patch(
              { artworkAspect: event.target.value },
              "Changed Audio artwork aspect",
            )
          }
          className="mt-1 h-11 w-full rounded-lg bg-[#0b111b] px-3"
        >
          <option>square</option>
          <option>portrait</option>
          <option>landscape</option>
        </select>
      </label>
      {["X", "Y"].map((axis) => (
        <StudioPrecisionControl
          key={axis}
          label={`Artwork focal ${axis}`}
          value={Number(node.props[`artworkFocal${axis}`] ?? 50)}
          descriptor={{
            unit: "%",
            min: 0,
            max: 100,
            step: 1,
            defaultValue: 50,
          }}
          onBegin={model.beginLiveAdjustment}
          onPreview={(value) =>
            model.previewCompositionNode?.(node.id, {
              props: { ...node.props, [`artworkFocal${axis}`]: value },
            })
          }
          onCommit={() =>
            model.commitLiveAdjustment?.(`Changed Audio artwork focal ${axis}`)
          }
          onCancel={model.cancelLiveAdjustment}
        />
      ))}
      <label className="flex min-h-11 items-center gap-3 text-xs">
        <input
          type="checkbox"
          checked={node.props.artworkAtmosphere === true}
          onChange={(event) =>
            patch(
              { artworkAtmosphere: event.target.checked },
              "Changed Audio artwork atmosphere",
            )
          }
        />
        Atmospheric artwork background
      </label>
      <h4 className="text-xs font-semibold">Related music video (optional)</h4>
      <MediaAssetSelect
        kind="video"
        value={String(
          (node.props.relatedVideo as { mediaAssetId?: string } | undefined)
            ?.mediaAssetId || "",
        )}
        uploadReady={model.mediaUploadReady}
        onChange={(asset) =>
          patch(
            {
              ...(!asset
                ? {
                    mediaBehavior: patchStudioMediaBehavior(node.props, {
                      presentation: "audio",
                    }),
                  }
                : {}),
              relatedVideo: asset
                ? {
                    mediaAssetId: asset.id,
                    url: asset.url,
                    mimeType: asset.mimeType,
                  }
                : undefined,
            },
            asset
              ? "Selected related music video"
              : "Removed related music video",
          )
        }
      />
      <p className="text-[10px] leading-4 text-white/50">
        Playback follows the settings above. A second track replaces the current
        track. Related video loads only when selected or configured as the
        initial presentation. Browser codec support varies.
      </p>
    </div>
  );
}

function AudioTextField({
  node,
  model,
  field,
  label,
  multiline,
}: {
  node: CreativeCompositionNode;
  model: CardEditorLiveModel;
  field: string;
  label: string;
  multiline: boolean;
}) {
  const common = {
    value: String(node.props[field] || ""),
    onFocus: () => model.beginLiveAdjustment?.(),
    onChange: (event: { target: { value: string } }) =>
      model.previewCompositionNode?.(node.id, {
        props: { ...node.props, [field]: event.target.value },
      }),
    onBlur: () => model.commitLiveAdjustment?.(`Changed Audio ${label}`),
    onKeyDown: (
      event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      event.stopPropagation();
      if (event.key === "Escape") {
        event.preventDefault();
        model.cancelLiveAdjustment?.();
        event.currentTarget.blur();
      } else if (
        event.key === "Enter" &&
        !multiline &&
        !event.nativeEvent.isComposing
      ) {
        event.preventDefault();
        event.currentTarget.blur();
      }
    },
  };
  return (
    <label className="block text-xs">
      {label}
      {multiline ? (
        <textarea
          {...common}
          className="mt-1 min-h-20 w-full rounded-lg bg-black/20 p-3"
        />
      ) : (
        <input
          {...common}
          className="mt-1 h-10 w-full rounded-lg bg-black/20 px-3"
        />
      )}
    </label>
  );
}
