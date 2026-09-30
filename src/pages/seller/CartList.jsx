import { useEffect, useState } from "react";
import client, { resolveMediaUrl } from "../../api/client";
import { Loading, ErrorBox, EmptyState } from "../../components/Ui";
import Pagination from "../../components/Pagination";
import usePagination from "../../hooks/usePagination";
import { formatMoney } from "../../utils/format";

// Includes seconds, unlike the shared formatDate() — cart adds can happen
// seconds apart, and the minute-only format made separate adds look identical.
function formatAddedAt(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function CartList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    client
      .get("/seller/customers/carts")
      .then(({ data }) => setItems(data.items || []))
      .catch((err) => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = items.filter((i) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      i.customer_name?.toLowerCase().includes(q) ||
      i.customer_phone?.includes(q) ||
      i.product_name?.toLowerCase().includes(q)
    );
  });
  const { pageItems, pagerProps } = usePagination(filtered, { resetKey: search });

  const cartValue = filtered.reduce((sum, i) => sum + (i.unit_price || 0) * i.quantity, 0);

  return (
    <div>
      <div className="page-header">
        <h1>Cart activity</h1>
        <button className="btn btn-ghost" onClick={load}>
          Refresh
        </button>
      </div>
      <p className="muted">
        What customers currently have in their cart on your storefront, but haven't checked out yet.
      </p>

      <ErrorBox message={error} />

      {!loading && items.length > 0 && (
        <div className="muted small" style={{ marginBottom: 12 }}>
          {filtered.length} item{filtered.length === 1 ? "" : "s"} in active carts · combined value{" "}
          {formatMoney(cartValue)}
        </div>
      )}

      <input
        className="input"
        style={{ maxWidth: 320, marginBottom: 16 }}
        placeholder="Search by customer or product…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <EmptyState>
          {items.length === 0 ? "No products in any customer's cart right now." : "No cart items match that search."}
        </EmptyState>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Product</th>
                <th>Variant</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((i, idx) => (
                <tr key={`${i.customer_id}-${i.product_id}-${idx}`}>
                  <td>
                    <div>{i.customer_name}</div>
                    <div className="muted small">{i.customer_phone}</div>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {i.product_image && (
                        <img
                          src={resolveMediaUrl(i.product_image)}
                          alt=""
                          style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover" }}
                        />
                      )}
                      {i.product_name}
                    </div>
                  </td>
                  <td>{i.variant_label || "—"}</td>
                  <td>{i.quantity}</td>
                  <td>{formatMoney(i.unit_price)}</td>
                  <td>{formatAddedAt(i.added_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination {...pagerProps} />
        </>
      )}
    </div>
  );
}
