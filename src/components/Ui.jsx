export function Loading({ label = "Loading…" }) {
  return <div className="loading-box">{label}</div>;
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
