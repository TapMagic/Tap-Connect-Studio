"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import {
  ArrowDown, ArrowUp, BadgeCheck, Bot, Brush, Copy, Eye, EyeOff, FolderKanban, HelpCircle, Image as ImageIcon, Layers3,
  LayoutTemplate, Library, Lock, MousePointer2, PanelLeft, Pencil, Shapes, Ticket, BadgePercent, Trash2, Type, Unlock, Wrench,
} from "lucide-react";
import { MediaPicker } from "@/components/media/media-picker";
import { CardComposerLibrary } from "./card-composer-library";
import type { CardEditorLiveModel } from "./card-editor-live";
import {
  CARD_ELEMENT_LIBRARY,
  SECTION_PRESET_LIBRARY,
  ensureRootComposition,
  type CardElementKind,
  type SectionPresetId,
} from "@/lib/fusion/card/composer-model";
import { DEFAULT_GRADIENT, GRADIENT_PRESETS } from "@/lib/fusion/creative-studio/gradient";
import { SURFACE_PATTERN_CATALOG } from "@/lib/fusion/creative-studio/patterns";
import {
  BADGE_WORDING,
  ICON_LIBRARY,
  instantiateReusableComposition,
  saveReusableComposition,
} from "@/lib/fusion/creative-studio/card-creative-system";
import { cn } from "@/lib/utils";
import { buttonContent } from "@/lib/fusion/creative-studio/button-composition";
import type { CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";

export type CardCreativeTool = "templates" | "build" | "elements" | "buttons" | "badges" | "text" | "coupons" | "tickets" | "brand" | "assets" | "backgrounds" | "projects" | "reusable" | "layers" | "ai" | "tools" | "help";

const TOOLS: Array<{ id: CardCreativeTool; label: string; icon: typeof PanelLeft }> = [
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "build", label: "Build", icon: PanelLeft },
  { id: "elements", label: "Elements", icon: Shapes },
  { id: "buttons", label: "Buttons", icon: MousePointer2 },
  { id: "badges", label: "Badges", icon: BadgeCheck },
  { id: "text", label: "Text", icon: Type },
  { id: "coupons", label: "Coupons", icon: BadgePercent },
  { id: "tickets", label: "Tickets", icon: Ticket },
  { id: "brand", label: "Brand", icon: BadgeCheck },
  { id: "assets", label: "Assets", icon: ImageIcon },
  { id: "backgrounds", label: "Backgrounds", icon: Brush },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "reusable", label: "Reusable", icon: Library },
  { id: "layers", label: "Layers", icon: Layers3 },
  { id: "ai", label: "AI Assist", icon: Bot },
  { id: "tools", label: "Tools", icon: Wrench },
  { id: "help", label: "Help", icon: HelpCircle },
];

