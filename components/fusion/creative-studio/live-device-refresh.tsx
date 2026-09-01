"use client";

import { RefreshCw } from "lucide-react";

export function LiveDeviceRefresh() {
  return <button type="button" onClick={() => window.location.reload()} className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-lg border border-amber-100/25 bg-black/15 px-3 text-xs font-semibold text-amber-50" data-testid="preview-phone-refresh"><RefreshCw className="h-3.5 w-3.5" />Refresh current draft</button>;
}
