/**
 * Human-readable history labels for Creative Studio undo timeline.
 * Never expose raw patches or implementation jargon.
 */

import type { TapCardSection, TapConnectCardConfig } from "@/lib/brand/tap-card";
import { describeMoveAboveBelow } from "@/lib/fusion/authoring/reorder-list";

export function sectionDisplayName(s: TapCardSection | undefined): string {
  if (!s) return "item";
  return s.label || s.text || s.headline || s.type.replace(/_/g, " ");
}

function sectionName(s: TapCardSection | undefined): string {
  return sectionDisplayName(s);
}

/** Explicit reorder label: Moved "A" above "B". */
export function describeSectionReorder(
  prev: TapCardSection[],
  next: TapCardSection[]
): string {
  const prevIds = prev.map((s) => s.id);
  const nextIds = next.map((s) => s.id);
  if (prevIds.join("|") === nextIds.join("|")) return "Updated Card sections";

  let movedId: string | undefined;
  for (let i = 0; i < nextIds.length; i++) {
    if (prevIds[i] !== nextIds[i]) {
      // Prefer the id that changed position
      const candidate =
        nextIds.find((id, idx) => prevIds.indexOf(id) !== idx) ?? nextIds[i];
      movedId = candidate;
      break;
    }
  }
  if (!movedId) return "Reordered Card sections";

  const fromIndex = prevIds.indexOf(movedId);
  const toIndex = nextIds.indexOf(movedId);
  const moved = next.find((s) => s.id === movedId);
  const neighbor =
    toIndex < fromIndex
      ? next[toIndex + 1]
      : next[toIndex - 1];
  return describeMoveAboveBelow(
    sectionDisplayName(moved),
    neighbor ? sectionDisplayName(neighbor) : undefined,
    fromIndex,
    toIndex
  );
}

export function describeConfigChange(
  prev: TapConnectCardConfig,
  next: TapConnectCardConfig
): string {
  if (JSON.stringify(prev.sections) !== JSON.stringify(next.sections)) {
    return describeSectionsChange(prev.sections, next.sections);
  }
  if (prev.titleFormat !== next.titleFormat || JSON.stringify(prev.titleFormat) !== JSON.stringify(next.titleFormat)) {
    return "Changed Card title typography";
  }
  if (JSON.stringify(prev.bodyFormat) !== JSON.stringify(next.bodyFormat)) {
    return "Changed Card body typography";
  }
  if (prev.accentColor !== next.accentColor) return "Changed accent color";
  if (prev.surfaceColor !== next.surfaceColor) return "Changed Card surface color";
  if (prev.textColor !== next.textColor) return "Changed Card text color";
  if (prev.pillColor !== next.pillColor) return "Changed button fill color";
  if (prev.defaultShape !== next.defaultShape) return "Changed default button shape";
  if (prev.defaultFinish !== next.defaultFinish) return "Changed button finish";
  if (prev.actionsLayout !== next.actionsLayout) return "Changed actions layout";
  if (prev.surfaceOpacity !== next.surfaceOpacity) return "Changed Card transparency";
  if (prev.headerLogoUrl !== next.headerLogoUrl) return "Changed header logo";
  if (prev.showHeaderLogo !== next.showHeaderLogo) {
    return next.showHeaderLogo ? "Showed logo above Card" : "Hid logo above Card";
  }
  if (prev.view3d !== next.view3d) {
    return next.view3d ? "Enabled raised buttons" : "Disabled raised buttons";
  }
  return "Updated Card";
}

export function describeSectionsChange(
  prev: TapCardSection[],
  next: TapCardSection[]
): string {
  if (prev.length < next.length) {
    const added = next.find((s) => !prev.some((p) => p.id === s.id));
    return `Added ${sectionName(added)}`;
  }
  if (prev.length > next.length) {
    const removed = prev.find((s) => !next.some((n) => n.id === s.id));
    return `Removed ${sectionName(removed)}`;
  }
  const orderChanged =
    prev.map((s) => s.id).join("|") !== next.map((s) => s.id).join("|");
  if (orderChanged) {
    return describeSectionReorder(prev, next);
  }
  for (let i = 0; i < next.length; i++) {
    const a = prev.find((p) => p.id === next[i].id) || prev[i];
    const b = next[i];
    if (!a || a.id !== b.id) continue;
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    const name = sectionName(b);
    if (a.label !== b.label) return `Changed button label`;
    if (a.href !== b.href) return `Changed ${name} destination`;
    if (a.actionKind !== b.actionKind) return `Changed ${name} action type`;
    if (a.text !== b.text) return `Changed text content`;
    if (a.shape !== b.shape) return `Changed ${name} shape`;
    if (a.backgroundColor !== b.backgroundColor) return `Changed ${name} fill`;
    if (a.textColor !== b.textColor) return `Changed ${name} text color`;
    if (a.opacity !== b.opacity) return `Changed ${name} opacity`;
    if (a.finish !== b.finish) return `Changed ${name} finish`;
    if (a.icon !== b.icon || a.iconPosition !== b.iconPosition) {
      return `Changed ${name} icon`;
    }
    if (a.imageUrl !== b.imageUrl || a.logoUrl !== b.logoUrl) {
      return `Changed ${name} image`;
    }
    if (Boolean(a.locked) !== Boolean(b.locked)) {
      return b.locked ? `Locked ${name}` : `Unlocked ${name}`;
    }
    if (a.enabled !== b.enabled) {
      return b.enabled ? `Showed ${name}` : `Hid ${name}`;
    }
    if (JSON.stringify(a.format) !== JSON.stringify(b.format)) {
      const font =
        b.format?.customFontFamily?.match(/"([^"]+)"/)?.[1] ||
        b.format?.fontFamily;
      if (font && font !== a.format?.customFontFamily && font !== a.format?.fontFamily) {
        return `Changed font to ${font}`;
      }
      if (a.format?.fontSizePx !== b.format?.fontSizePx && b.format?.fontSizePx) {
        const pt = Math.round((b.format.fontSizePx * 72) / 96);
        return `Set text to ${pt} pt`;
      }
      if (a.format?.align !== b.format?.align && b.format?.align === "center") {
        return "Centered text";
      }
      if (a.format?.align !== b.format?.align) return "Changed text alignment";
      if (Boolean(a.format?.italic) !== Boolean(b.format?.italic)) {
        return b.format?.italic ? "Applied italic" : "Removed italic";
      }
      if (Boolean(a.format?.underline) !== Boolean(b.format?.underline)) {
        return b.format?.underline ? "Applied underline" : "Removed underline";
      }
      return "Changed typography";
    }
    return `Updated ${name}`;
  }
  return "Updated Card sections";
}
