"use client";

import { useEffect } from "react";

export function PreviewViewedMarker() {
  useEffect(() => {
    void fetch("/api/card/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "previewed" }),
    });
  }, []);
  return null;
}
