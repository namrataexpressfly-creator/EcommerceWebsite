import { useEffect, useState } from "react";
import client from "../../api/client";
import { Loading, ErrorBox, EmptyState } from "../../components/Ui";
import Pagination from "../../components/Pagination";
import usePagination from "../../hooks/usePagination";
import { formatDate } from "../../utils/format";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    client
      .get("/seller/customers")
      .then(({ data }) => setCustomers(data))
      .catch((err) => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return c.name?.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q);
  });
  const { pageItems, pagerProps } = usePagination(filtered, { resetKey: search });

  return (
    <div>
      <div className="page-header">
        <h1>Customers</h1>
      </div>
      <p className="muted">Customers who have logged in to your storefront. Guests who only checked out without logging in aren't listed here — their orders are still under Orders.</p>

      <ErrorBox message={error} />

      <input
        className="input"
        style={{ maxWidth: 320, marginBottom: 16 }}
        placeholder="Search by name, phone, or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <EmptyState>{customers.length === 0 ? "No customers yet." : "No customers match that search."}</EmptyState>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Orders</th>
                <th>Last login</th>
                <th>Joined</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((c) => (
                <tr key={c._id}>
                  <td>{c.name}</td>
                  <td>{c.phone}</td>
                  <td>{c.email || "—"}</td>
                  <td>{c.order_count}</td>
                  <td>{c.last_login_at ? formatDate(c.last_login_at) : "Never logged in"}</td>
                  <td>{new Date(c.created_at).toLocaleDateString()}</td>
                  <td>{c.is_active ? "Active" : "Inactive"}</td>
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
