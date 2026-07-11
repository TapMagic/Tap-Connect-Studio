"use client";

import { useEffect, useState } from "react";
import { Download, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface QrPanelProps {
  campaignId: string;
  campaignTitle: string;
  deviceCode?: string;
}

export function QrPanel({ campaignId, campaignTitle, deviceCode }: QrPanelProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [tapUrl, setTapUrl] = useState("");

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    const url = deviceCode ? `${base}/t/${deviceCode}` : `${base}/dashboard/campaigns/${campaignId}`;
    setTapUrl(url);

    fetch(`/api/qr?url=${encodeURIComponent(url)}`)
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
          ? "QR points to your device tap URL. Print for signs, table tents, and shelf tags."
          : "Assign this campaign to a device to get the final tap URL QR code."}
      </p>

      <div>
        <Label className="text-xs">Tap URL</Label>
        <Input value={tapUrl} readOnly className="font-mono text-xs" />
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
    </div>
  );
}
