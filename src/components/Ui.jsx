export function Loading({ label = "Loading…" }) {
  return (
    <div className="loading-box">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function Spinner({ size = 16 }) {
  return (
    <span
      className="spinner spinner-inline"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

export function ErrorBox({ message }) {
  if (!message) return null;
  return <div className="error-box">{message}</div>;
}

export function SuccessBox({ message }) {
  if (!message) return null;
  return <div className="success-box">{message}</div>;
}

export function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status?.replace(/_/g, " ")}</span>;
}

export function EmptyState({ children }) {
  return <div className="empty-state">{children}</div>;
}
