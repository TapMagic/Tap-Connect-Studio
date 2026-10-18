"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, Eye, EyeOff, QrCode, RefreshCw, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type PublicCredentialSummary = {
  id: string;
  accessUrl: string;
  isCurrent: boolean;
  tokenHint: string;
  credentialType: string;
  status: string;
  redemptionCount: number;
  redemptionLimit: number | null;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
};

type CredentialResponse = {
  destination?: { slug: string; accessActive: boolean };
  credentials?: PublicCredentialSummary[];
  error?: string;
};

export function PublicQrCredentialPanel({
  experienceId,
  experienceName,
  onChanged,
  className,
}: {
  experienceId: string;
  experienceName: string;
  onChanged?: () => void | Promise<void>;
  className?: string;
}) {
  const [credentials, setCredentials] = useState<PublicCredentialSummary[]>([]);
  const [destination, setDestination] = useState<CredentialResponse["destination"]>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrVisible, setQrVisible] = useState(false);
  const [previousBehavior, setPreviousBehavior] = useState<"keep" | "revoke">("keep");
  const [busy, setBusy] = useState<"load" | "generate" | "revoke" | null>("load");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => credentials.find((credential) => credential.id === selectedId)
      ?? credentials.find((credential) => credential.isCurrent)
      ?? credentials[0]
      ?? null,
    [credentials, selectedId],
  );
  const current = credentials.find((credential) => credential.isCurrent) ?? null;
  const remaining = credentials.filter((credential) => credential.id !== current?.id);

  const load = useCallback(async (preferredId?: string) => {
    setBusy("load");
    setError(null);
    setQrVisible(false);
    setQrDataUrl(null);
    const response = await fetch(`/api/experiences/${experienceId}/credentials`, { cache: "no-store" });
    const data = await response.json().catch(() => ({})) as CredentialResponse;
    if (!response.ok) {
      setCredentials([]);
      setDestination(undefined);
      setError(data.error || "Public QR status could not be loaded.");
      setBusy(null);
      return;
    }
    const next = data.credentials ?? [];
    setCredentials(next);
    setDestination(data.destination);
    const nextSelected = next.find((credential) => credential.id === preferredId)
      ?? next.find((credential) => credential.isCurrent)
      ?? next[0]
      ?? null;
    setSelectedId(nextSelected?.id ?? null);
    setBusy(null);
  }, [experienceId]);

  useEffect(() => {
    let active = true;
    fetch(`/api/experiences/${experienceId}/credentials`, { cache: "no-store" })
      .then(async (response) => ({ response, data: await response.json().catch(() => ({})) as CredentialResponse }))
      .then(({ response, data }) => {
        if (!active) return;
        if (!response.ok) {
          setError(data.error || "Public QR status could not be loaded.");
          setBusy(null);
          return;
        }
        const next = data.credentials ?? [];
        setCredentials(next);
        setDestination(data.destination);
        setSelectedId(next.find((credential) => credential.isCurrent)?.id ?? next[0]?.id ?? null);
        setQrVisible(false);
        setQrDataUrl(null);
        setBusy(null);
      })
      .catch(() => {
        if (!active) return;
        setError("Public QR status could not be loaded.");
        setBusy(null);
      });
    return () => { active = false; };
  }, [experienceId]);

  function selectCredential(credentialId: string) {
    setSelectedId(credentialId);
    setQrVisible(false);
    setQrDataUrl(null);
    setMessage(null);
  }

  async function renderQr(url: string) {
    return QRCode.toDataURL(url, { margin: 1, width: 480, errorCorrectionLevel: "M", color: { dark: "#070a10", light: "#ffffff" } });
  }

  async function showQr() {
    if (!selected) return;
    setError(null);
    try {
      setQrDataUrl(await renderQr(selected.accessUrl));
      setQrVisible(true);
    } catch {
      setError("The QR image could not be rendered.");
    }
  }

  async function downloadQr() {
    if (!selected) return;
    try {
      const dataUrl = qrDataUrl ?? await renderQr(selected.accessUrl);
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${experienceName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "experience"}-public-qr.png`;
      link.click();
      setMessage("Public QR downloaded. No credential was created or changed.");
    } catch {
      setError("The QR image could not be downloaded.");
    }
  }

  async function copyLink() {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(selected.accessUrl);
      setMessage("Public credential link copied. No credential was created or changed.");
    } catch {
      setError("The public credential link could not be copied.");
    }
  }

  async function generate() {
    setBusy("generate");
    setError(null);
    setMessage(null);
    const response = await fetch(`/api/experiences/${experienceId}/credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credentialType: "PERMANENT", previousBehavior }),
    });
    const data = await response.json().catch(() => ({})) as { credential?: { id: string }; error?: string };
    if (!response.ok || !data.credential) {
      setError(data.error || "Public QR credential could not be generated.");
      setBusy(null);
      return;
    }
    await load(data.credential.id);
    await onChanged?.();
    setMessage("Permanent credential generated. It remains governed by this Experience destination.");
  }

  async function revoke(credential: PublicCredentialSummary) {
    const warning = credential.isCurrent
      ? "Revoke the current public QR? Printed copies of this credential will stop working."
      : "Revoke this public QR credential? Printed copies of it will stop working.";
    if (!window.confirm(warning)) return;
    setBusy("revoke");
    setError(null);
    const response = await fetch(`/api/experiences/${experienceId}/credentials`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credentialId: credential.id }),
    });
    const data = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) {
      setError(data.error || "Public QR credential could not be revoked.");
      setBusy(null);
      return;
    }
    await load();
    await onChanged?.();
    setMessage("Credential revoked. The Experience and its stable destination were not changed.");
  }

  return <section className={cn("space-y-4 p-4", className)} data-testid="public-qr-credential-panel">
    <div className="flex items-start gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#b8ff2c]/10 text-[#d9ff8e]"><QrCode className="h-5 w-5" /></div>
      <div className="min-w-0"><p className="text-sm font-semibold text-white">Public QR</p><p className="text-[11px] leading-5 text-white/52">Permanent/published credential · separate from temporary Draft preview</p></div>
    </div>

    {busy === "load" ? <p className="rounded-xl border border-white/8 bg-white/[.03] px-3 py-4 text-xs text-white/48">Loading persisted credentials…</p> : null}
    {destination ? <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2 text-[10px] text-white/52"><span className="font-semibold text-white/72">Stable destination</span> · /everencore/{destination.slug}<span className={cn("ml-2", destination.accessActive ? "text-[#cfff70]" : "text-amber-200")}>Access {destination.accessActive ? "ON" : "OFF"}</span></div> : null}

    {current ? <div className="rounded-2xl border border-[#b8ff2c]/22 bg-[#b8ff2c]/[.045] p-3" data-testid="current-public-credential">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#d9ff8e]">Current Permanent QR</p><p className="mt-1 text-xs text-white/58">{current.credentialType.replaceAll("_", " ")} · …{current.tokenHint}</p></div><span className="rounded-full bg-[#b8ff2c]/12 px-2 py-1 text-[9px] font-semibold text-[#d9ff8e]">ACTIVE</span></div>
    </div> : credentials.length ? <p className="rounded-xl border border-amber-300/20 bg-amber-300/[.06] p-3 text-xs text-amber-100">No active public credential. History is retained below.</p> : busy !== "load" && !error ? <p className="rounded-xl border border-white/8 bg-white/[.03] p-3 text-xs text-white/48">No permanent QR has been generated for this Experience.</p> : null}

    {selected ? <div className="space-y-3 rounded-2xl border border-white/10 bg-black/25 p-3" data-testid="selected-public-credential">
      <div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-semibold text-white/78">{selected.isCurrent ? "Current credential" : `Credential …${selected.tokenHint}`}</p><span className={cn("text-[9px] font-semibold", selected.status === "ACTIVE" ? "text-[#cfff70]" : "text-white/35")}>{selected.status}</span></div>
      {qrVisible && qrDataUrl ? <div className="rounded-xl bg-white p-3"><Image src={qrDataUrl} alt={`Public QR for ${experienceName}`} width={480} height={480} unoptimized className="mx-auto h-auto w-full max-w-60" data-testid="public-qr-image" /></div> : null}
      <p className="break-all rounded-lg bg-white/[.04] px-2 py-2 text-[9px] leading-4 text-white/42" data-testid="public-credential-link">{selected.accessUrl}</p>
      <div className="grid grid-cols-3 gap-2"><button type="button" onClick={() => { if (qrVisible) setQrVisible(false); else void showQr(); }} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg border border-white/12 text-[10px] font-semibold text-white/72">{qrVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{qrVisible ? "Hide QR" : "Show QR"}</button><button type="button" onClick={() => void downloadQr()} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg border border-white/12 text-[10px] font-semibold text-white/72"><Download className="h-3.5 w-3.5" />Download</button><button type="button" onClick={() => void copyLink()} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg border border-white/12 text-[10px] font-semibold text-white/72"><Copy className="h-3.5 w-3.5" />Copy link</button></div>
      <p className="flex items-center gap-1.5 text-[9px] text-white/38"><ShieldCheck className="h-3 w-3" />Viewing, copying, and downloading are read-only.</p>
    </div> : null}

    {remaining.length ? <div><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-white/42">Other credentials / history</p><div className="mt-2 max-h-40 space-y-1 overflow-y-auto">{remaining.map((credential) => <div key={credential.id} className="flex items-center gap-2 rounded-lg border border-white/7 bg-white/[.025] px-2 py-2"><button type="button" onClick={() => selectCredential(credential.id)} className="min-w-0 flex-1 text-left"><span className="block truncate text-[10px] text-white/62">{credential.credentialType.replaceAll("_", " ")} · …{credential.tokenHint}</span><span className="text-[9px] text-white/32">{new Date(credential.createdAt).toLocaleDateString()} · {credential.status}</span></button>{credential.status === "ACTIVE" ? <button type="button" disabled={busy !== null} onClick={() => void revoke(credential)} className="rounded-md border border-rose-300/20 px-2 py-1 text-[9px] font-semibold text-rose-200">Revoke</button> : null}</div>)}</div></div> : null}

    <details className="rounded-xl border border-white/8 bg-white/[.02] p-3" data-testid="public-qr-management"><summary className="cursor-pointer text-xs font-semibold text-white/62">Rotate / credential management</summary><fieldset className="mt-3 space-y-2"><legend className="text-[10px] text-white/42">When generating a new permanent QR</legend><label className="flex gap-2 text-xs text-white/58"><input type="radio" checked={previousBehavior === "keep"} onChange={() => setPreviousBehavior("keep")} />Keep previous QR valid</label><label className="flex gap-2 text-xs text-white/58"><input type="radio" checked={previousBehavior === "revoke"} onChange={() => setPreviousBehavior("revoke")} />Revoke previous active QR credentials</label></fieldset><div className="mt-3 flex gap-2"><button type="button" disabled={busy !== null} onClick={() => void generate()} className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#b8ff2c] px-3 text-xs font-semibold text-[#07100a]"><RefreshCw className="h-3.5 w-3.5" />{busy === "generate" ? "Generating…" : credentials.length ? "Generate New QR / Rotate" : "Generate Permanent QR"}</button>{selected?.status === "ACTIVE" ? <button type="button" disabled={busy !== null} onClick={() => void revoke(selected)} className="min-h-10 rounded-lg border border-rose-300/25 px-3 text-xs font-semibold text-rose-200">Revoke selected</button> : null}</div></details>

    {message ? <p className="rounded-lg border border-[#b8ff2c]/18 bg-[#b8ff2c]/[.06] px-3 py-2 text-xs text-[#d9ff8e]" role="status">{message}</p> : null}
    {error ? <p className="rounded-lg border border-rose-300/18 bg-rose-300/[.06] px-3 py-2 text-xs text-rose-100" role="alert">{error}</p> : null}
  </section>;
}
