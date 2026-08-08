import type {
  CreativeCompositionBlock,
  CreativeCompositionNode,
} from "@/lib/fusion/creative-studio/composition";
import {
  DEFAULT_IMAGE_TREATMENT,
  type CreativeFill,
  type CreativeRenderDocument,
} from "@/lib/fusion/creative-platform/model";

export function compositionBackgroundToFill(
  background: CreativeCompositionBlock["background"]
): CreativeFill {
  if (!background || background.kind === "none") return { kind: "none" };
  if (background.kind === "solid") {
    return { kind: "solid", color: background.value || "#0b0f19" };
  }
  if (background.kind === "gradient" && background.gradient) {
    return { kind: "gradient", gradient: background.gradient };
  }
  if (
    (background.kind === "pattern" || background.kind === "texture") &&
    background.pattern
  ) {
    return { kind: background.kind, pattern: background.pattern };
  }
  if (background.kind === "image" && background.image?.src) {
    return {
      kind: "image",
      media: {
        // Prefer durable Studio identity; fall back to URL so Owners never lose a visible image silently.
        mediaAssetId: background.image.mediaAssetId || background.image.src,
        fallbackUrl: background.image.fallbackUrl || background.image.src,
      },
      treatment: {
        focalPoint: {
          x: background.image.focalX,
          y: background.image.focalY,
        },
        fit:
          background.image.fit === "original"
            ? "contain"
            : background.image.fit,
        scale: background.image.scale,
        position: {
          x: background.image.focalX,
          y: background.image.focalY,
        },
        repeat: background.image.repeat,
        blurPx: background.image.blur,
        tint: background.image.overlayColor,
        overlayOpacity: background.image.overlayOpacity || 0,
        blendMode: background.image.blendMode || "normal",
        opacity: 1,
        decorative: background.image.decorative ?? true,
        altText: background.image.alt || "",
      },
    };
  }
  return { kind: "none" };
}

export function creativeFillToCompositionBackground(
  fill: CreativeFill
): CreativeCompositionBlock["background"] {
  if (fill.kind === "none") return { kind: "none" };
  if (fill.kind === "solid") return { kind: "solid", value: fill.color };
  if (fill.kind === "gradient") {
    return { kind: "gradient", gradient: fill.gradient };
  }
  if (fill.kind === "pattern" || fill.kind === "texture") {
    return { kind: fill.kind, pattern: fill.pattern };
  }
  return {
    kind: "image",
    image: {
      src: fill.media.fallbackUrl,
      fallbackUrl: fill.media.fallbackUrl,
      mediaAssetId: fill.media.mediaAssetId,
      fit: fill.treatment.fit,
      focalX: fill.treatment.focalPoint.x,
      focalY: fill.treatment.focalPoint.y,
      scale: fill.treatment.scale,
      repeat: fill.treatment.repeat,
      blur: fill.treatment.blurPx,
      brightness: 1,
      contrast: 1,
      overlayColor: fill.treatment.tint,
      overlayOpacity: fill.treatment.overlayOpacity,
      blendMode: fill.treatment.blendMode,
      decorative: fill.treatment.decorative,
      alt: fill.treatment.altText,
    },
  };
}

export function compositionBlockToRenderDocument(
  block: CreativeCompositionBlock
): CreativeRenderDocument {
  return {
    schemaVersion: 2,
    canvas: {
      aspectRatio: 4 / 5,
      background: compositionBackgroundToFill(block.background),
      safeAreaPx: block.safeAreaPaddingPx || 12,
    },
    nodes: block.nodes
      .filter(
        (
          node
        ): node is CreativeCompositionNode & {
          primitive: Exclude<CreativeCompositionNode["primitive"], "background">;
        } => node.primitive !== "background"
      )
      .map((node) => ({
      id: node.id,
      primitive: node.primitive === "border" ? "divider" : node.primitive,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      rotationDeg: node.rotationDeg || 0,
      zIndex: node.zIndex,
      layer: {
        name: node.name || node.primitive,
        locked: Boolean(node.locked),
        visible: node.visible !== false,
        groupId: node.groupId || null,
        aspectLocked: node.props.aspectLocked === true,
        blendMode: ([
          "multiply",
          "screen",
          "overlay",
          "soft-light",
        ].includes(String(node.props.blendMode))
          ? node.props.blendMode
          : "normal") as
          | "normal"
          | "multiply"
          | "screen"
          | "overlay"
          | "soft-light",
      },
        props: structuredClone(node.props),
      })),
    mobile: {
      policy: block.mobileFallback,
      stackGapPx: 12,
    },
    accessibility: {
      readingOrder: [...block.nodes]
        .filter((node) => node.visible !== false)
        .sort((left, right) => left.y - right.y || left.x - right.x)
        .map((node) => node.id),
    },
  };
}

export function renderDocumentToCompositionBlock(
  document: CreativeRenderDocument,
  identity?: { id?: string; label?: string }
): CreativeCompositionBlock {
  return {
    version: 1,
    id: identity?.id || "reusable-composition",
    label: identity?.label || "Reusable composition",
    background: creativeFillToCompositionBackground(document.canvas.background),
    mobileFallback: document.mobile.policy,
    safeAreaPaddingPx: document.canvas.safeAreaPx,
    nodes: document.nodes.map(
      (node): CreativeCompositionNode => ({
        id: node.id,
        primitive: node.primitive === "divider" ? "border" : node.primitive,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        rotationDeg: node.rotationDeg,
        zIndex: node.zIndex,
        name: node.layer.name,
        locked: node.layer.locked,
        visible: node.layer.visible,
        groupId: node.layer.groupId,
        props: {
          ...structuredClone(node.props),
          aspectLocked: node.layer.aspectLocked,
          blendMode: node.layer.blendMode,
        },
      })
    ),
  };
}

export function defaultTypedImageProps() {
  return structuredClone(DEFAULT_IMAGE_TREATMENT);
}
