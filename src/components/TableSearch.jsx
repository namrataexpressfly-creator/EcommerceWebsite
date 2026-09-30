export default function TableSearch({ query, onChange, shown, total, placeholder = "Search…" }) {
  const searching = query.trim().length > 0;
  return (
    <div className="table-search" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "0 0 14px" }}>
      <input
        className="input"
        type="search"
        style={{ maxWidth: 320 }}
        placeholder={placeholder}
        value={query}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search this table"
      />
      {searching && (
        <span className="muted small">
          {shown === 0 ? "Nothing matches your search." : `${shown} of ${total} shown`}
        </span>
      )}
    </div>
  );
}
