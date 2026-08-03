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
}: {
  buttonId: string;
  label: string;
  icon: string;
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
      fontSize: 14,
      fontWeight: 600,
      color: "#0b0f19",
      textAlign: "center",
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
