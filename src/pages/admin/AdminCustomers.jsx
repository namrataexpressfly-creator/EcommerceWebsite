import { useEffect, useState } from "react";
import client from "../../api/client";
import { useAdminAuth } from "../../context/AdminAuthContext";
import AdminLayout from "./AdminLayout";
import Pagination from "../../components/Pagination";
import usePagination from "../../hooks/usePagination";

function timeAgo(dateStr) {
  if (!dateStr) return "Never";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function AdminCustomers() {
  const { authHeader } = useAdminAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    client
      .get("/admin/customers", { headers: authHeader() })
      .then(({ data }) => setCustomers(data.customers || []))
      .catch((err) => setError(err.message || "Failed to load customers."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = customers.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.store_slug?.toLowerCase().includes(q)
    );
  });
  const { pageItems, pagerProps } = usePagination(filtered, { resetKey: search });

  return (
    <AdminLayout onRefresh={load}>
        <div className="adm-main-header">
          <div>
            <h1>Customers</h1>
            <p className="adm-main-sub">
              {loading
                ? "Loading…"
                : `${customers.length} customer${customers.length === 1 ? "" : "s"} across every store (showing most recently active first, up to 500).`}
            </p>
          </div>
        </div>

        <input
          className="adm-input"
          style={{ maxWidth: 320, marginBottom: 18 }}
          placeholder="Search by name, phone, email, or store…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {error && <div className="adm-error adm-error-banner">{error}</div>}

        {loading ? (
          <div className="adm-empty">Loading customers…</div>
        ) : filtered.length === 0 ? (
          <div className="adm-empty">
            <p>No customers match that search.</p>
          </div>
        ) : (
          <>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Contact</th>
                    <th>Store (which panel they log into)</th>
                    <th>Last login</th>
                    <th>Joined</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((c) => (
                    <tr key={c._id}>
                      <td>
                        <div className="adm-identity-name">{c.name}</div>
                      </td>
                      <td>
                        <div>{c.phone}</div>
                        {c.email && <div className="muted">{c.email}</div>}
                      </td>
                      <td>
                        <span className="adm-chip">{c.store_slug}</span>
                        {c.seller_name && <div className="muted small" style={{ marginTop: 3 }}>{c.seller_name}</div>}
                      </td>
                      <td>{timeAgo(c.last_login_at)}</td>
                      <td>{new Date(c.created_at).toLocaleDateString()}</td>
                      <td>
                        <span className={`adm-status ${c.is_active ? "adm-status-approved" : "adm-status-rejected"}`}>
                          {c.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination variant="admin" {...pagerProps} />
          </>
        )}
    </AdminLayout>
  );
}
