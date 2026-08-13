"use client";

import { useEffect, useState } from "react";

export function LanPreviewReachability({ url }: { url: string }) {
  const [status, setStatus] = useState<"checking" | "reachable" | "unreachable">(
    "checking"
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5_000);

    void fetch(url, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(() => setStatus("reachable"))
      .catch(() => setStatus("unreachable"))
      .finally(() => window.clearTimeout(timeout));

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [url]);

  const reachable = status === "reachable";

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        reachable
          ? "border-lime-300/30 bg-lime-300/10 text-lime-100"
          : status === "unreachable"
            ? "border-red-300/30 bg-red-400/10 text-red-100"
            : "border-white/15 bg-white/5 text-white/70"
      }`}
      data-testid="lan-preview-reachability"
      data-status={status}
      role="status"
    >
      <strong className="block">
        {status === "checking"
          ? "Checking the LAN endpoint…"
          : reachable
            ? "LAN server reachable from this Mac"
            : "LAN endpoint could not be reached"}
      </strong>
      <span className="mt-1 block text-xs opacity-75">
        {reachable
          ? "Scan with an iPhone on the same Wi-Fi to complete physical phone verification."
          : "Confirm both devices use the same Wi-Fi, allow incoming connections in macOS, and disable VPN or client isolation."}
      </span>
    </div>
  );
}
