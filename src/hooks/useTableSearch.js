import { useMemo, useState } from "react";

const SKIP_KEYS = /(^_id$|_id$|^__v$|url|image|password|hash|token)/i;

function collect(value, out, depth = 0, key = "") {
  if (value == null || depth > 3) return;
  if (key === "is_active" && typeof value === "boolean") {
    out.push(value ? "active yes" : "inactive suspended no");
    return;
  }
  if (typeof value === "string" || typeof value === "number") {
    out.push(String(value));
  } else if (Array.isArray(value)) {
    value.forEach((v) => collect(v, out, depth + 1, key));
  } else if (typeof value === "object") {
    Object.entries(value).forEach(([k, v]) => {
      if (!SKIP_KEYS.test(k)) collect(v, out, depth + 1, k);
    });
  }
}

export default function useTableSearch(items) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const list = items || [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) => {
      const parts = [];
      collect(item, parts);
      return parts.join(" ").toLowerCase().includes(q);
    });
  }, [items, query]);

  return { query, setQuery, filtered };
}
