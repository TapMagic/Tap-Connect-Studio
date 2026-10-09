"use client";

import { useEffect } from "react";

export function ExperiencePreviewMarker({ experienceId }: { experienceId: string }) {
  useEffect(() => {
    void fetch(`/api/experiences/${experienceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark-preview" }),
    });
  }, [experienceId]);
  return null;
}
