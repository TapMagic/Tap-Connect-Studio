"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDevicePath } from "@/lib/utils/app";

interface QrPanelProps {
  campaignId: string;
  campaignTitle: string;
  deviceCode?: string;
}

export function QrPanel({ campaignId, campaignTitle, deviceCode }: QrPanelProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [tapUrl, setTapUrl] = useState("");

  useEffect(() => {
    // Public QR must point at /t/{code}, never a gated dashboard URL.
    if (!deviceCode) {
      setTapUrl("");
      setQrDataUrl(null);
      return;
    }
    const absolute = `${window.location.origin}${getDevicePath(deviceCode)}`;
    setTapUrl(absolute);

    fetch(`/api/qr?url=${encodeURIComponent(absolute)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.dataUrl) setQrDataUrl(data.dataUrl);
      })
      .catch(() => null);
  }, [campaignId, deviceCode]);

  function downloadQr() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `tapconnect-${campaignTitle.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <QrCode className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Campaign QR Code</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        {deviceCode
          ? "QR points to your public device tap URL. Print for signs, table tents, and shelf tags."
          : "Select a device under Content → Publish to device, then reopen this tab for a public QR."}
      </p>

      {deviceCode ? (
        <>
          <div>
            <Label className="text-xs">Tap URL</Label>
            <div className="flex gap-2">
              <Input value={tapUrl} readOnly className="font-mono text-xs" />
              <a
                href={getDevicePath(deviceCode)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm hover:bg-accent"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </a>
            </div>
          </div>

          {qrDataUrl ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-border/60 bg-white p-6">
              <img src={qrDataUrl} alt="QR Code" className="h-48 w-48" />
              <Button variant="outline" onClick={downloadQr}>
                <Download className="mr-2 h-4 w-4" />
                Download PNG
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Generating QR code...</p>
          )}
        </>
      ) : (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          No device selected — public tap URLs only work on `/t/...` device links.
        </p>
      )}
    </div>
  );
}
