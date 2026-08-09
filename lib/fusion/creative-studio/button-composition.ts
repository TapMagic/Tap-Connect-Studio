import {
  createCompositionNode,
  createEmptyCreativeComposition,
  type CreativeCompositionBlock,
  type CreativeCompositionNode,
} from "./composition";

export type ButtonContentRole = "label" | "icon" | "description" | "image" | "badge";

export function createButtonContentComposition({
  buttonId,
  label,
  icon,
  labelColor,
  fontSize,
  fontWeight,
  textAlign,
}: {
  buttonId: string;
  label: string;
  icon: string;
  /** Parent Button label/text color — must not hardcode a masking default. */
  labelColor?: string;
  fontSize?: number;
  fontWeight?: number;
  textAlign?: string;
}): CreativeCompositionBlock {
  const block = createEmptyCreativeComposition(`button-content-${buttonId}`);
  const labelNode = createCompositionNode("text", {
    id: `${buttonId}-label`,
    name: "Button label",
    x: .2,
    y: .2,
    width: .64,
    height: .6,
    props: {
      elementKind: "text",
      buttonContentRole: "label" satisfies ButtonContentRole,
      text: label,
      fontSize: fontSize ?? 14,
      fontWeight: fontWeight ?? 600,
      // Prefer parent surface mirrors so ephemeral content does not mask labelColor.
      color: labelColor || "#0b0f19",
      textAlign: textAlign || "center",
    },
  });
  const iconNode = createCompositionNode("shape", {
    id: `${buttonId}-icon`,
    name: "Button icon",
    x: .06,
    y: .25,
    width: .12,
    height: .5,
    props: {
      elementKind: "icon",
      buttonContentRole: "icon" satisfies ButtonContentRole,
      icon,
      decorative: true,
    },
  });
  return { ...block, label: "Button content", nodes: [labelNode, iconNode] };
}

export function buttonContent(
  props: Record<string, unknown>,
  buttonId = "button"
): CreativeCompositionBlock {
  const stored = props.contentComposition;
  if (stored && typeof stored === "object" && Array.isArray((stored as CreativeCompositionBlock).nodes)) {
    return stored as CreativeCompositionBlock;
  }
  return createButtonContentComposition({
    buttonId,
    label: String(props.label || "Button"),
    icon: String(props.icon || "arrow-up-right"),
    labelColor: String(props.labelColor || props.textColor || ""),
    fontSize: typeof props.fontSize === "number" ? props.fontSize : undefined,
    fontWeight: typeof props.fontWeight === "number" ? props.fontWeight : undefined,
    textAlign: typeof props.textAlign === "string" ? props.textAlign : undefined,
  });
}

export function buttonContentNode(
  props: Record<string, unknown>,
  role: ButtonContentRole,
  buttonId = "button"
): CreativeCompositionNode | undefined {
  return buttonContent(props, buttonId).nodes.find((node) => node.props.buttonContentRole === role);
}

export function updateButtonContentNode(
  props: Record<string, unknown>,
  role: ButtonContentRole,
  patch: Partial<CreativeCompositionNode> & { props?: Record<string, unknown> },
  buttonId = "button"
): Record<string, unknown> {
  const content = buttonContent(props, buttonId);
  const nodes = content.nodes.map((node) => node.props.buttonContentRole === role
    ? { ...node, ...patch, props: patch.props ? { ...node.props, ...patch.props } : node.props }
    : node);
  return { ...props, contentComposition: { ...content, nodes } };
}

/** Legacy label/icon mirrors remain an adapter for older saved Cards, not a second engine. */
export function updateButtonLabel(
  props: Record<string, unknown>,
  value: string,
  buttonId = "button"
): Record<string, unknown> {
  return {
    ...updateButtonContentNode(props, "label", { props: { text: value } }, buttonId),
    label: value,
  };
}

/** Icon identity props for a Button — never mutates Button Surface fill/material. */
export function buttonIconIdentityProps(asset: {
  canonicalId: string;
  provider: string;
  collection: string;
  iconName: string;
  source: string;
  body: string;
  viewBox?: string;
  renderMode?: string;
  license?: { spdx?: string; title?: string } | null;
  fetchedAt?: string;
}): Record<string, unknown> {
  return {
    icon: asset.canonicalId,
    showIcon: true,
    iconProvider: asset.provider,
    iconCollection: asset.collection,
    iconName: asset.iconName,
    iconSource: asset.source,
    iconSvg: asset.body,
    iconViewBox: asset.viewBox,
    iconRenderMode: asset.renderMode,
    iconLicense: asset.license?.spdx || asset.license?.title,
    iconFetchedAt: asset.fetchedAt,
  };
}

/**
 * Install an Iconify/native asset into a Button's nested Icon without mutating
 * Button Surface (fill, material, border, corners, size).
 */
export function applyButtonIconAsset(
  props: Record<string, unknown>,
  asset: {
    canonicalId: string;
    provider: string;
    collection: string;
    iconName: string;
    source: string;
    body: string;
    viewBox?: string;
    renderMode?: string;
    license?: { spdx?: string; title?: string } | null;
    fetchedAt?: string;
  },
  buttonId = "button"
): Record<string, unknown> {
  const identity = buttonIconIdentityProps(asset);
  const withNested = updateButtonContentNode(
    props,
    "icon",
    {
      props: {
        elementKind: "icon",
        buttonContentRole: "icon",
        decorative: true,
        ...identity,
        // Nested icon artwork color — independent of Button Surface fill.
        fill: String(props.iconColor || props.labelColor || props.textColor || "#0b0f19"),
        stroke: String(props.iconColor || props.labelColor || props.textColor || "#0b0f19"),
      },
    },
    buttonId
  );
  return {
    ...withNested,
    ...identity,
  };
}
