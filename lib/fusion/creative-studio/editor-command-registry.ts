import type { ObjectFamily } from "./capabilities";

export type EditorDrawerSection =
  | "background"
  | "page-size"
  | "guides"
  | "content"
  | "font"
  | "color"
  | "surface"
  | "media"
  | "crop"
  | "adjust"
  | "action"
  | "motion"
  | "position"
  | "layout"
  | "setup"
  | "fields"
  | "gallery"
  | "resize-policy"
  | "responsive"
  | "visibility"
  | "more"
  | "icon-fill"
  | "icon-stroke"
  | "icon-appearance"
  | "divider-style"
  | "divider-thickness"
  | "divider-color"
  | "divider-appearance"
  | "map-action"
  | "frame-appearance"
  | "button-surface"
  | "button-content"
  | "button-action"
  | "effects"
  | "appearance"
  | "arrange"
  | "magic-write";

export type EditorCommand = {
  id: string;
  label: string;
  icon: string;
  capability: string;
  targetLevels: readonly ("root" | "parent" | "child")[];
  supportedObjectKinds: readonly ObjectFamily[] | "all";
  toolbarPriority: number;
  drawerSection: EditorDrawerSection | null;
  quickControl: boolean;
  keyboardShortcut?: string;
  mutation: "open-drawer" | "quick-mutation" | "common-operation";
  reset?: string;
  analyticsEvent: string;
};

const families: readonly ObjectFamily[] = ["card_root", "text", "image", "logo", "icon", "shape", "divider", "badge", "button", "coupon", "ticket", "map", "gallery", "form", "container", "group", "qr", "video", "utility"];
const command = (id: string, label: string, drawerSection: EditorDrawerSection | null, supportedObjectKinds: EditorCommand["supportedObjectKinds"] = "all", toolbarPriority = 50, mutation: EditorCommand["mutation"] = "open-drawer"): EditorCommand => ({ id, label, icon: id.split(".")[0], capability: id.split(".")[0], targetLevels: ["root", "parent", "child"], supportedObjectKinds, toolbarPriority, drawerSection, quickControl: mutation === "quick-mutation", mutation, analyticsEvent: `studio.editor.${id}` });

const entries = [
  command("background.open", "Background", "background", ["card_root"]), command("pageSize.open", "Page size", "page-size", ["card_root"]), command("guides.open", "Guides", "guides", ["card_root"]),
  // Appearance / Material both open the shared Appearance IA host (not a legacy "effects" focus).
  command("appearance.open", "Appearance", "appearance"), command("content.edit", "Edit", "content", ["text", "badge"]), command("font.open", "Font", "font", ["text"]),
  command("fontSize.quick", "Font size", null, ["text"], 20, "quick-mutation"), command("bold.toggle", "Bold", null, ["text"], 21, "quick-mutation"), command("italic.toggle", "Italic", null, ["text"], 22, "quick-mutation"), command("underline.toggle", "Underline", null, ["text"], 23, "quick-mutation"),
  command("color.open", "Color", "color", ["text", "divider"]), command("material.open", "Material", "appearance", ["text", "badge", "button", "container", "coupon", "ticket", "form", "shape"]), command("icon.open", "Change Icon", "content", ["icon"]), command("icon.appearance", "Appearance", "icon-appearance", ["icon"]),
  command("media.replace", "Replace", "media", ["image", "logo", "video"]), command("media.cropFit", "Crop / Fit", "crop", ["image", "logo", "video"]), command("media.adjust", "Adjust", "adjust", ["image", "logo"]),
  command("action.open", "Action", "action"), command("motion.open", "Motion", "motion"), command("transform.position", "Position", "position"), command("layout.open", "Layout", "layout"), command("size.open", "Size", "position", ["container"]), command("responsive.open", "Responsive", "responsive"),
  command("component.editChildren", "Edit contents", "content", ["button", "coupon", "ticket", "container", "badge", "gallery", "form", "group"]), command("resizePolicy.open", "Resize behavior", "resize-policy", ["container", "gallery"]), command("setup.open", "Setup", "setup", ["coupon", "ticket", "qr", "utility"]), command("map.setup", "Setup", "setup", ["map"]), command("map.action", "Map Action", "map-action", ["map"]),
  command("gallery.edit", "Edit gallery", "gallery", ["gallery"]), command("form.editFields", "Edit fields", "fields", ["form"]), command("behavior.open", "Behavior", "setup", ["form"]),
  command("divider.style", "Style", "divider-style", ["divider"]), command("divider.thickness", "Thickness", "divider-thickness", ["divider"]), command("divider.color", "Color", "divider-color", ["divider"]), command("divider.appearance", "Appearance", "divider-appearance", ["divider"]),
  command("badge.shape", "Shape", "surface", ["badge"]), command("visibility.open", "Visibility", "visibility"), command("more.open", "More", "more"),
  // Group common ops — Ungroup is required wherever Group parent mode is active.
  command("ungroup.open", "Ungroup", null, ["group"], 30, "common-operation"),
  command("arrange.open", "Arrange", "arrange", ["group", "text", "image", "logo", "icon", "shape", "divider", "badge", "button", "coupon", "ticket", "container", "gallery", "form", "map", "qr", "video"], 40),
  command("magicWrite.open", "Magic Write", "magic-write", ["group", "text", "badge", "button", "coupon", "ticket"], 35),
  command("reset.appearance", "Reset Appearance", null, families, 99, "common-operation"),
] as const;

export const EDITOR_COMMAND_REGISTRY: ReadonlyMap<string, EditorCommand> = new Map(entries.map((item) => [item.id, item]));

export function getEditorCommand(id: string): EditorCommand {
  const found = EDITOR_COMMAND_REGISTRY.get(id);
  if (!found) throw new Error(`Unregistered editor command: ${id}`);
  return found;
}

export function dispatchEditorCommand(id: string, family: ObjectFamily, open: (section: EditorDrawerSection) => void): EditorCommand {
  const registered = getEditorCommand(id);
  if (registered.supportedObjectKinds !== "all" && !registered.supportedObjectKinds.includes(family)) throw new Error(`${id} does not support ${family}`);
  if (registered.drawerSection) open(registered.drawerSection);
  return registered;
}

/** Map registry drawer sections onto contextual toolbar Focus ids without silent fallbacks. */
export function focusForDrawerSection(section: EditorDrawerSection, family: ObjectFamily): string {
  if (family === "icon" && section === "surface") return "icon-appearance";
  if (family === "icon" && section === "appearance.open" as never) return "icon-appearance";
  if (family === "button" && section === "surface") return "button-surface";
  if (family === "map" && section === "action") return "map-action";
  if (family === "divider" && section === "surface") return "divider-appearance";
  if (family === "divider" && section === "color") return "divider-color";
  if (section === "motion") return "animate";
  if (section === "magic-write") return "content";
  if (section === "arrange") return "more";
  // Legacy "effects" drawer section was the Appearance host — never surface as Effects chrome.
  if (section === "effects") return "appearance";
  if (section === "page-size" || section === "guides" || section === "visibility") return section === "page-size" ? "page-size" : section;
  return section;
}
