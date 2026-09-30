import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../../api/client";
import { useAdminAuth } from "../../context/AdminAuthContext";
import AdminLayout from "./AdminLayout";

const KYC_LABEL = { approved: "Approved", pending: "Pending", rejected: "Rejected", not_submitted: "Not submitted" };

export default function AdminDashboard() {
  const { admin, authHeader } = useAdminAuth();
  const [sellers, setSellers] = useState([]);
  const [pendingKyc, setPendingKyc] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const headers = { headers: authHeader() };
      const [s, k, c] = await Promise.all([
        client.get("/admin/sellers", headers),
        client.get("/admin/kyc/pending", headers),
        client.get("/admin/customers", headers),
      ]);
      setSellers(s.data.sellers || []);
      setPendingKyc(k.data.sellers || []);
      setCustomers(c.data.customers || []);
    } catch (err) {
      setError(err.message || "We couldn't load the dashboard. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

  }, []);

  const activeSellers = sellers.filter((s) => s.is_active !== false).length;
  const approved = sellers.filter((s) => s.kyc?.status === "approved").length;
  const stats = [
    { label: "Total sellers", value: sellers.length, hint: `${activeSellers} active`, tone: "blue" },
    { label: "Pending KYC", value: pendingKyc.length, hint: "Waiting for review", tone: "amber", to: "/admin/kyc" },
    { label: "KYC approved", value: approved, hint: "Verified sellers", tone: "green" },
    { label: "Customers", value: customers.length, hint: "Across every store", tone: "violet", to: "/admin/customers" },
  ];

  const recent = sellers.slice(0, 6);

  return (
    <AdminLayout onRefresh={load}>
      <div className="adm-main-header">
        <div>
          <p className="adm-eyebrow">Hello {admin?.username || "Admin"}, welcome back</p>
          <h1>Dashboard</h1>
          <p className="adm-main-sub">A quick look at sellers, verifications and customers on the platform.</p>
        </div>
        {pendingKyc.length > 0 && (
          <Link to="/admin/kyc" className="adm-btn adm-btn-primary adm-btn-lg">
            Review {pendingKyc.length} KYC {pendingKyc.length === 1 ? "request" : "requests"}
          </Link>
        )}
      </div>

      {error && <div className="adm-error adm-error-banner">{error}</div>}

      <div className="adm-stat-grid">
        {stats.map((s) => {
          const card = (
            <div className={`adm-stat adm-stat-${s.tone}`} key={s.label}>
              <div className="adm-stat-label">{s.label}</div>
              <div className="adm-stat-value">{loading ? "…" : s.value}</div>
              <div className="adm-stat-hint">{s.hint}</div>
            </div>
          );
          return s.to ? (
            <Link to={s.to} className="adm-stat-link" key={s.label}>
              {card}
            </Link>
          ) : (
            card
          );
        })}
      </div>

      <div className="adm-panel">
        <div className="adm-panel-head">
          <div>
            <h2>Recently joined sellers</h2>
            <p className="adm-main-sub" style={{ margin: 0 }}>Newest accounts first</p>
          </div>
          <Link to="/admin/sellers" className="adm-btn adm-btn-ghost">View all</Link>
        </div>

        {loading ? (
          <div className="adm-empty adm-empty-flat">Loading…</div>
        ) : recent.length === 0 ? (
          <div className="adm-empty adm-empty-flat">No sellers yet.</div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Seller</th>
                <th>Store</th>
                <th>KYC</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((s) => (
                <tr key={s._id}>
                  <td>
                    <div className="adm-identity-name">{s.name}</div>
                    <div className="muted small">{s.email}</div>
                  </td>
                  <td>{s.store_name || s.store_slug}</td>
                  <td>
                    <span
                      className={`adm-status ${
                        s.kyc?.status === "approved"
                          ? "adm-status-approved"
                          : s.kyc?.status === "rejected"
                          ? "adm-status-rejected"
                          : "adm-status-pending"
                      }`}
                    >
                      {KYC_LABEL[s.kyc?.status] || "Not submitted"}
                    </span>
                  </td>
                  <td>{new Date(s.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
