import "../styles/pagination.css";
import { PAGE_SIZE_OPTIONS } from "../hooks/usePagination";


function buildPageList(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const keep = new Set([1, totalPages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((n) => keep.add(n));
  if (page >= totalPages - 2) [totalPages - 3, totalPages - 2, totalPages - 1].forEach((n) => keep.add(n));

  const sorted = [...keep].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((n, i) => {
    if (i > 0) {
      const gap = n - sorted[i - 1];
      if (gap === 2) out.push(n - 1); 
      else if (gap > 2) out.push("…");
    }
    out.push(n);
  });
  return out;
}


export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  variant = "default", 
}) {
  if (!total || total <= Math.min(...pageSizeOptions)) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = buildPageList(page, totalPages);

  return (
    <div className={`tbl-pager${variant === "admin" ? " tbl-pager--adm" : ""}`}>
      <div className="tbl-pager-size">
        <label>
          Rows per page
          <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <span className="tbl-pager-range">
          {from}–{to} of {total}
        </span>
      </div>

      <nav className="tbl-pager-nav" aria-label="Pagination">
        <button type="button" className="tbl-pager-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          ← Prev
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="tbl-pager-gap">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={`tbl-pager-btn tbl-pager-num${p === page ? " is-active" : ""}`}
              aria-current={p === page ? "page" : undefined}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          className="tbl-pager-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next →
        </button>
      </nav>
    </div>
  );
}
