"use client";

import { useEffect } from "react";
import { PoweredByTapTheMagic } from "@/components/brand/powered-by";

export function StaffScanReady({ accessCode }: { accessCode: string }) {
  const code = accessCode.toUpperCase();

  useEffect(() => {
    document.cookie = `tc_scan=${encodeURIComponent(code)}; path=/; max-age=300; SameSite=Lax`;
  }, [code]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-primary/20 to-[#0b0f19] px-6 text-center">
      <img
        src="/tap-connect-logo.png"
        alt="Tap Connect"
        className="mb-6 h-24 w-auto object-contain"
      />
      <p className="text-sm uppercase tracking-[0.2em] text-white/50">Staff scan</p>
      <h1 className="mt-3 text-3xl font-bold text-white">Ready to tap</h1>
      <p className="mt-3 max-w-sm text-white/70">
        Hold your phone to the Tap Connect tag (or open its QR). The owner&apos;s dashboard will
        jump to that device.
      </p>
      <p className="mt-6 rounded-lg border border-white/10 bg-white/5 px-4 py-2 font-mono text-lg text-primary">
        {code}
      </p>
      <p className="mt-8 text-xs text-white/40">Session expires in about 5 minutes</p>
      <div className="mt-10">
        <PoweredByTapTheMagic />
      </div>
    </div>
  );
}
