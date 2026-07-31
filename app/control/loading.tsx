export default function ControlLoading() {
  return (
    <main className="control-loading" aria-busy="true">
      <span className="control-spinner" aria-hidden="true" />
      <p>Loading the platform snapshot…</p>
    </main>
  );
}

