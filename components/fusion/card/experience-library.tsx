"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArrowUpRight, Clock3, Copy, Eye, FolderOpen, Plus, Power, QrCode, RotateCcw, Search, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export type ExperienceLibraryItem = {
  id: string;
  name: string;
  clientName: string;
  experienceType: string;
  experienceStatus: string;
  coverUrl: string | null;
  publicSlug: string | null;
  publicationActive: boolean;
  accessActive: boolean;
  qrStatus: string;
  qrType: string | null;
  draftRevision: number;
  publishedRevision: number | null;
  previewedAt: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  updatedAt: string;
};

const TYPE_LABELS: Record<string, string> = { DEMO: "Demo", CLIENT: "Client", TEMPLATE: "Template", SPECIAL: "Campaign / Special Experience" };
const STATUS_LABELS: Record<string, string> = { DRAFT: "Draft", PREVIEW_READY: "Preview Ready", PUBLISHED: "Published", ARCHIVED: "Archived" };

export function ExperienceLibrary({ initialItems }: { initialItems: ExperienceLibraryItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("ALL");
  const [status, setStatus] = useState("ACTIVE");
  const [dialog, setDialog] = useState<{ sourceId?: string; sourceName?: string } | null>(null);
  const [qrItem, setQrItem] = useState<ExperienceLibraryItem | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const visible = useMemo(() => items
    .filter((item) => status === "ARCHIVED" ? Boolean(item.archivedAt) : !item.archivedAt)
    .filter((item) => type === "ALL" || item.experienceType === type)
    .filter((item) => status === "ACTIVE" || status === "ARCHIVED" || item.experienceStatus === status)
    .filter((item) => !query.trim() || `${item.name} ${item.clientName}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)), [items, query, status, type]);
  const groups = useMemo(() => {
    const grouped = new Map<string, ExperienceLibraryItem[]>();
    for (const item of visible) grouped.set(item.clientName, [...(grouped.get(item.clientName) ?? []), item]);
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [visible]);
  const recent = items.filter((item) => !item.archivedAt).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 4);

  async function refresh() {
    const [active, archived] = await Promise.all([
      fetch("/api/experiences", { cache: "no-store" }),
      fetch("/api/experiences?archived=1", { cache: "no-store" }),
    ]);
    if (active.ok && archived.ok) {
      const a = await active.json() as { documents: ExperienceLibraryItem[] };
      const b = await archived.json() as { documents: ExperienceLibraryItem[] };
      setItems([...a.documents, ...b.documents]);
    }
    router.refresh();
  }

  async function command(item: ExperienceLibraryItem, action: "archive" | "restore" | "publish" | "unpublish" | "access-on" | "access-off") {
    setBusy(`${action}:${item.id}`);
    setMessage(null);
    const response = action === "publish" || action === "unpublish"
      ? await fetch(`/api/experiences/${item.id}/publication`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action === "publish" ? { action, expectedDraftRevision: item.draftRevision } : { action }) })
      : await fetch(`/api/experiences/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const data = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok) {
      setMessage(data.error || `${action} failed.`);
      return;
    }
    const labels: Record<string, string> = { publish: "published", unpublish: "unpublished; its destination and QR are preserved", archive: "archived", restore: "restored", "access-on": "public access is active", "access-off": "public access is dormant" };
    setMessage(`${item.name}: ${labels[action]}.`);
    await refresh();
  }

  return <div className="min-h-full px-4 py-5 text-white sm:px-6 lg:px-8" data-testid="experience-library">
    <header className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4">
      <div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#b8ff2c]">Workspace · Experience Library</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Your Experiences</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/52">Open, edit, preview, and intentionally publish independent client builds. Content changes save to production data without a code deployment.</p></div>
      <button type="button" onClick={() => setDialog({})} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#b8ff2c] px-4 text-sm font-semibold text-[#07100a] shadow-[0_0_30px_rgba(184,255,44,.16)]" data-testid="new-experience"><Plus className="h-4 w-4" />New Experience</button>
    </header>

    {message ? <div className="mx-auto mt-4 max-w-7xl rounded-xl border border-[#b8ff2c]/22 bg-[#b8ff2c]/8 px-4 py-3 text-sm text-[#dbff93]" role="status">{message}</div> : null}

    {recent.length ? <section className="mx-auto mt-6 max-w-7xl"><h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-white/46"><Clock3 className="h-4 w-4" />Recently edited</h2><div className="mt-3 flex gap-2 overflow-x-auto pb-2">{recent.map((item) => <Link key={item.id} href={`/dashboard/card/edit?experience=${encodeURIComponent(item.id)}&returnTo=${encodeURIComponent("/dashboard/experiences/library")}`} className="min-w-56 rounded-xl border border-white/9 bg-white/[.035] px-3 py-2.5 hover:border-[#b8ff2c]/35 hover:bg-[#b8ff2c]/[.04]"><strong className="block truncate text-sm">{item.name}</strong><span className="mt-1 block text-[10px] text-white/42">{item.clientName} · Draft v{item.draftRevision}</span></Link>)}</div></section> : null}

    <section className="mx-auto mt-5 max-w-7xl rounded-2xl border border-white/8 bg-[#0a101a]/80 p-3 shadow-2xl">
      <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_180px_180px]">
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3"><Search className="h-4 w-4 text-white/35" /><span className="sr-only">Search Experiences</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Experience or Client / Artist" className="w-full bg-transparent text-sm outline-none placeholder:text-white/28" /></label>
        <select aria-label="Filter by type" value={type} onChange={(event) => setType(event.target.value)} className="min-h-11 rounded-xl border border-white/10 bg-[#090f18] px-3 text-sm"><option value="ALL">All types</option>{Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-11 rounded-xl border border-white/10 bg-[#090f18] px-3 text-sm"><option value="ACTIVE">Active</option>{["DRAFT", "PREVIEW_READY", "PUBLISHED", "ARCHIVED"].map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}</select>
      </div>
    </section>

    <div className="mx-auto mt-7 max-w-7xl space-y-8">
      {groups.map(([client, clientItems]) => <section key={client} data-client-group={client}>
        <div className="mb-3 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#b8ff2c]/10 text-xs font-bold text-[#cfff70]">{client.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><div><p className="text-[9px] font-semibold uppercase tracking-[.15em] text-white/35">Client / Artist</p><h2 className="text-lg font-semibold">{client}</h2></div><span className="ml-auto text-xs text-white/32">{clientItems.length} Experience{clientItems.length === 1 ? "" : "s"}</span></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{clientItems.map((item) => <ExperienceCard key={item.id} item={item} busy={busy} onClone={() => setDialog({ sourceId: item.id, sourceName: item.name })} onQr={() => setQrItem(item)} onCommand={command} />)}</div>
      </section>)}
      {!groups.length ? <div className="rounded-2xl border border-dashed border-white/14 p-12 text-center"><FolderOpen className="mx-auto h-8 w-8 text-white/28" /><h2 className="mt-3 font-semibold">No Experiences match this view</h2><p className="mt-1 text-sm text-white/42">Clear the filters, restore an archived build, or create a new Experience.</p></div> : null}
    </div>

    {dialog ? <CreateExperienceDialog source={dialog} items={items.filter((item) => !item.archivedAt)} onClose={() => setDialog(null)} onCreated={(id) => { setDialog(null); router.push(`/dashboard/card/edit?experience=${encodeURIComponent(id)}&returnTo=${encodeURIComponent("/dashboard/experiences/library")}`); }} /> : null}
    {qrItem ? <QrCredentialDialog item={qrItem} onClose={() => setQrItem(null)} onChanged={refresh} /> : null}
  </div>;
}

function ExperienceCard({ item, busy, onClone, onQr, onCommand }: { item: ExperienceLibraryItem; busy: string | null; onClone: () => void; onQr: () => void; onCommand: (item: ExperienceLibraryItem, action: "archive" | "restore" | "publish" | "unpublish" | "access-on" | "access-off") => void }) {
  const archived = Boolean(item.archivedAt);
  const editHref = `/dashboard/card/edit?experience=${encodeURIComponent(item.id)}&returnTo=${encodeURIComponent("/dashboard/experiences/library")}`;
  const previewHref = `/dashboard/experiences/${item.id}/preview`;
  return <article className="overflow-hidden rounded-2xl border border-white/9 bg-[linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.018))] shadow-xl" data-testid={`experience-card-${item.id}`}>
    <div className="relative h-28 overflow-hidden bg-[radial-gradient(circle_at_20%_15%,rgba(184,255,44,.15),transparent_32%),linear-gradient(135deg,#111b29,#080b12)]">{item.coverUrl ? <Image src={item.coverUrl} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" unoptimized /> : <div className="absolute inset-0 grid place-items-center text-4xl font-black tracking-[-.08em] text-white/10">{item.clientName.toUpperCase().slice(0, 12)}</div>}<span className="absolute left-3 top-3 rounded-full border border-white/12 bg-black/55 px-2 py-1 text-[9px] font-semibold uppercase tracking-[.12em] backdrop-blur">{TYPE_LABELS[item.experienceType] || item.experienceType}</span><span className={cn("absolute right-3 top-3 rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[.12em]", item.experienceStatus === "PUBLISHED" ? "bg-[#b8ff2c] text-[#07100a]" : "bg-white/12 text-white/72")}>{STATUS_LABELS[item.experienceStatus] || item.experienceStatus}</span></div>
    <div className="p-4"><h3 className="truncate text-base font-semibold">{item.name}</h3><div className="mt-2 grid grid-cols-3 gap-1 text-[9px] font-semibold uppercase tracking-[.08em]"><StateChip label={`Draft v${item.draftRevision}`} active /><StateChip label={item.publicationActive ? `Published v${item.publishedRevision}` : "Published off"} active={item.publicationActive} /><StateChip label={item.accessActive ? "Access on" : "Access off"} active={item.accessActive} /></div><p className="mt-2 text-[10px] text-white/36">QR {item.qrStatus === "ACTIVE" ? `${item.qrType?.replace("_", " ") || "Permanent"} · Active` : "not generated"}</p><p className="mt-1 text-[10px] text-white/30">Published {item.publishedAt ? relativeTime(item.publishedAt) : "never"} · Edited {relativeTime(item.updatedAt)}</p>{item.publicSlug ? <a href={`/everencore/${item.publicSlug}`} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center gap-1 truncate text-[11px] text-[#b8ff2c] hover:underline">/everencore/{item.publicSlug}<ArrowUpRight className="h-3 w-3 shrink-0" /></a> : <p className="mt-3 text-[11px] text-white/30">Public destination is reserved on first Publish</p>}
      <div className="mt-4 grid grid-cols-2 gap-2"><Link href={editHref} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-white text-xs font-semibold text-[#07100a]"><FolderOpen className="h-3.5 w-3.5" />Open</Link><Link href={previewHref} target="_blank" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-white/14 text-xs font-semibold text-white/78"><Eye className="h-3.5 w-3.5" />Preview</Link><button type="button" disabled={Boolean(busy) || archived} onClick={() => onCommand(item, item.publicationActive ? "unpublish" : "publish")} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-[#b8ff2c]/35 bg-[#b8ff2c]/8 text-xs font-semibold text-[#d9ff8e]"><Upload className="h-3.5 w-3.5" />{busy?.endsWith(item.id) ? "Working…" : item.publicationActive ? "Unpublish" : "Publish"}</button><button type="button" disabled={Boolean(busy) || archived || !item.publicSlug} onClick={() => onCommand(item, item.accessActive ? "access-off" : "access-on")} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-white/12 text-xs text-white/68"><Power className="h-3.5 w-3.5" />Access {item.accessActive ? "Off" : "On"}</button><button type="button" disabled={archived || !item.publicSlug} onClick={onQr} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-white/12 text-xs text-white/68"><QrCode className="h-3.5 w-3.5" />QR</button><button type="button" disabled={Boolean(busy) || archived} onClick={onClone} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-white/12 text-xs text-white/68"><Copy className="h-3.5 w-3.5" />Clone</button></div>
      <button type="button" disabled={Boolean(busy)} onClick={() => onCommand(item, archived ? "restore" : "archive")} className="mt-2 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg text-[11px] text-white/42 hover:bg-white/5 hover:text-white/72">{archived ? <><RotateCcw className="h-3.5 w-3.5" />Restore archived Experience</> : <><Archive className="h-3.5 w-3.5" />Archive without deleting</>}</button>
    </div>
  </article>;
}

function StateChip({ label, active }: { label: string; active: boolean }) {
  return <span className={cn("truncate rounded-md px-1.5 py-1.5 text-center", active ? "bg-[#b8ff2c]/10 text-[#d8ff8a]" : "bg-white/6 text-white/36")}>{label}</span>;
}

type CredentialSummary = { id: string; tokenHint: string; credentialType: string; status: string; redemptionCount: number; redemptionLimit: number | null; createdAt: string };

function QrCredentialDialog({ item, onClose, onChanged }: { item: ExperienceLibraryItem; onClose: () => void; onChanged: () => Promise<void> }) {
  const [credentials, setCredentials] = useState<CredentialSummary[]>([]);
  const [previousBehavior, setPreviousBehavior] = useState<"keep" | "revoke">("keep");
  const [busy, setBusy] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessUrl, setAccessUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  async function load() {
    const response = await fetch(`/api/experiences/${item.id}/credentials`, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (response.ok) setCredentials(data.credentials || []); else setError(data.error || "QR status could not be loaded.");
  }
  useEffect(() => {
    let active = true;
    fetch(`/api/experiences/${item.id}/credentials`, { cache: "no-store" })
      .then(async (response) => ({ response, data: await response.json().catch(() => ({})) }))
      .then(({ response, data }) => {
        if (!active) return;
        if (response.ok) setCredentials(data.credentials || []); else setError(data.error || "QR status could not be loaded.");
      });
    return () => { active = false; };
  }, [item.id]);

  async function rotate() {
    setBusy(true); setError(null); setAccessUrl(null); setQrDataUrl(null);
    const response = await fetch(`/api/experiences/${item.id}/credentials`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credentialType: "PERMANENT", previousBehavior }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setBusy(false); setError(data.error || "QR could not be generated."); return; }
    const url = data.credential.accessUrl as string;
    setAccessUrl(url);
    const qrResponse = await fetch(`/api/qr?url=${encodeURIComponent(url)}&size=480&dark=%23070a10&light=%23ffffff`);
    const qr = await qrResponse.json().catch(() => ({}));
    setQrDataUrl(qr.dataUrl || null);
    await load(); await onChanged(); setBusy(false);
  }

  async function revoke(credentialId: string) {
    setRevokingId(credentialId); setError(null);
    const response = await fetch(`/api/experiences/${item.id}/credentials`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credentialId }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setRevokingId(null); setError(data.error || "QR credential could not be revoked."); return; }
    await load(); await onChanged(); setRevokingId(null);
  }

  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="qr-title"><section className="w-full max-w-lg rounded-3xl border border-white/12 bg-[#0a111b] p-5 shadow-2xl"><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#b8ff2c]">Permanent access credential</p><h2 id="qr-title" className="mt-1 text-xl font-semibold">{item.name} QR</h2><p className="mt-2 text-sm leading-6 text-white/48">The QR points to a credential, which resolves to the stable public destination. Publishing and access can change behind it without reprinting.</p>{credentials.length ? <div className="mt-4 max-h-32 space-y-1 overflow-auto rounded-xl bg-black/25 p-3 text-xs">{credentials.map((credential) => <div key={credential.id} className="flex items-center justify-between gap-3 text-white/58"><span>{credential.credentialType.replace("_", " ")} · …{credential.tokenHint}</span><span className={credential.status === "ACTIVE" ? "text-[#cfff70]" : "text-white/32"}>{credential.status}</span>{credential.status === "ACTIVE" ? <button type="button" disabled={Boolean(revokingId)} onClick={() => void revoke(credential.id)} className="rounded-md border border-red-300/25 px-2 py-1 text-[10px] font-semibold text-red-200">{revokingId === credential.id ? "Revoking…" : "Revoke"}</button> : null}</div>)}</div> : <p className="mt-4 rounded-xl bg-white/5 p-3 text-xs text-white/42">No QR credential generated yet.</p>}{accessUrl ? <div className="mt-4 rounded-2xl border border-[#b8ff2c]/25 bg-white p-4 text-[#07100a]">{qrDataUrl ? <Image src={qrDataUrl} alt={`QR for ${item.name}`} width={220} height={220} unoptimized className="mx-auto h-48 w-48" /> : null}<p className="mt-2 break-all text-center text-[10px]">{accessUrl}</p><p className="mt-2 text-center text-[10px] font-semibold">Save this QR now. The raw credential is not stored or shown again.</p></div> : null}<fieldset className="mt-4"><legend className="text-xs font-semibold text-white/70">When rotating</legend><label className="mt-2 flex gap-2 text-xs text-white/58"><input type="radio" checked={previousBehavior === "keep"} onChange={() => setPreviousBehavior("keep")} />Keep previous QR valid</label><label className="mt-2 flex gap-2 text-xs text-white/58"><input type="radio" checked={previousBehavior === "revoke"} onChange={() => setPreviousBehavior("revoke")} />Revoke all previous active QR credentials</label></fieldset>{error ? <p className="mt-3 rounded-lg bg-red-400/10 px-3 py-2 text-xs text-red-200">{error}</p> : null}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="min-h-10 rounded-xl px-4 text-sm text-white/58">Close</button><button type="button" disabled={busy} onClick={rotate} className="min-h-10 rounded-xl bg-[#b8ff2c] px-4 text-sm font-semibold text-[#07100a]">{busy ? "Generating…" : credentials.length ? "Generate new QR" : "Generate permanent QR"}</button></div></section></div>;
}

function CreateExperienceDialog({ source, items, onClose, onCreated }: { source: { sourceId?: string; sourceName?: string }; items: ExperienceLibraryItem[]; onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState(source.sourceName ? `${source.sourceName} Copy` : "");
  const [clientName, setClientName] = useState(source.sourceId ? items.find((item) => item.id === source.sourceId)?.clientName || "" : "");
  const [experienceType, setExperienceType] = useState(source.sourceId ? items.find((item) => item.id === source.sourceId)?.experienceType || "DEMO" : "DEMO");
  const [sourceId, setSourceId] = useState(source.sourceId || "main-card");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    const response = await fetch("/api/experiences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, clientName, experienceType, sourceId }) });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setError(data.error || "Experience could not be created."); return; }
    onCreated(data.document.id);
  }
  const field = "mt-1 min-h-11 w-full rounded-xl border border-white/12 bg-[#090f18] px-3 text-sm text-white outline-none focus:border-[#b8ff2c]/55";
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/72 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="new-experience-title"><form onSubmit={submit} className="w-full max-w-lg rounded-3xl border border-white/12 bg-[#0a111b] p-5 shadow-2xl"><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#b8ff2c]">Experience Library</p><h2 id="new-experience-title" className="mt-1 text-xl font-semibold">{source.sourceId ? "Clone Experience" : "New Experience"}</h2><p className="mt-1 text-sm text-white/44">A new durable draft and Experience identity will be created. The source and its public URL remain unchanged.</p><div className="mt-5 space-y-3"><label className="block text-xs text-white/64">Experience name<input autoFocus required value={name} onChange={(event) => setName(event.target.value)} className={field} /></label><label className="block text-xs text-white/64">Client / Artist<input required value={clientName} onChange={(event) => setClientName(event.target.value)} className={field} /></label><label className="block text-xs text-white/64">Type<select value={experienceType} onChange={(event) => setExperienceType(event.target.value)} className={field}>{Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="block text-xs text-white/64">Source / template<select value={sourceId} onChange={(event) => setSourceId(event.target.value)} className={field}><option value="main-card">Current main Card</option>{items.map((item) => <option key={item.id} value={item.id}>{item.clientName} · {item.name}</option>)}</select></label></div>{error ? <p className="mt-3 rounded-lg bg-red-400/10 px-3 py-2 text-xs text-red-200" role="alert">{error}</p> : null}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="min-h-10 rounded-xl px-4 text-sm text-white/58">Cancel</button><button disabled={busy} className="min-h-10 rounded-xl bg-[#b8ff2c] px-4 text-sm font-semibold text-[#07100a]">{busy ? "Creating…" : source.sourceId ? "Create independent clone" : "Create Experience"}</button></div></form></div>;
}

function relativeTime(value: string) {
  const seconds = Math.max(1, Math.round((Date.now() - Date.parse(value)) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
