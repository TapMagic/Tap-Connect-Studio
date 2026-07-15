"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  ClipboardCopy,
  Download,
  ExternalLink,
  Printer,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDevicePath } from "@/lib/utils/app";

export type QrDeviceOption = {
  id: string;
  nickname: string | null;
  deviceCode: string;
};

interface QrPanelProps {
  campaignId?: string;
  campaignTitle?: string;
  /** Preselected device code */
  deviceCode?: string;
  /** Optional device list for assignment */
  devices?: QrDeviceOption[];
  /** Allow pasting a custom absolute or path URL */
  allowCustomUrl?: boolean;
  title?: string;
  filenamePrefix?: string;
}

export function QrPanel({
  campaignTitle = "tap-connect",
  deviceCode: initialDeviceCode,
  devices = [],
  allowCustomUrl = true,
  title = "Campaign QR Code",
  filenamePrefix,
}: QrPanelProps) {
  const [deviceCode, setDeviceCode] = useState(initialDeviceCode || devices[0]?.deviceCode || "");
  const [customUrl, setCustomUrl] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [tapUrl, setTapUrl] = useState("");
  const [size, setSize] = useState(400);
  const [previewPx, setPreviewPx] = useState(192);
  const [dark, setDark] = useState("#0b0f19");
  const [light, setLight] = useState("#ffffff");
  const [transparentBg, setTransparentBg] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<"url" | "image" | null>(null);

  useEffect(() => {
    if (initialDeviceCode) setDeviceCode(initialDeviceCode);
  }, [initialDeviceCode]);

  const resolveUrl = useCallback(() => {
    if (typeof window === "undefined") return "";
    if (useCustom && customUrl.trim()) {
      const raw = customUrl.trim();
      if (/^https?:\/\//i.test(raw)) return raw;
      if (raw.startsWith("/")) return `${window.location.origin}${raw}`;
      return `https://${raw}`;
    }
    if (!deviceCode) return "";
    return `${window.location.origin}${getDevicePath(deviceCode)}`;
  }, [useCustom, customUrl, deviceCode]);

  useEffect(() => {
    const absolute = resolveUrl();
    setTapUrl(absolute);
    if (!absolute) {
      setQrDataUrl(null);
      return;
    }
    const params = new URLSearchParams({
      url: absolute,
      size: String(size),
      dark,
      transparent: transparentBg ? "1" : "0",
    });
    if (!transparentBg) params.set("light", light);

    let cancelled = false;
    fetch(`/api/qr?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.dataUrl) setQrDataUrl(data.dataUrl);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [resolveUrl, size, dark, light, transparentBg]);

  function flash(msg: string) {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), 2200);
  }

  function downloadQr() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    const base = (filenamePrefix || campaignTitle).replace(/\s+/g, "-").toLowerCase();
    a.download = `tapconnect-${base}-qr.png`;
    a.click();
    flash("Downloaded PNG");
  }

  async function copyUrl() {
    if (!tapUrl) return;
    try {
      await navigator.clipboard.writeText(tapUrl);
      setCopied("url");
      flash("URL copied");
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      flash("Could not copy URL");
    }
  }

  async function copyImage() {
    if (!qrDataUrl) return;
    try {
      const res = await fetch(qrDataUrl);
      const blob = await res.blob();
      if (typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        setCopied("image");
        flash("QR image copied");
        window.setTimeout(() => setCopied(null), 1600);
        return;
      }
      await navigator.clipboard.writeText(qrDataUrl);
      flash("QR data URL copied");
    } catch {
      flash("Copy image failed — try Download instead");
    }
  }

  function printQr() {
    if (!qrDataUrl || !tapUrl) return;
    const w = window.open("", "_blank", "noopener,noreferrer,width=520,height=720");
    if (!w) {
      flash("Allow pop-ups to print");
      return;
    }
    const bg = transparentBg ? "transparent" : light;
    w.document.write(`<!doctype html><html><head><title>Print QR</title>
      <style>
        body{font-family:system-ui,sans-serif;margin:0;padding:24px;text-align:center;background:#fff;color:#111}
        img{width:${Math.min(previewPx * 1.5, 360)}px;height:auto;background:${bg}}
        p{font-size:12px;word-break:break-all;margin-top:16px}
      </style></head><body>
      <img src="${qrDataUrl}" alt="QR" />
      <p>${tapUrl}</p>
      <script>window.onload=()=>{window.print();}</script>
      </body></html>`);
    w.document.close();
  }

  const hasTarget = Boolean(tapUrl);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <QrCode className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Assign a device, paste a custom URL, then download, copy, or print a scalable QR — with or
        without background.
      </p>

      {devices.length > 0 ? (
        <div className="space-y-1">
          <Label className="text-xs">Device / NFC-QR slot</Label>
          <select
            className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
            value={deviceCode}
            disabled={useCustom}
            onChange={(e) => {
              setDeviceCode(e.target.value);
              setUseCustom(false);
            }}
          >
            <option value="">Select device…</option>
            {devices.map((d) => (
              <option key={d.id} value={d.deviceCode}>
                {d.nickname || d.deviceCode}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {allowCustomUrl ? (
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={useCustom}
              onChange={(e) => setUseCustom(e.target.checked)}
            />
            Use custom URL
          </label>
          {useCustom ? (
            <Input
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://… or /t/your-code"
              className="font-mono text-xs"
            />
          ) : null}
        </div>
      ) : null}

      {hasTarget ? (
        <>
          <div>
            <Label className="text-xs">Public tap URL</Label>
            <div className="flex gap-2">
              <Input value={tapUrl} readOnly className="font-mono text-xs" />
              <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => void copyUrl()}>
                {copied === "url" ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
              </Button>
              <a
                href={tapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm hover:bg-accent"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">QR module color</Label>
              <Input
                type="color"
                value={dark}
                onChange={(e) => setDark(e.target.value)}
                className="h-9 w-full cursor-pointer p-1"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Background color</Label>
              <Input
                type="color"
                value={light}
                disabled={transparentBg}
                onChange={(e) => setLight(e.target.value)}
                className="h-9 w-full cursor-pointer p-1 disabled:opacity-40"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Export size {size}px</Label>
              <input
                type="range"
                min={200}
                max={1000}
                step={40}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Preview scale {previewPx}px</Label>
              <input
                type="range"
                min={120}
                max={320}
                step={8}
                value={previewPx}
                onChange={(e) => setPreviewPx(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={transparentBg}
                onChange={(e) => setTransparentBg(e.target.checked)}
              />
              Transparent background (no fill)
            </label>
          </div>

          {qrDataUrl ? (
            <div
              className="flex flex-col items-center gap-3 rounded-lg border border-border/60 p-6"
              style={{
                background: transparentBg
                  ? "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 16px 16px"
                  : light,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="QR Code"
                style={{ width: previewPx, height: previewPx }}
                className="object-contain"
              />
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" size="sm" onClick={downloadQr}>
                  <Download className="mr-1.5 h-4 w-4" />
                  Download PNG
                </Button>
                <Button variant="outline" size="sm" onClick={() => void copyImage()}>
                  {copied === "image" ? (
                    <Check className="mr-1.5 h-4 w-4" />
                  ) : (
                    <ClipboardCopy className="mr-1.5 h-4 w-4" />
                  )}
                  Copy image
                </Button>
                <Button variant="outline" size="sm" onClick={printQr}>
                  <Printer className="mr-1.5 h-4 w-4" />
                  Print
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Generating QR code…</p>
          )}
        </>
      ) : (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Select a device or enter a custom URL to generate a public QR.
        </p>
      )}

      {message ? <p className="text-xs text-primary">{message}</p> : null}
    </div>
  );
}
