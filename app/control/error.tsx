"use client";

export default function ControlError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="control-error-page">
      <p className="control-eyebrow">Control Room unavailable</p>
      <h1>The platform snapshot could not be loaded.</h1>
      <p>{error.message || "The data source returned an unexpected error."}</p>
      <button type="button" onClick={reset}>
        Retry
      </button>
    </main>
  );
}

