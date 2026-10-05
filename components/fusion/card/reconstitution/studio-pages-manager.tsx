"use client";

import { ArrowDown, ArrowUp, Copy, Plus, Trash2, X } from "lucide-react";
import type { ReactNode } from "react";
import type { CardEditorLiveModel } from "@/components/fusion/card/card-editor-live";
import type { TapExperienceConfig, TapExperiencePage } from "@/lib/brand/tap-card";
import {
  clearExperiencePageReferences,
  createBlankExperiencePage,
  duplicateExperiencePage,
  findExperiencePageReferences,
  normalizeExperiencePageOrder,
} from "@/lib/fusion/card/experience-pages";
import { cn } from "@/lib/utils";
import { StudioInternalPagePicker } from "./studio-internal-page-picker";

const ICONS = ["house", "music", "calendar-days", "ticket", "lock", "user", "star", "sparkles", "video", "shopping-bag"];

export function StudioPagesManager({ model, onClose }: { model: CardEditorLiveModel; onClose: () => void }) {
  const experience = model.experience;
  if (!experience) return null;
  const activeId = model.activeExperiencePageId || experience.defaultPageId;
  const active = experience.pages.find((page) => page.pageId === activeId) ?? experience.pages[0];
  if (!active) return null;
  const activeAccess = active.access ?? { state: "public" as const };
  const lockedBehavior = activeAccess.lockedBehavior ?? { mode: "none" as const };

  const commit = (next: TapExperienceConfig, label: string, nextActivePageId?: string) => model.mutateExperience?.(normalizeExperiencePageOrder(next), label, nextActivePageId);
  const patchPage = (pageId: string, patch: Partial<TapExperiencePage>, label: string) => commit({
    ...experience,
    pages: experience.pages.map((page) => page.pageId === pageId ? { ...page, ...patch, updatedAt: new Date().toISOString() } : page),
    updatedAt: new Date().toISOString(),
  }, label);
  const move = (pageId: string, delta: number) => {
    const pages = [...experience.pages].sort((a, b) => a.navOrder - b.navOrder);
    const index = pages.findIndex((page) => page.pageId === pageId);
    const nextIndex = Math.max(0, Math.min(pages.length - 1, index + delta));
    if (index < 0 || index === nextIndex) return;
    const [page] = pages.splice(index, 1);
    pages.splice(nextIndex, 0, page!);
    commit({ ...experience, pages: pages.map((candidate, order) => ({ ...candidate, navOrder: order })) }, "Reordered Experience Pages");
  };
  const add = () => {
    const page = createBlankExperiencePage(experience);
    commit({ ...experience, pages: [...experience.pages, page] }, "Added Experience Page", page.pageId);
  };
  const duplicate = () => {
    const page = duplicateExperiencePage(experience, active.pageId);
    if (!page) return;
    commit({ ...experience, pages: [...experience.pages, page] }, `Duplicated ${active.title} Page`, page.pageId);
  };
  const remove = () => {
    if (experience.pages.length <= 1) {
      model.notify?.("An Experience must keep at least one Page.");
      return;
    }
    const references = findExperiencePageReferences(experience, active.pageId);
    const detail = references.length ? ` ${references.length} internal destination${references.length === 1 ? "" : "s"} will be removed or returned to their own Page.` : "";
    if (!window.confirm(`Delete “${active.title}”?${detail}`)) return;
    const cleared = clearExperiencePageReferences(experience, active.pageId);
    const pages = cleared.pages.filter((page) => page.pageId !== active.pageId);
    const fallback = pages.find((page) => page.pageVisible) ?? pages[0]!;
    commit({ ...cleared, pages, defaultPageId: experience.defaultPageId === active.pageId ? fallback.pageId : experience.defaultPageId }, `Deleted ${active.title} Page`, fallback.pageId);
  };

  return <aside className="absolute inset-y-0 left-0 z-[2600] flex w-[min(390px,calc(100vw-12px))] flex-col border-r border-white/10 bg-[#090e16]/98 text-white shadow-[24px_0_70px_rgba(0,0,0,.55)] backdrop-blur-xl" aria-label="Pages management" data-testid="studio-pages-manager">
    <header className="flex min-h-14 items-center gap-3 border-b border-white/8 px-4"><div className="min-w-0 flex-1"><p className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#b8ff2c]">Experience</p><h2 className="text-sm font-semibold">Pages</h2></div><button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/8" aria-label="Close Pages"><X className="h-4 w-4" /></button></header>
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      <div className="space-y-1" data-testid="studio-pages-list">{[...experience.pages].sort((a, b) => a.navOrder - b.navOrder).map((page) => <button key={page.pageId} type="button" onClick={() => model.selectExperiencePage?.(page.pageId)} aria-pressed={page.pageId === active.pageId} className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-transparent bg-white/[.035] px-3 text-left hover:bg-white/[.07] aria-pressed:border-[#b8ff2c]/45 aria-pressed:bg-[#b8ff2c]/8" data-testid={`studio-page-row-${page.pageId}`}><span className="min-w-0 flex-1"><strong className="block truncate text-xs">{page.title}</strong><span className="mt-0.5 flex gap-1 text-[9px] text-white/38"><span>{page.navVisible ? "In bottom nav" : "Off nav"}</span>{!page.pageVisible ? <span>· Page hidden</span> : null}{page.access?.state === "locked" ? <span>· Locked</span> : null}</span></span>{page.pageId === experience.defaultPageId ? <span className="rounded-full bg-white/8 px-2 py-1 text-[8px] uppercase tracking-wide">Landing</span> : null}</button>)}</div>
      <button type="button" onClick={add} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#b8ff2c]/35 text-xs font-semibold text-[#d8ff82] hover:bg-[#b8ff2c]/8" data-testid="studio-page-add"><Plus className="h-4 w-4" />Add Page</button>

      <section className="mt-5 space-y-4 rounded-2xl border border-white/8 bg-white/[.025] p-3" key={active.pageId} data-testid="studio-page-settings">
        <div><p className="text-[9px] font-semibold uppercase tracking-[.16em] text-white/38">Editing Page</p><p className="mt-1 font-semibold">{active.title}</p><p className="mt-0.5 font-mono text-[8px] text-white/28">Stable ID · {active.pageId}</p></div>
        <Field label="Page name"><input defaultValue={active.title} onBlur={(event) => { const value = event.target.value.trim(); if (value && value !== active.title) patchPage(active.pageId, { title: value }, "Renamed Experience Page"); }} className={fieldClass} data-testid="studio-page-title" /></Field>
        <Field label="Bottom nav label"><input defaultValue={active.navLabel} onBlur={(event) => { const value = event.target.value.trim(); if (value && value !== active.navLabel) patchPage(active.pageId, { navLabel: value.slice(0, 24) }, "Renamed Page navigation label"); }} className={fieldClass} data-testid="studio-page-nav-label" /></Field>
        <Field label="Navigation icon"><select value={active.navIconRef || "star"} onChange={(event) => patchPage(active.pageId, { navIconRef: event.target.value }, "Changed Page navigation icon")} className={fieldClass} data-testid="studio-page-nav-icon">{ICONS.map((icon) => <option key={icon} value={icon}>{icon.replaceAll("-", " ")}</option>)}</select></Field>
        <Field label="Navigation destination"><StudioInternalPagePicker pages={experience.pages} value={active.navDestinationPageId || active.pageId} onChange={(pageId) => patchPage(active.pageId, { navDestinationPageId: pageId }, "Changed navigation Page destination")} testId="studio-page-nav-destination" /></Field>
        <Toggle label="Show in bottom navigation" detail="Off-nav Pages remain reachable through internal Buttons." checked={active.navVisible} onChange={(checked) => patchPage(active.pageId, { navVisible: checked }, `${checked ? "Added" : "Removed"} Page ${checked ? "to" : "from"} navigation`)} testId="studio-page-nav-visible" />
        <Toggle label="Page available" detail="Turning this off removes the Page from normal fan navigation." checked={active.pageVisible} onChange={(checked) => {
          if (!checked && active.pageId === experience.defaultPageId) { model.notify?.("Choose another landing Page before hiding this Page."); return; }
          patchPage(active.pageId, { pageVisible: checked, navVisible: checked ? active.navVisible : false }, `${checked ? "Showed" : "Hid"} Experience Page`);
        }} testId="studio-page-visible" />
        <Field label="Access demo state"><select value={activeAccess.state} onChange={(event) => patchPage(active.pageId, { access: { ...activeAccess, state: event.target.value === "locked" ? "locked" : "public" } }, "Changed Page access demo state")} className={fieldClass} data-testid="studio-page-access-state"><option value="public">Public</option><option value="locked">Locked demo</option></select></Field>
        {activeAccess.state === "locked" ? <>
          <Field label="When locked"><select value={lockedBehavior.mode} onChange={(event) => patchPage(active.pageId, { access: { ...activeAccess, lockedBehavior: { ...lockedBehavior, mode: event.target.value as "none" | "message" | "cta" | "hidden" } } }, "Changed locked Page behavior")} className={fieldClass} data-testid="studio-page-locked-mode"><option value="none">Show locked, no action</option><option value="message">Show explanation</option><option value="cta">Show message + CTA</option><option value="hidden">Hide completely</option></select></Field>
          {lockedBehavior.mode === "message" || lockedBehavior.mode === "cta" ? <Field label="Locked message"><input defaultValue={lockedBehavior.message || "This Page is available with additional access."} onBlur={(event) => patchPage(active.pageId, { access: { ...activeAccess, lockedBehavior: { ...lockedBehavior, message: event.target.value } } }, "Changed locked Page message")} className={fieldClass} /></Field> : null}
          {lockedBehavior.mode === "cta" ? <><Field label="CTA label"><input defaultValue={lockedBehavior.ctaLabel || "Join"} onBlur={(event) => patchPage(active.pageId, { access: { ...activeAccess, lockedBehavior: { ...lockedBehavior, ctaLabel: event.target.value } } }, "Changed locked Page CTA") } className={fieldClass} /></Field><Field label="CTA action"><select value={lockedBehavior.ctaDestinationType || "external"} onChange={(event) => patchPage(active.pageId, { access: { ...activeAccess, lockedBehavior: { ...lockedBehavior, ctaDestinationType: event.target.value as "external" | "internal_page", ctaDestinationRef: "" } } }, "Changed locked Page CTA Action")} className={fieldClass}><option value="external">Website</option><option value="internal_page">Internal Page</option></select></Field>{lockedBehavior.ctaDestinationType === "internal_page" ? <Field label="Destination Page"><StudioInternalPagePicker pages={experience.pages} value={lockedBehavior.ctaDestinationRef || ""} onChange={(pageId) => patchPage(active.pageId, { access: { ...activeAccess, lockedBehavior: { ...lockedBehavior, ctaDestinationType: "internal_page", ctaDestinationRef: pageId } } }, "Mapped locked Page CTA to Experience Page")} testId="studio-page-locked-cta-page" /></Field> : <Field label="CTA destination"><input defaultValue={lockedBehavior.ctaDestinationRef || ""} placeholder="https://…" onBlur={(event) => patchPage(active.pageId, { access: { ...activeAccess, lockedBehavior: { ...lockedBehavior, ctaDestinationType: "external", ctaDestinationRef: event.target.value } } }, "Changed locked Page CTA destination")} className={fieldClass} /></Field>}</> : null}
        </> : null}
        <Field label="Future access rule reference"><input defaultValue={activeAccess.ruleRef || ""} placeholder="Optional rule ID" onBlur={(event) => patchPage(active.pageId, { access: { ...activeAccess, ruleRef: event.target.value || undefined } }, "Changed Page access rule reference")} className={fieldClass} data-testid="studio-page-access-rule" /></Field>

        <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => move(active.pageId, -1)} className={buttonClass}><ArrowUp className="h-3.5 w-3.5" />Move up</button><button type="button" onClick={() => move(active.pageId, 1)} className={buttonClass}><ArrowDown className="h-3.5 w-3.5" />Move down</button></div>
        <button type="button" onClick={() => commit({ ...experience, defaultPageId: active.pageId }, `Set ${active.title} as landing Page`)} disabled={!active.pageVisible || active.pageId === experience.defaultPageId} className={`${buttonClass} w-full disabled:opacity-35`} data-testid="studio-page-set-default">Set as landing Page</button>
        <div className="grid grid-cols-2 gap-2"><button type="button" onClick={duplicate} className={buttonClass} data-testid="studio-page-duplicate"><Copy className="h-3.5 w-3.5" />Duplicate</button><button type="button" onClick={remove} className={cn(buttonClass, "text-rose-200")} data-testid="studio-page-delete"><Trash2 className="h-3.5 w-3.5" />Delete</button></div>
      </section>

      <section className="mt-4 space-y-3 rounded-2xl border border-white/8 bg-white/[.025] p-3"><p className="text-[9px] font-semibold uppercase tracking-[.16em] text-white/38">Navigation look</p><Field label="Placement"><select value={experience.navigation.presentation} onChange={(event) => commit({ ...experience, navigation: { ...experience.navigation, presentation: event.target.value === "floating" ? "floating" : "edge" } }, "Changed Experience navigation presentation")} className={fieldClass}><option value="edge">Edge</option><option value="floating">Floating</option></select></Field><Field label="Item presentation"><select value={experience.navigation.itemPresentation || "standard-icon"} onChange={(event) => commit({ ...experience, navigation: { ...experience.navigation, itemPresentation: event.target.value === "everencore-love-and-theft-mini-pick" ? "everencore-love-and-theft-mini-pick" : "standard-icon" } }, "Changed Experience navigation item presentation")} className={fieldClass} data-testid="studio-navigation-item-presentation"><option value="standard-icon">Standard icon</option><option value="everencore-love-and-theft-mini-pick">Love &amp; Theft mini pick</option></select></Field><Field label="Surface treatment"><select value={experience.navigation.surfaceTreatment || "solid"} onChange={(event) => commit({ ...experience, navigation: { ...experience.navigation, surfaceTreatment: event.target.value as "solid" | "smoky-glass" | "transparent" } }, "Changed Experience navigation surface treatment")} className={fieldClass} data-testid="studio-navigation-surface-treatment"><option value="solid">Solid</option><option value="smoky-glass">Smoky glass</option><option value="transparent">Transparent</option></select></Field><div className="grid grid-cols-2 gap-2"><ColorField label="Active" value={experience.navigation.activeColor || "#b8ff2c"} onChange={(value) => commit({ ...experience, navigation: { ...experience.navigation, activeColor: value } }, "Changed navigation active color")} /><ColorField label="Surface" value={experience.navigation.surfaceColor || "#070b10"} onChange={(value) => commit({ ...experience, navigation: { ...experience.navigation, surfaceColor: value } }, "Changed navigation surface color")} /></div></section>
    </div>
  </aside>;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block text-[10px] font-medium text-white/62"><span className="mb-1 block">{label}</span>{children}</label>; }
function Toggle({ label, detail, checked, onChange, testId }: { label: string; detail: string; checked: boolean; onChange: (checked: boolean) => void; testId: string }) { return <label className="flex min-h-12 items-center gap-3 rounded-xl bg-white/[.035] px-3"><span className="min-w-0 flex-1"><strong className="block text-[10px] font-medium">{label}</strong><small className="mt-0.5 block text-[8px] leading-3 text-white/35">{detail}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} data-testid={testId} /></label>; }
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="text-[9px] text-white/52">{label}<input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-9 w-full rounded-lg bg-white/5 p-1" /></label>; }
const fieldClass = "mt-1 min-h-10 w-full rounded-xl border border-white/10 bg-white/[.045] px-3 text-xs text-white outline-none focus:border-[#b8ff2c]/55";
const buttonClass = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.035] px-3 text-xs hover:bg-white/[.075]";