export function CardCreativeToolRail({ model, activeTool, drawerOpen: controlledDrawerOpen, onActiveToolChange, onDrawerOpenChange }: { model: CardEditorLiveModel | null; activeTool?: CardCreativeTool; drawerOpen?: boolean; onActiveToolChange?: (tool: CardCreativeTool) => void; onDrawerOpenChange?: (open: boolean) => void }) {
  const [localActive, setLocalActive] = useState<CardCreativeTool>(activeTool ?? "build");
  const [query, setQuery] = useState("");
  const [localDrawerOpen, setLocalDrawerOpen] = useState(controlledDrawerOpen ?? true);
  const active = activeTool ?? localActive;
  const drawerOpen = controlledDrawerOpen ?? localDrawerOpen;
  const setActive = (tool: CardCreativeTool) => { setLocalActive(tool); onActiveToolChange?.(tool); };
  const setDrawerOpen = (open: boolean | ((current: boolean) => boolean)) => {
    const next = typeof open === "function" ? open(drawerOpen) : open;
    setLocalDrawerOpen(next);
    onDrawerOpenChange?.(next);
  };
  const activeDefinition = TOOLS.find((tool) => tool.id === active)!;
  const Icon = activeDefinition.icon;
  return (
    <div className="flex h-full min-h-0 bg-[#070b14]" data-testid="card-creative-left-workspace">
      <nav className="w-[68px] shrink-0 overflow-y-auto border-r border-white/10 py-2" aria-label="Card creative tools" data-testid="card-creative-tool-rail">
        {TOOLS.map((tool) => {
          const ToolIcon = tool.icon;
          const selected = drawerOpen && active === tool.id;
          return <button key={tool.id} type="button" aria-pressed={selected} aria-label={tool.label} data-testid={`card-creative-tool-${tool.id}`} className={cn("flex min-h-[58px] w-full flex-col items-center justify-center gap-1 px-1 text-[9px]", selected ? "bg-white/10 text-[#b8ff2c]" : "text-white/60 hover:bg-white/5 hover:text-white")} onClick={() => { setActive(tool.id); setDrawerOpen(true); }}><ToolIcon className="h-4 w-4" aria-hidden /><span>{tool.label}</span></button>;
        })}
      </nav>
      {drawerOpen ? <section className="min-w-0 flex-1 overflow-y-auto" aria-label={`${activeDefinition.label} drawer`} data-testid="card-creative-context-drawer" data-creative-tool={active}>
        <header className="sticky top-0 z-10 border-b border-white/10 bg-[#090e18]/95 p-3 backdrop-blur">
          <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-[#b8ff2c]" /><h2 className="text-xs font-semibold text-white">{activeDefinition.label}</h2></div><button type="button" aria-label="Close creative drawer" className="h-8 w-8 rounded text-white/60 hover:bg-white/5" onClick={() => setDrawerOpen(false)}>×</button></div>
          {!(["build", "help"] as CardCreativeTool[]).includes(active) ? <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${activeDefinition.label.toLowerCase()}`} className="mt-2 h-9 w-full rounded border border-white/10 bg-black/20 px-2 text-xs text-white" /> : null}
          <p className="mt-1 text-[9px] text-white/55">Card › {activeDefinition.label}</p>
        </header>
        <div className="p-3"><CreativeDrawer tool={active} query={query} model={model} onSelectTool={(tool) => { setActive(tool); setDrawerOpen(true); }} /></div>
      </section> : null}
    </div>
  );
}

function CreativeDrawer({ tool, query, model, onSelectTool }: { tool: CardCreativeTool; query: string; model: CardEditorLiveModel | null; onSelectTool: (tool: CardCreativeTool) => void }) {
  const [targetSectionChoice, setTargetSectionChoice] = useState<string | null>(null);
  const selectedSectionId = model?.selected?.type === "surface" ? model.selected.id : null;
  const insertionTarget = selectedSectionId && targetSectionChoice === selectedSectionId ? "section" : "card";
  if (!model) return <p className="text-xs text-white/55">Loading Card tools…</p>;
  const matches = (value: string) => !query.trim() || value.toLowerCase().includes(query.toLowerCase());
  const targetSectionId = insertionTarget === "section" ? selectedSectionId : null;
  const add = (kind: CardElementKind, props?: Record<string, unknown>) => model.onAddElement?.(kind, targetSectionId, props);
  const targetChoice = selectedSectionId ? <InsertionTargetChoice value={insertionTarget} sectionName={model.selected?.label || "selected Section"} onChange={(value) => setTargetSectionChoice(value === "section" ? selectedSectionId : null)} /> : null;
  if (tool === "build") return <CardComposerLibrary model={model} />;
  if (tool === "templates") return <div className="space-y-2" data-testid="card-template-library">{([ ["blank", "Blank Card", "Start with an empty root canvas"], ["brand", "Brand starter", "Use available Brand defaults"], ["template", "Essential Card", "Identity and customer actions"], ["clone", "Clone current Card", "Editable independent copy"] ] as const).filter((item) => matches(item[1])).map(([id, label, description]) => <LibraryAction key={id} label={label} description={description} onClick={() => model.onStartPoint?.(id)} />)}<h3 className="pt-3 text-[10px] font-semibold uppercase text-white/45">Section presets</h3>{SECTION_PRESET_LIBRARY.filter((item) => matches(`${item.label} ${item.style}`)).map((item) => <LibraryAction key={item.id} label={item.label} description={`${item.description} · ${item.style}`} onClick={() => model.onAddSectionPreset?.(item.id as SectionPresetId)} />)}</div>;
  if (tool === "elements") return <div className="space-y-1" data-testid="card-elements-library">{targetChoice}{CARD_ELEMENT_LIBRARY.filter((item) => item.kind !== "badge" && !["text", "heading", "subheading", "business_name", "address", "hours", "terms"].includes(item.kind) && matches(item.label)).map((item) => <LibraryAction key={item.kind} label={item.label} description={item.kind === "image" ? "Open the shared visual media browser" : item.description} onClick={() => item.kind === "image" ? onSelectTool("assets") : add(item.kind as CardElementKind)} />)}<button type="button" className="min-h-12 w-full rounded border border-white/10 px-2 text-left text-xs" onClick={() => onSelectTool("badges")}>Badge<span className="block text-[9px] text-white/45">Open the authoritative Badge catalog</span></button><h3 className="pt-3 text-[10px] font-semibold uppercase text-white/45">Icons</h3><div className="grid grid-cols-2 gap-1">{ICON_LIBRARY.filter((icon) => matches(`${icon.label} ${icon.category}`)).map((icon) => <button key={icon.id} type="button" className="min-h-12 rounded border border-white/10 px-2 text-left text-[10px] text-white/75" onClick={() => add("icon", { icon: icon.id, accessibleLabel: icon.label, decorative: false })}>✦ {icon.label}<span className="block text-[8px] text-white/40">{icon.category}</span></button>)}</div></div>;
  if (tool === "buttons") return <div className="space-y-3">{targetChoice}<ButtonLibrary add={add} matches={matches} /></div>;
  if (tool === "badges") return <div className="space-y-3">{targetChoice}<BadgeLibrary add={add} matches={matches} /></div>;
  if (tool === "coupons") return <div className="space-y-3">{targetChoice}<CommerceComponentLibrary kind="coupon" model={model} add={add} matches={matches} /></div>;
  if (tool === "tickets") return <div className="space-y-3">{targetChoice}<CommerceComponentLibrary kind="ticket" model={model} add={add} matches={matches} /></div>;
  if (tool === "text") return <TextLibrary model={model} add={add} matches={matches} targetChoice={targetChoice} targetSectionId={targetSectionId} />;
  if (tool === "brand") return <BrandDrawer model={model} add={add} matches={matches} />;
  if (tool === "assets") return <div className="space-y-3" data-testid="card-assets-library">{targetChoice}<p className="text-[10px] text-white/55">All · Brand-approved · Recent · Favorites · Uploaded · Product · Campaign · Offers · Backgrounds · Icons · Logos</p><MediaPicker label="Add Image" value="" mediaUploadReady={model.mediaUploadReady} stockReady={model.stockReady} onChange={(url) => { if (url) add("image", { src: url, alt: "Card image", sourceMode: "ASSET" }); }} /><button type="button" className="min-h-10 w-full rounded border border-white/10 text-xs" onClick={() => add("thumbnail", { src: "/tap-connect-logo.png", alt: "Product thumbnail", sourceMode: "ASSET" })}>Place product thumbnail</button><p className="text-[9px] text-white/40">Asset IDs and URL fallbacks remain on the canonical Element. Collections are views and do not duplicate files.</p></div>;
  if (tool === "backgrounds") return <BackgroundDrawer model={model} matches={matches} />;
  if (tool === "projects") return <ProjectsDrawer model={model} matches={matches} />;
  if (tool === "reusable") return <ReusableDrawer model={model} matches={matches} />;
  if (tool === "layers") return <LayersDrawer model={model} />;
  if (tool === "ai") return <AiAssistDrawer model={model} />;
  if (tool === "tools") return <QuickToolsDrawer model={model} add={add} />;
  return <div className="space-y-3 text-xs text-white/65" data-testid="card-creative-help"><p>The Card is the canvas. Add text, logos, media, icons, badges, and Buttons directly, or add a Section only when you want a shared surface or layout.</p><ol className="list-decimal space-y-2 pl-4"><li>Choose a tool and click an item to place it.</li><li>Select the object on canvas or in Layers.</li><li>Use its compact contextual toolbar and one focused drawer at a time. More → Advanced settings is optional.</li><li>Preview draft before Save and Publish.</li></ol><p>Keyboard: arrows nudge 1px; Shift+arrow nudges 10px; Shift-click selects multiple; Tab selects beneath in layer order.</p></div>;
}

function InsertionTargetChoice({ value, sectionName, onChange }: { value: "card" | "section"; sectionName: string; onChange: (value: "card" | "section") => void }) {
  return <fieldset className="mb-3 rounded-lg border border-[#b8ff2c]/25 bg-[#b8ff2c]/5 p-2" data-testid="insertion-target-choice"><legend className="px-1 text-[9px] font-semibold uppercase tracking-wide text-[#b8ff2c]">Insert into</legend><div className="grid grid-cols-2 gap-1"><button type="button" aria-pressed={value === "card"} className="min-h-9 rounded border border-white/10 px-2 text-[10px] aria-pressed:border-[#b8ff2c] aria-pressed:bg-[#b8ff2c]/10" onClick={() => onChange("card")}>Add to Card</button><button type="button" aria-pressed={value === "section"} className="min-h-9 rounded border border-white/10 px-2 text-[10px] aria-pressed:border-[#b8ff2c] aria-pressed:bg-[#b8ff2c]/10" onClick={() => onChange("section")}>Add to {sectionName}</button></div></fieldset>;
}

const TEXT_COMBINATIONS = [
  { id: "bold-offer", label: "Bold promotional", style: "linear-gradient(135deg,#ff7a18,#ef233c)", lines: [["TODAY ONLY", 16, 800], ["BIG SAVINGS", 34, 900]] },
  { id: "editorial", label: "Editorial serif", style: "linear-gradient(135deg,#f8fafc,#cbd5e1)", lines: [["The", 15, 500], ["EDIT", 38, 700]] },
  { id: "script-sans", label: "Script + sans", style: "linear-gradient(135deg,#fbcfe8,#fb7185)", lines: [["made with", 17, 500], ["LOVE", 34, 900]] },
  { id: "neon", label: "Neon", style: "linear-gradient(135deg,#67e8f9,#c084fc)", lines: [["CREATING", 15, 700], ["MAGIC", 35, 900]] },
  { id: "metallic", label: "Metallic", style: "linear-gradient(120deg,#8b949e,#ffffff 45%,#737b84)", lines: [["GOLDEN", 32, 800], ["HOUR", 32, 800]] },
  { id: "high-gloss", label: "High gloss", style: "linear-gradient(180deg,#ffffff,#fb7185 42%,#be123c)", lines: [["SHINE", 18, 700], ["BRIGHT", 36, 900]] },
  { id: "playful", label: "Playful", style: "linear-gradient(135deg,#fde047,#f472b6)", lines: [["SUPER", 21, 900], ["FUN!", 38, 900]] },
  { id: "elegant", label: "Wedding elegant", style: "linear-gradient(135deg,#fff7ed,#d8b4fe)", lines: [["together", 18, 500], ["FOREVER", 31, 700]] },
  { id: "luxury", label: "Luxury", style: "linear-gradient(135deg,#d4af37,#fff4b0)", lines: [["THE", 14, 500], ["SIGNATURE", 31, 700]] },
  { id: "retro", label: "Retro retail", style: "linear-gradient(135deg,#fb923c,#84cc16)", lines: [["NEW", 23, 900], ["DROP", 36, 900]] },
  { id: "sporty", label: "Sporty", style: "linear-gradient(135deg,#22c55e,#facc15)", lines: [["GAME", 18, 800], ["DAY", 39, 900]] },
  { id: "event", label: "Event", style: "linear-gradient(135deg,#38bdf8,#8b5cf6)", lines: [["FRIDAY NIGHT", 16, 700], ["LIVE", 38, 900]] },
  { id: "brand-derived", label: "Brand-derived", style: "linear-gradient(135deg,#b8ff2c,#22c55e)", lines: [["TAP INTO", 16, 700], ["MAGIC", 36, 900]] },
] as const;

function TextLibrary({ model, add, matches, targetChoice, targetSectionId }: { model: CardEditorLiveModel; add: (kind: CardElementKind, props?: Record<string, unknown>) => void; matches: (value: string) => boolean; targetChoice: ReactNode; targetSectionId: string | null }) {
  const [magicOpen, setMagicOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const selectedNode = (model.selected?.composition?.nodes ?? model.config.rootComposition?.nodes ?? []).find((node) => model.selectedCompositionNodeIds?.includes(node.id));
  const selectedText = selectedNode?.primitive === "text" ? selectedNode : null;
  const propose = () => {
    const request = prompt.trim();
    if (!request) return;
    if (/free fries/i.test(request)) setResult("🎉 Special Offer Alert! 🎉\n\nEnjoy FREE FRIES with any purchase of $20 or more. Visit us today and make it delicious.\n\nDraft terms: offer details and eligibility require Owner review.");
    else if (/headline/i.test(request)) setResult("Make today remarkable\nTap into something special\nYour next favorite starts here");
    else setResult(`A polished starting point for: ${request}\n\nReview names, dates, prices, eligibility, and terms before publishing.`);
  };
  const insertText = (text: string, variation = false) => add("text", { text, fontSize: 18, fontWeight: 500, aiAuthored: true, ownerReviewRequired: /terms/i.test(text), variation });
  const insertCombination = (combination: typeof TEXT_COMBINATIONS[number]) => {
    model.onAddObjects?.(combination.lines.map(([text, fontSize, fontWeight], index) => ({ kind: "text", initialProps: { text, fontSize, fontWeight, textAlign: "center", gradientFill: combination.style, combinationId: combination.id, combinationOrder: index } })), targetSectionId, `Added ${combination.label} Text combination`);
  };
  return <div className="space-y-3" data-testid="card-text-library">{targetChoice}<input type="search" aria-label="Search fonts and combinations" placeholder="Search fonts and combinations" className="h-10 w-full rounded-lg border border-white/15 bg-black/20 px-3 text-xs" /><button type="button" className="min-h-11 w-full rounded-lg bg-[#b8ff2c] text-sm font-semibold text-black" onClick={() => add("text", { text: "Type here", fontSize: 20 })}>Add text box</button><div className="grid grid-cols-3 gap-1">{([ ["heading", "Heading", 34, 800], ["subheading", "Subheading", 24, 700], ["text", "Body text", 17, 400] ] as const).map(([kind, label, fontSize, fontWeight]) => <button key={label} type="button" className="min-h-10 rounded border border-white/10 px-1 text-[10px]" onClick={() => add(kind, { text: `Add ${label.toLowerCase()}`, fontSize, fontWeight })}>{label}</button>)}</div><button type="button" className="min-h-11 w-full rounded-lg border border-white/15 text-sm font-semibold" onClick={() => { setMagicOpen((open) => !open); setResult(null); }}>✦ Magic Write</button>{magicOpen ? <section className="space-y-2 rounded-xl border border-[#b8ff2c]/30 bg-[#0b1019] p-3" data-testid="magic-write-panel"><label className="text-[10px] text-white/65">What should the Text say?<textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Present an offer for free fries with a $20 purchase" className="mt-1 min-h-24 w-full rounded border border-white/15 bg-black/20 p-2 text-xs" /></label><button type="button" disabled={!prompt.trim()} className="min-h-10 w-full rounded bg-[#b8ff2c] text-xs font-semibold text-black disabled:opacity-40" onClick={propose}>Review result</button>{result ? <div className="space-y-2" data-testid="magic-write-result"><textarea aria-label="Editable Magic Write result" value={result} onChange={(event) => setResult(event.target.value)} className="min-h-40 w-full rounded border border-white/15 bg-black/20 p-2 text-xs" /><p className="text-[9px] text-amber-200">AI-authored starting point. Check offer facts and legal terms before publishing.</p><div className="grid grid-cols-2 gap-1"><button type="button" className="min-h-9 rounded bg-[#b8ff2c] text-xs font-semibold text-black" onClick={() => { insertText(result); setResult(null); }}>Insert</button><button type="button" disabled={!selectedText} className="min-h-9 rounded border border-white/15 text-xs disabled:opacity-35" onClick={() => { if (selectedText) model.patchSelection(model.selectionRef, { props: { ...selectedText.props, text: result, aiAuthored: true } }, "Replaced selected Text with Magic Write"); }}>Replace selected Text</button><button type="button" className="min-h-9 rounded border border-white/15 text-xs" onClick={() => insertText(result, true)}>Add as variation</button><button type="button" className="min-h-9 rounded border border-white/15 text-xs" onClick={propose}>More like this</button><button type="button" className="min-h-9 rounded border border-white/15 text-xs" onClick={() => setResult(null)}>Refine</button><button type="button" className="min-h-9 rounded border border-white/15 text-xs" onClick={() => { setMagicOpen(false); setResult(null); }}>Cancel</button></div></div> : null}</section> : null}<div className="flex items-center justify-between"><h3 className="text-[10px] font-semibold uppercase tracking-wide text-white/55">Text combinations</h3><span className="text-[9px] text-white/35">Editable objects</span></div><div className="grid grid-cols-2 gap-2" data-testid="text-combination-library">{TEXT_COMBINATIONS.filter((item) => matches(item.label)).map((combination) => <button key={combination.id} type="button" className="min-h-24 rounded-xl border border-white/10 bg-white/[.03] p-2 text-center hover:border-[#b8ff2c]/50" data-testid={`text-combination-${combination.id}`} onClick={() => insertCombination(combination)}>{combination.lines.map(([text, size, weight]) => <span key={text} className="block bg-clip-text text-transparent" style={{ backgroundImage: combination.style, fontSize: Math.max(10, size / 2), fontWeight: weight }}>{text}</span>)}<span className="mt-2 block text-[9px] text-white/50">{combination.label}</span></button>)}</div><p className="text-[10px] text-white/45">Brand Text styles · Saved styles · Recent · Favorites</p></div>;
}

const COUPON_PRESETS = [
  ["percentage", "Percentage discount", "20% OFF", "clean retail"], ["dollar", "Dollar discount", "$10 OFF", "bold promotional"],
  ["free-item", "Free item", "FREE ITEM", "playful"], ["bogo", "Buy one get one", "BOGO", "high gloss"],
  ["loyalty", "Loyalty reward", "REWARD", "metallic"], ["vip", "VIP reward", "VIP", "luxury"],
  ["event", "Event offer", "EVENT DEAL", "neon"], ["limited", "Limited-time offer", "TODAY ONLY", "ticket stub"],
  ["wallet", "Wallet coupon", "SAVE TO WALLET", "glass"], ["qr", "QR claim", "SCAN TO CLAIM", "Brand"],
  ["blank", "Blank custom", "YOUR OFFER", "saved styles"],
] as const;
const TICKET_PRESETS = [
  ["event", "Event admission", "ADMIT ONE", "concert"], ["vip", "VIP pass", "VIP ACCESS", "luxury"],
  ["raffle", "Raffle", "LUCKY TICKET", "vintage"], ["drink", "Drink ticket", "ONE DRINK", "playful"],
  ["meal", "Meal ticket", "MEAL PASS", "clean"], ["appointment", "Appointment", "RESERVED", "Brand"],
  ["numbered", "Numbered ticket", "TICKET 001", "sporting"], ["scannable", "Scannable ticket", "SCAN ENTRY", "neon"],
  ["wallet", "Wallet ticket", "ADD TO WALLET", "glass"], ["blank", "Blank custom", "YOUR EVENT", "saved styles"],
] as const;

function CommerceComponentLibrary({ kind, model, add, matches }: { kind: "coupon" | "ticket"; model: CardEditorLiveModel; add: (kind: CardElementKind, props?: Record<string, unknown>) => void; matches: (value: string) => boolean }) {
  const [aiPrompt, setAiPrompt] = useState("");
  const [proposal, setProposal] = useState<Record<string, unknown> | null>(null);
  const presets = kind === "coupon" ? COUPON_PRESETS : TICKET_PRESETS;
  const addPreset = (id: string, label: string, value: string, style: string) => add(kind, kind === "coupon" ? { presetId: id, headline: label, offerValue: value, code: id === "blank" ? "CUSTOM" : "SAVE20", visualStyle: style, terms: "Draft terms — review before publishing.", ownerReviewRequired: true } : { presetId: id, title: value, event: label, ticketId: "TICKET-001", visualStyle: style, terms: "Draft terms — review before publishing.", ownerReviewRequired: true });
  return <div className="space-y-3" data-testid={`card-${kind}-library`}><div className="rounded-lg border border-white/10 p-2"><p className="text-[10px] font-semibold">Create with AI</p><textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} placeholder={`Create a ${kind === "coupon" ? "high-end percentage Coupon" : "playful child admission Ticket"}`} className="mt-2 min-h-16 w-full rounded border border-white/10 bg-black/20 p-2 text-[10px]" /><button type="button" disabled={!aiPrompt.trim()} className="mt-2 min-h-9 w-full rounded bg-[#b8ff2c] text-xs font-semibold text-black disabled:opacity-40" onClick={() => setProposal(kind === "coupon" ? { headline: "AI OFFER STARTING POINT", offerValue: "20% OFF", visualStyle: "high gloss", aiAuthored: true } : { title: "AI EVENT PASS", event: "Owner review required", visualStyle: "neon", aiAuthored: true })}>Preview proposal</button>{proposal ? <div className="mt-2 rounded border border-[#b8ff2c]/25 p-2" data-testid={`ai-${kind}-proposal`}><pre className="whitespace-pre-wrap text-[9px]">{JSON.stringify(proposal, null, 2)}</pre><div className="mt-2 grid grid-cols-2 gap-1"><button type="button" className="min-h-9 rounded bg-[#b8ff2c] text-xs font-semibold text-black" onClick={() => { add(kind, { ...proposal, terms: "Draft terms — review before publishing.", ownerReviewRequired: true }); setProposal(null); }}>Insert editable</button><button type="button" className="min-h-9 rounded border border-white/10 text-xs" onClick={() => setProposal(null)}>Cancel</button></div></div> : null}</div><MediaPicker label={`Use uploaded artwork as ${kind} surface`} value="" mediaUploadReady={model.mediaUploadReady} stockReady={model.stockReady} onChange={(url) => { if (url) add(kind, { artworkSrc: url, surfaceMode: "uploaded_artwork", ownerReviewRequired: true }); }} /><div className="grid grid-cols-2 gap-2">{presets.filter((preset) => matches(preset.join(" "))).map(([id, label, value, style]) => <button key={id} type="button" className="min-h-28 rounded-xl border border-white/10 bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500 p-2 text-left text-[#17100a] hover:ring-2 hover:ring-[#b8ff2c]" data-testid={`${kind}-preset-${id}`} onClick={() => addPreset(id, label, value, style)}><span className="text-[8px] font-black uppercase tracking-widest">{kind}</span><strong className="mt-2 block text-base leading-none">{value}</strong><span className="mt-2 block text-[9px]">{label}</span><span className="block text-[8px] opacity-65">{style}</span></button>)}</div><p className="text-[9px] text-white/45">Every preset inserts editable content, identity/code, QR context, terms, and action setup. No redemption, issuance, or validation runs here.</p></div>;
}

const BUTTON_LIBRARY = [
  { id: "call-round", label: "Round Call", purpose: "Call", style: { presentation: "circle", radius: 999, fill: "#b8ff2c", textColor: "#07100a", labelColor: "#07100a", icon: "phone", iconPosition: "before", actionType: "call", label: "Call" } },
  { id: "text-compact", label: "Compact Text", purpose: "Text", style: { presentation: "rounded", radius: 12, fill: "#2563eb", icon: "message-circle", iconPosition: "before", actionType: "text", label: "Text us" } },
  { id: "email-soft", label: "Soft Email", purpose: "Email", style: { presentation: "pill", radius: 999, fill: "#e0e7ff", labelColor: "#312e81", icon: "mail", iconPosition: "before", actionType: "email", label: "Send email" } },
  { id: "directions-glass", label: "Directions Glass", purpose: "Directions", style: { presentation: "rounded", radius: 20, buttonSurfaceKind: "gradient", gradientStart: "#ffffff3d", gradientEnd: "#ffffff0a", borderWidth: 1, borderColor: "#ffffff80", icon: "map-pin", actionType: "directions", label: "Directions" } },
  { id: "claim-gloss", label: "Glossy Claim", purpose: "Claim", style: { presentation: "pill", radius: 999, buttonSurfaceKind: "gradient", gradientStart: "#f97316", gradientEnd: "#dc2626", shine: true, actionType: "coupon", label: "Claim offer" } },
  { id: "website-outline", label: "Website Outline", purpose: "Website", style: { presentation: "rounded", radius: 12, fill: "transparent", borderWidth: 2, borderColor: "#b8ff2c", textColor: "#b8ff2c", labelColor: "#b8ff2c", actionType: "website", label: "Visit website" } },
  { id: "contact-card", label: "Save Contact", purpose: "Save contact", style: { presentation: "rounded", radius: 16, fill: "#1e293b", borderWidth: 1, borderColor: "#94a3b8", icon: "contact", actionType: "save_contact", label: "Save to contacts" } },
  { id: "tapsave-primary", label: "TapSave Primary", purpose: "TapSave", style: { presentation: "rounded", radius: 14, fill: "#b8ff2c", labelColor: "#07100a", icon: "bookmark-plus", actionType: "tapsave", label: "Keep this Card" } },
  { id: "wallet-metal", label: "Wallet Metal", purpose: "Wallet", style: { presentation: "rounded", radius: 10, buttonSurfaceKind: "gradient", gradientStart: "#e5e7eb", gradientEnd: "#64748b", labelColor: "#0f172a", icon: "wallet-cards", actionType: "wallet", label: "Add to wallet" } },
  { id: "rsvp-neon", label: "Neon RSVP", purpose: "RSVP", style: { presentation: "pill", radius: 999, fill: "#111827", borderWidth: 2, borderColor: "#67e8f9", labelColor: "#67e8f9", icon: "calendar-check", actionType: "rsvp", label: "RSVP now" } },
  { id: "form-wide", label: "Wide Form", purpose: "Form", style: { presentation: "rounded", radius: 8, fill: "#7c3aed", icon: "clipboard-list", actionType: "form", label: "Open form" } },
  { id: "reviews-minimal", label: "Minimal Reviews", purpose: "Reviews", style: { presentation: "rounded", radius: 8, fill: "transparent", borderWidth: 1, borderColor: "#facc15", labelColor: "#facc15", icon: "star", actionType: "reviews", label: "Read reviews" } },
  { id: "social-square", label: "Social Square", purpose: "Social", style: { presentation: "square", radius: 6, fill: "#ec4899", icon: "share-2", actionType: "social", label: "Follow us" } },
  { id: "blank", label: "Blank Button", purpose: "Custom", style: { presentation: "rounded", radius: 12, fill: "#334155", actionType: undefined, label: "Button" } },
] as const;

function ButtonLibrary({ add, matches }: { add: (kind: CardElementKind, props?: Record<string, unknown>) => void; matches: (value: string) => boolean }) {
  return <div className="space-y-3" data-testid="card-button-library"><p className="text-[10px] text-white/55">Purpose · composition · style. Every tile creates the same canonical Button composition.</p><div className="grid grid-cols-2 gap-2">{BUTTON_LIBRARY.filter((preset) => matches(`${preset.label} ${preset.purpose}`)).map((preset) => <button key={preset.id} type="button" className="group min-h-24 rounded-lg border border-white/10 p-2 text-left hover:border-[#b8ff2c]/50" data-testid={`button-preset-${preset.id}`} onClick={() => add("button", { ...preset.style, accessibleLabel: preset.style.label, trackingName: `button-${preset.id}` })}><span className="flex min-h-12 items-center justify-center border border-white/10 px-2 text-center text-[10px] font-semibold" style={{ borderRadius: Number(preset.style.radius || 0), background: String("gradientStart" in preset.style ? `linear-gradient(120deg,${preset.style.gradientStart},${preset.style.gradientEnd})` : preset.style.fill || "#334155"), color: String("labelColor" in preset.style ? preset.style.labelColor : "#fff"), borderWidth: Number("borderWidth" in preset.style ? preset.style.borderWidth : 0), borderColor: String("borderColor" in preset.style ? preset.style.borderColor : "transparent") }}>{preset.style.label}</span><span className="mt-2 block text-[10px] text-white/75">{preset.label}</span><span className="block text-[8px] text-white/40">{preset.purpose}</span></button>)}</div></div>;
}

const BADGE_SHAPES = [
  ["pill", "Pill", 999], ["circle", "Circle", 999], ["rounded", "Rounded rectangle", 14], ["burst", "Burst", 0],
  ["starburst", "Starburst", 0], ["ribbon", "Ribbon", 0], ["corner-ribbon", "Corner ribbon", 0], ["seal", "Seal", 999],
  ["ticket", "Ticket", 4], ["tag", "Tag", 4], ["shield", "Shield", 0], ["hexagon", "Hexagon", 0],
] as const;
const BADGE_MATERIALS = [
  ["flat", "Flat", "#dc2626", "#ffffff"], ["enamel", "High-gloss enamel", "linear-gradient(180deg,#fff7,#ef4444 42%,#991b1b)", "#ffffff"],
  ["chrome", "Chrome", "linear-gradient(120deg,#64748b,#ffffff 50%,#64748b)", "#111827"], ["silver", "Brushed silver", "linear-gradient(120deg,#6b7280,#e5e7eb,#9ca3af)", "#111827"],
  ["gold", "Gold foil", "linear-gradient(120deg,#8a5a00,#ffe169,#b77900)", "#17100a"], ["rose-gold", "Rose gold", "linear-gradient(120deg,#9f5f59,#f4c2b8,#a75d56)", "#2b1110"],
  ["copper", "Copper", "linear-gradient(120deg,#7c2d12,#fb923c,#9a3412)", "#fff7ed"], ["gunmetal", "Gunmetal", "linear-gradient(120deg,#111827,#64748b,#1f2937)", "#ffffff"],
  ["frosted-glass", "Frosted glass", "#ffffff24", "#ffffff"], ["clear-glass", "Clear glass", "#ffffff0f", "#ffffff"],
  ["embossed", "Embossed", "#334155", "#f8fafc"], ["sticker", "Glossy sticker", "linear-gradient(180deg,#fff5,#a3e635 35%,#4d7c0f)", "#17220a"],
  ["neon", "Neon", "#111827", "#67e8f9"], ["outline", "Outline", "transparent", "#b8ff2c"],
] as const;

function BadgeLibrary({ add, matches }: { add: (kind: CardElementKind, props?: Record<string, unknown>) => void; matches: (value: string) => boolean }) {
  const [wording, setWording] = useState("SALE");
  const [shape, setShape] = useState<(typeof BADGE_SHAPES)[number]>(BADGE_SHAPES[0]);
  const [material, setMaterial] = useState<(typeof BADGE_MATERIALS)[number]>(BADGE_MATERIALS[0]);
  const place = (text = wording) => add("badge", { text, accessibleLabel: text, badgeShape: shape[0], radius: shape[2], materialPreset: material[0], fill: material[2], color: material[3], borderWidth: material[0] === "outline" ? 2 : 0, borderColor: material[3] });
  return <div className="space-y-3" data-testid="polished-badge-library"><label className="block text-[10px] text-white/55">Wording<input value={wording} onChange={(event) => setWording(event.target.value)} className="mt-1 h-10 w-full rounded border border-white/15 bg-black/20 px-3 text-xs" /></label><button type="button" disabled={!wording.trim()} className="min-h-11 w-full rounded-lg bg-[#b8ff2c] text-sm font-semibold text-black disabled:opacity-40" onClick={() => place()}>Add editable Badge</button><h3 className="text-[10px] font-semibold uppercase tracking-wide text-white/45">Wording presets</h3><div className="grid grid-cols-2 gap-1">{BADGE_WORDING.filter(matches).map((word) => <button key={word} type="button" className="min-h-9 rounded border border-white/10 text-[9px]" onClick={() => { setWording(word); place(word); }}>{word}</button>)}</div><h3 className="text-[10px] font-semibold uppercase tracking-wide text-white/45">Shapes</h3><div className="grid grid-cols-2 gap-1">{BADGE_SHAPES.filter((item) => matches(item[1])).map((item) => <button key={item[0]} type="button" aria-pressed={shape[0] === item[0]} className="min-h-10 border border-white/10 px-2 text-[10px] aria-pressed:border-[#b8ff2c]" style={{ borderRadius: item[2] }} onClick={() => setShape(item)}>{item[1]}</button>)}</div><h3 className="text-[10px] font-semibold uppercase tracking-wide text-white/45">Materials and styles</h3><div className="grid grid-cols-2 gap-2">{BADGE_MATERIALS.filter((item) => matches(item[1])).map((item) => <button key={item[0]} type="button" aria-pressed={material[0] === item[0]} className="min-h-16 rounded-lg border border-white/10 p-2 text-[10px] aria-pressed:ring-2 aria-pressed:ring-[#b8ff2c]" style={{ background: item[2], color: item[3] }} onClick={() => setMaterial(item)}>{item[1]}</button>)}</div><p className="text-[9px] text-white/45">Every choice creates the same editable Badge model. Wording, Shape, Appearance, Motion, and Position remain independent.</p></div>;
}

function ProjectsDrawer({ model, matches }: { model: CardEditorLiveModel; matches: (value: string) => boolean }) {
  return <div className="space-y-3" data-testid="card-projects-drawer"><p className="text-[10px] text-white/55">Creative documents and related editable variations. Assets remain in Assets.</p><div className="flex gap-1 text-[9px]"><span className="rounded-full border border-white/10 px-2 py-1">Tap Card</span><span className="rounded-full border border-white/10 px-2 py-1">Recent</span><span className="rounded-full border border-white/10 px-2 py-1">Variations</span></div>{model.documents.filter((document) => matches(document.name)).map((document) => <button type="button" key={document.id} aria-pressed={document.id === model.activeDocumentId} className="flex min-h-16 w-full items-center gap-2 rounded-lg border border-white/10 p-2 text-left aria-pressed:border-[#b8ff2c]" onClick={() => void model.openDocument(document.id)}><span className="grid h-12 w-10 shrink-0 place-items-center rounded bg-gradient-to-b from-slate-700 to-slate-950 text-[8px]">CARD</span><span className="min-w-0"><span className="block truncate text-xs">{document.name}</span><span className="text-[9px] text-white/45">{document.type === "MAIN_CARD" ? "Tap Card" : "Related variation"}</span></span></button>)}</div>;
}

function AiAssistDrawer({ model }: { model: CardEditorLiveModel }) {
  const [prompt, setPrompt] = useState("");
  const [proposal, setProposal] = useState<{ selection: CardEditorLiveModel["selectionRef"]; patch: Record<string, unknown> } | null>(null);
  const selection = model.selectionRef;
  const scope = selection.objectKind === "root_surface" ? "Current Tap Card" : `${selection.objectKind.replaceAll("_", " ")} · ${selection.objectId}`;
  const propose = () => {
    if (selection.objectKind === "element") setProposal({ selection, patch: { props: { fill: "#b8860b", boxGlow: 14, glowColor: "#facc15" } } });
    else if (selection.objectKind === "section") setProposal({ selection, patch: { surfaceRadiusPx: 24, surfaceShadow: "soft", surfaceGapPx: 16 } });
    else setProposal({ selection, patch: {} });
  };
  return <div className="space-y-3" data-testid="card-ai-assist-drawer"><div className="rounded-lg border border-[#b8ff2c]/25 bg-[#b8ff2c]/5 p-2"><p className="text-[9px] font-semibold uppercase text-[#b8ff2c]">Active scope</p><p className="mt-1 text-xs" data-testid="ai-active-scope">{scope}</p></div><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe a visual change" className="min-h-28 w-full rounded-lg border border-white/10 bg-black/20 p-3 text-xs" /><button type="button" disabled={!prompt.trim()} className="min-h-10 w-full rounded bg-[#b8ff2c] px-2 text-xs font-semibold text-black disabled:opacity-40" onClick={propose}>Preview proposal</button>{proposal ? <section className="rounded-lg border border-white/10 p-3" data-testid="ai-proposal" data-proposal-object={proposal.selection.objectId}><h3 className="text-xs font-semibold">Proposed canonical changes</h3><p className="mt-1 text-[10px] text-white/55">Visual properties only. Action, destination, QR, Campaign, tracking, accessibility, data binding, consent, and publication are preserved.</p><pre className="mt-2 overflow-auto rounded bg-black/30 p-2 text-[9px]">{JSON.stringify(proposal.patch, null, 2)}</pre><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" className="min-h-10 rounded bg-[#b8ff2c] text-xs font-semibold text-black" onClick={() => { const proposalSelection = proposal.selection; if (proposalSelection.objectKind === "element" && proposal.patch.props) { const parent = proposalSelection.parentId === "card-page" ? null : model.sorted.find((section) => section.id === proposalSelection.parentId); const node = (parent?.composition?.nodes ?? model.config.rootComposition?.nodes ?? []).find((candidate) => candidate.id === proposalSelection.objectId); if (node) model.patchSelection(proposalSelection, { props: { ...node.props, ...(proposal.patch.props as Record<string, unknown>) } }, "Applied AI visual proposal"); } else model.patchSelection(proposalSelection, proposal.patch, "Applied AI visual proposal"); setProposal(null); }}>Apply</button><button type="button" className="min-h-10 rounded border border-white/15 text-xs" onClick={() => setProposal(null)}>Cancel</button><button type="button" className="min-h-10 rounded border border-white/15 text-xs" onClick={() => setProposal(null)}>Refine</button><button type="button" className="min-h-10 rounded border border-white/15 text-xs" onClick={model.onUndo} disabled={!model.canUndo}>Undo</button></div></section> : null}<p className="text-[9px] text-white/40">Development fixture proposes deterministic edits; no content is published and no customer message is sent.</p></div>;
}

function QuickToolsDrawer({ model, add }: { model: CardEditorLiveModel; add: (kind: CardElementKind, props?: Record<string, unknown>) => void }) {
  return <div className="space-y-2" data-testid="card-quick-tools"><p className="text-[10px] text-white/55">Compact commands use the same placement and mutation authority as the libraries.</p><div className="grid grid-cols-2 gap-2"><LibraryAction label="Select" description="Return to selection" onClick={() => { model.setSelectedId(null); model.setSelectedCompositionNodeIds?.([]); }} /><LibraryAction label="Text" description="Place editable text" onClick={() => add("text", { text: "Type here" })} /><LibraryAction label="Shape" description="Place a shape" onClick={() => add("decorative_graphic", { shape: "rectangle" })} /><LibraryAction label="QR" description="Place managed QR artwork" onClick={() => add("qr_image", { qrManagementState: "setup_required", accessibleLabel: "QR code setup required" })} /></div><div className="space-y-1 pt-2"><button type="button" disabled className="min-h-10 w-full rounded border border-white/10 text-xs opacity-50">Charts · data contract required</button><button type="button" disabled className="min-h-10 w-full rounded border border-white/10 text-xs opacity-50">Captions · media required</button><button type="button" disabled={!model.mediaUploadReady} className="min-h-10 w-full rounded border border-white/10 text-xs opacity-50">Background removal · {model.mediaUploadReady ? "select an image" : "provider setup required"}</button></div></div>;
}

function BrandDrawer({ model, add, matches }: { model: CardEditorLiveModel; add: (kind: CardElementKind, props?: Record<string, unknown>) => void; matches: (value: string) => boolean }) {
  const logo = model.strInherited("logoUrl") || model.logoUrl || "/tap-connect-logo.png";
  const colors = [model.config.accentColor, model.config.surfaceColor, model.config.textColor, model.config.neonColor].filter(Boolean) as string[];
  return <div className="space-y-3" data-testid="card-brand-drawer"><section><h3 className="text-[10px] font-semibold uppercase text-white/45">Logos</h3>{matches("Primary logo") ? <button type="button" className="mt-2 w-full rounded border border-white/10 bg-white p-3" onClick={() => add("logo", { src: logo, alt: `${model.businessName} logo`, sourceMode: "BRAND", brandResourceId: "brand-primary-logo" })}><Image unoptimized src={logo} width={180} height={56} alt="Primary logo preview" className="mx-auto h-14 max-w-full object-contain" /></button> : null}<div className="mt-1 grid grid-cols-2 gap-1"><button type="button" className="min-h-10 rounded border border-white/10 text-[10px]" onClick={() => add("secondary_logo", { src: logo, alt: "Alternate logo", sourceMode: "BRAND", brandResourceId: "brand-alternate-logo" })}>Alternate logo</button><button type="button" className="min-h-10 rounded border border-white/10 text-[10px]" onClick={() => add("secondary_logo", { src: logo, alt: "Sponsor logo", sourceMode: "BRAND", brandResourceId: "brand-sponsor-logo" })}>Sponsor logo</button></div></section><section><h3 className="text-[10px] font-semibold uppercase text-white/45">Colors</h3><div className="mt-2 grid grid-cols-4 gap-1">{colors.map((color, index) => <button key={`${color}-${index}`} type="button" className="aspect-square rounded border border-white/20" style={{ background: color }} aria-label={`Apply Brand color ${color}`} onClick={() => model.patchConfigColor("accentColor", color)} />)}</div></section><section><h3 className="text-[10px] font-semibold uppercase text-white/45">Fonts</h3><button type="button" className="mt-2 min-h-12 w-full rounded border border-white/10 px-2 text-left text-sm" style={{ fontFamily: model.strInherited("bodyFont") }} onClick={() => add("text", { text: "Brand text", fontFamily: model.strInherited("bodyFont") || "Inter, system-ui, sans-serif", sourceMode: "BRAND" })}>{model.strInherited("bodyFont") || "Brand body font"}</button></section><p className="text-[9px] text-white/45">Choose one resource without applying the entire Brand Kit. Local Custom values remain until Reset to Brand.</p></div>;
}

function BackgroundDrawer({ model, matches }: { model: CardEditorLiveModel; matches: (value: string) => boolean }) {
  const root = ensureRootComposition(model.config);
  const setBackground = (background: typeof root.background, label: string) => model.patchConfig({ rootComposition: { ...root, background } }, label);
  const setImageBackground = (src: string) => {
    if (!src) return;
    setBackground({ kind: "image", image: { src, fallbackUrl: src, fit: "cover", focalX: .5, focalY: .5, scale: 1, repeat: "no-repeat", blur: 0, brightness: 1, contrast: 1, overlayColor: "#000000", overlayOpacity: .2, blendMode: "normal", decorative: true } }, "Changed Card root image background");
  };
  return <div className="space-y-3" data-testid="card-background-library"><h3 className="text-[10px] font-semibold uppercase text-white/45">Solid</h3><div className="grid grid-cols-4 gap-1">{[model.config.surfaceColor, model.config.accentColor, "#020617", "#f8fafc"].map((color) => <button key={color} type="button" className="aspect-square rounded border border-white/15" style={{ background: color }} aria-label={`Background ${color}`} onClick={() => setBackground({ kind: "solid", value: color }, "Changed Card root solid background")} />)}</div><h3 className="text-[10px] font-semibold uppercase text-white/45">Gradients</h3>{GRADIENT_PRESETS.filter((preset) => matches(preset.label)).map((preset) => <LibraryAction key={preset.id} label={preset.label} description="Editable gradient" onClick={() => setBackground({ kind: "gradient", gradient: structuredClone(preset.gradient) }, `Applied ${preset.label} gradient`)} />)}<h3 className="text-[10px] font-semibold uppercase text-white/45">Image</h3><MediaPicker label="Choose background image" value={root.background?.kind === "image" ? root.background.image?.src || "" : ""} mediaUploadReady={model.mediaUploadReady} stockReady={model.stockReady} onChange={setImageBackground} /><button type="button" className="min-h-10 w-full rounded border border-white/10 text-xs" onClick={() => setImageBackground(model.strInherited("logoUrl") || model.logoUrl || "/tap-connect-logo.png")}>Use primary Brand image as background</button><h3 className="text-[10px] font-semibold uppercase text-white/45">Patterns and textures</h3>{SURFACE_PATTERN_CATALOG.filter((pattern) => matches(`${pattern.label} ${pattern.category}`)).slice(0, 12).map((pattern) => <LibraryAction key={pattern.id} label={pattern.label} description={pattern.category} onClick={() => setBackground({ kind: pattern.kind, pattern: { version: 1, id: pattern.id, kind: pattern.kind, scale: 1, rotation: 45, opacity: .18, foreground: model.config.accentColor, background: model.config.surfaceColor, blendMode: "normal" } }, `Applied ${pattern.label} ${pattern.kind}`)} />)}<button type="button" className="min-h-10 w-full rounded border border-white/10 text-xs" onClick={() => setBackground({ kind: "none" }, "Removed Card root background")}>Transparent</button><button type="button" className="sr-only" onClick={() => setBackground({ kind: "gradient", gradient: structuredClone(DEFAULT_GRADIENT) }, "Applied default gradient")}>Default gradient</button></div>;
}

function ReusableDrawer({ model, matches }: { model: CardEditorLiveModel; matches: (value: string) => boolean }) {
  const [name, setName] = useState("Free Fries Tonight");
  const resources = model.config.reusableCompositions ?? [];
  const selectedComposition = model.selected?.composition ?? model.config.rootComposition;
  const selectedIds = model.selectedCompositionNodeIds ?? [];
  const canSave = Boolean(selectedComposition?.nodes.length);
  const save = () => {
    if (!selectedComposition) return;
    const nodes = selectedIds.length ? selectedComposition.nodes.filter((node) => selectedIds.includes(node.id)) : selectedComposition.nodes;
    const resource = saveReusableComposition({ block: { ...selectedComposition, nodes: structuredClone(nodes) }, name });
    model.patchConfig({ reusableCompositions: [...resources, resource] }, `Saved reusable composition ${resource.label}`);
  };
  const place = (resource: (typeof resources)[number]) => {
    const instance = instantiateReusableComposition(resource);
    const root = ensureRootComposition(model.config);
    const maxZ = root.nodes.reduce((value, node) => Math.max(value, node.zIndex), 0);
    const nodes = instance.nodes.map((node, index) => ({ ...node, id: `${node.id}-${instance.id}`, groupId: instance.id, x: Math.min(.88, node.x + .03), y: Math.min(.88, node.y + .03), zIndex: maxZ + index + 1, props: { ...node.props, compositionResourceId: resource.id, compositionInstanceId: instance.id } }));
    model.patchConfig({ rootComposition: { ...root, nodes: [...root.nodes, ...nodes] } }, `Placed reusable composition ${resource.label}`);
  };
  return <div className="space-y-3" data-testid="reusable-composition-library"><div className="rounded border border-white/10 p-2"><label className="text-[10px] text-white/60">Composition name<input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 h-9 w-full rounded border border-white/10 bg-black/20 px-2 text-xs" /></label><button type="button" disabled={!canSave} className="mt-2 min-h-10 w-full rounded bg-[#b8ff2c] px-2 text-xs font-semibold text-[#07100a] disabled:opacity-40" onClick={save}>Save selection as reusable composition</button><p className="mt-1 text-[9px] text-white/40">No flattening: canonical Elements, background, styles, and motion are preserved.</p></div>{resources.filter((resource) => matches(resource.label)).map((resource) => <div key={resource.id} className="rounded border border-white/10 p-2" data-testid="reusable-composition-resource"><p className="text-xs font-semibold">{resource.label}</p><p className="text-[9px] text-white/45">{resource.nodes.length} editable Elements · revision {resource.resourceRef?.revisionId}</p><button type="button" className="mt-2 min-h-9 w-full rounded border border-white/10 text-[10px]" onClick={() => place(resource)}>Place independent instance</button></div>)}{resources.length === 0 ? <p className="text-xs text-white/45">Select one or more Elements, then save the first reusable composition.</p> : null}</div>;
}

function LibraryAction({ label, description, onClick }: { label: string; description: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="block min-h-12 w-full rounded border border-white/10 px-2 py-2 text-left hover:bg-white/5"><span className="block text-xs text-white/80">{label}</span><span className="block text-[9px] text-white/45">{description}</span></button>; }
function LayersDrawer({ model }: { model: CardEditorLiveModel }) {
  const selectNode = (parentId: string | null, nodeId: string, additive: boolean) => {
    const sameParent = (parentId === null && !model.selected) || model.selected?.id === parentId;
    const current = sameParent ? model.selectedCompositionNodeIds ?? [] : [];
    model.setSelectedId(parentId);
    model.setSelectedCompositionNodeIds?.(
      additive
        ? (current.includes(nodeId) ? current.filter((id) => id !== nodeId) : [...current, nodeId])
        : [nodeId]
    );
  };
  const rootNodes = [...ensureRootComposition(model.config).nodes].sort((a, b) => b.zIndex - a.zIndex);
  const rootTopLevel = rootNodes.filter((node) => !node.props.containerId);
  return <div className="space-y-2" data-testid="card-layers-drawer">
    <p className="text-[9px] text-white/45">Authoritative object tree · topmost layer first · Shift-click for multi-select</p>
    <div className="rounded-md border border-white/10 p-1" data-layer-container="card-root">
      <LayerButton active={!model.selected && !(model.selectedCompositionNodeIds?.length)} label="Card root" onClick={() => { model.setSelectedId(null); model.setSelectedCompositionNodeIds?.([]); }} />
      {rootTopLevel.map((node) => <LayerObjectRow key={node.id} model={model} node={node} parentId={null} siblings={rootNodes} active={!model.selected && Boolean(model.selectedCompositionNodeIds?.includes(node.id))} onSelect={selectNode} />)}
    </div>
    {model.sorted.map((section) => <div key={section.id} className="rounded-md border border-white/10 p-1" data-layer-container={section.id}>
      <div className="flex items-center gap-1">
        <LayerButton active={model.selected?.id === section.id && !model.selectedCompositionNodeIds?.length} label={section.label || section.type} onClick={() => { model.setSelectedId(section.id); model.setSelectedCompositionNodeIds?.([]); }} />
        <LayerIconButton label={section.enabled === false ? "Show Section" : "Hide Section"} onClick={() => model.toggleSectionVisible(section.id)}>{section.enabled === false ? <EyeOff /> : <Eye />}</LayerIconButton>
        <LayerIconButton label={section.locked ? "Unlock Section" : "Lock Section"} onClick={() => model.toggleSectionLocked(section.id)}>{section.locked ? <Lock /> : <Unlock />}</LayerIconButton>
        <LayerIconButton label="Duplicate Section" onClick={() => model.duplicateSection(section.id)}><Copy /></LayerIconButton>
        <LayerIconButton label="Delete Section" onClick={() => model.deleteSection(section.id)} danger><Trash2 /></LayerIconButton>
      </div>
      {[...(section.composition?.nodes ?? [])].sort((a, b) => b.zIndex - a.zIndex).map((node) => <LayerObjectRow key={node.id} model={model} node={node} parentId={section.id} active={model.selected?.id === section.id && Boolean(model.selectedCompositionNodeIds?.includes(node.id))} onSelect={selectNode} />)}
    </div>)}
  </div>;
}

function LayerObjectRow({ model, node, parentId, siblings, active, onSelect }: { model: CardEditorLiveModel; node: CreativeCompositionNode; parentId: string | null; siblings?: CreativeCompositionNode[]; active: boolean; onSelect: (parentId: string | null, nodeId: string, additive: boolean) => void }) {
  const storedContent = node.props.contentComposition as { nodes?: CreativeCompositionNode[] } | undefined;
  const nested = node.primitive === "button" ? buttonContent(node.props, node.id).nodes : Array.isArray(storedContent?.nodes) ? storedContent.nodes : [];
  const containerChildren = (siblings || [])
    .filter((candidate) => String(candidate.props.containerId || "") === node.id)
    .sort((left, right) => right.zIndex - left.zIndex);
  const label = node.name || String(node.props.elementKind || node.primitive);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(label);
  const commitName = () => {
    const next = draftName.trim();
    if (next && next !== label) model.patchCompositionNode(node.id, { name: next }, `Renamed ${label}`);
    else setDraftName(label);
    setRenaming(false);
  };
  const enterContentAndSelectChild = (childId: string, childLabel: string, selectChildOnCanvas: boolean) => {
    onSelect(parentId, selectChildOnCanvas ? childId : node.id, false);
    model.patchCompositionNode(node.id, {
      props: {
        ...node.props,
        contentEditing: true,
        selectionMode: "content",
        activeButtonContentNodeId: childId,
        activeComponentContentNodeId: childId,
      },
    }, `Selected ${childLabel}`);
  };
  return <div className="ml-2" data-layer-object-id={node.id} data-component-kind={String(node.props.componentKind || "") || undefined}>
    <div className={cn("flex items-center gap-0.5 rounded", active ? "bg-[#b8ff2c]/10 text-[#b8ff2c]" : "text-white/65 hover:bg-white/5")}>
      {renaming ? <input autoFocus aria-label={`Rename ${label}`} value={draftName} className="h-8 min-w-0 flex-1 rounded border border-[#b8ff2c]/50 bg-black/30 px-2 text-[10px]" onChange={(event) => setDraftName(event.target.value)} onBlur={commitName} onKeyDown={(event) => { if (event.key === "Enter") commitName(); if (event.key === "Escape") { setDraftName(label); setRenaming(false); } }} /> : <button type="button" aria-pressed={active} className="min-h-9 min-w-0 flex-1 truncate px-2 text-left text-[10px]" onDoubleClick={() => setRenaming(true)} onClick={(event) => onSelect(parentId, node.id, event.shiftKey || event.metaKey || event.ctrlKey)}>{label}</button>}
      <LayerIconButton label={node.visible === false ? `Show ${label}` : `Hide ${label}`} onClick={() => model.patchCompositionNode(node.id, { visible: node.visible === false }, `${node.visible === false ? "Showed" : "Hid"} ${label}`)}>{node.visible === false ? <EyeOff /> : <Eye />}</LayerIconButton>
      <LayerIconButton label={node.locked ? `Unlock ${label}` : `Lock ${label}`} onClick={() => model.patchCompositionNode(node.id, { locked: !node.locked }, `${node.locked ? "Unlocked" : "Locked"} ${label}`)}>{node.locked ? <Lock /> : <Unlock />}</LayerIconButton>
      <LayerIconButton label={`Rename ${label}`} onClick={() => setRenaming(true)}><Pencil /></LayerIconButton>
      <LayerIconButton label={`Move ${label} forward`} onClick={() => model.patchCompositionNode(node.id, { zIndex: node.zIndex + 1 }, `Moved ${label} forward`)}><ArrowUp /></LayerIconButton>
      <LayerIconButton label={`Move ${label} backward`} onClick={() => model.patchCompositionNode(node.id, { zIndex: Math.max(0, node.zIndex - 1) }, `Moved ${label} backward`)}><ArrowDown /></LayerIconButton>
      <LayerIconButton label={`Duplicate ${label}`} onClick={() => model.duplicateElements?.([node.id], parentId)}><Copy /></LayerIconButton>
      <LayerIconButton label={`Delete ${label}`} onClick={() => model.deleteElements?.([node.id], parentId)} danger><Trash2 /></LayerIconButton>
    </div>
    {containerChildren.length ? <div className="mb-1 ml-3 border-l border-white/10 pl-1" data-container-children={node.id}>{containerChildren.map((child) => {
      const childLabel = child.name || String(child.props.presetChildRole || child.props.elementKind || child.primitive);
      const childActive = !model.selected && Boolean(model.selectedCompositionNodeIds?.includes(child.id));
      return <button key={child.id} type="button" aria-pressed={childActive} className={cn("block min-h-7 w-full truncate rounded px-2 text-left text-[9px]", childActive ? "bg-[#b8ff2c]/10 text-[#b8ff2c]" : "text-white/45 hover:bg-white/5 hover:text-white/75")} data-nested-object-id={child.id} onClick={() => enterContentAndSelectChild(child.id, childLabel, true)}>↳ {childLabel}</button>;
    })}</div> : null}
    {nested.length ? <div className="mb-1 ml-3 border-l border-white/10 pl-1" data-nested-composition={node.id}>{nested.map((child) => <button key={child.id} type="button" className="block min-h-7 w-full truncate rounded px-2 text-left text-[9px] text-white/45 hover:bg-white/5 hover:text-white/75" data-nested-object-id={child.id} onClick={() => enterContentAndSelectChild(child.id, String(child.name || child.props.buttonContentRole || child.props.componentContentRole || child.primitive), false)}>↳ {child.name || String(child.props.buttonContentRole || child.props.componentContentRole || child.primitive)}</button>)}</div> : null}
  </div>;
}

function LayerIconButton({ label, onClick, danger = false, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return <button type="button" aria-label={label} title={label} className={cn("grid h-8 w-7 shrink-0 place-items-center rounded hover:bg-white/10 [&_svg]:h-3 [&_svg]:w-3", danger && "text-red-300")} onClick={(event) => { event.stopPropagation(); onClick(); }}>{children}</button>;
}

function LayerButton({ label, active, onClick }: { label: string; active: boolean; onClick: (additive: boolean) => void }) { return <button type="button" aria-pressed={active} className={cn("min-h-9 w-full truncate rounded px-2 text-left text-[10px]", active ? "bg-[#b8ff2c]/10 text-[#b8ff2c]" : "text-white/65 hover:bg-white/5")} onClick={(event) => onClick(event.shiftKey || event.metaKey || event.ctrlKey)}>{String(label)}</button>; }
