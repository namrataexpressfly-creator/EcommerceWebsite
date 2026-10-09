export function AdminLoading({ label = "Loading…" }) {
  return (
    <div className="adm-loading">
      <span className="adm-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
