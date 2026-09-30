import { useEffect, useState } from "react";
import client from "../../api/client";
import { useAdminAuth } from "../../context/AdminAuthContext";
import AdminLayout from "./AdminLayout";
import Pagination from "../../components/Pagination";
import usePagination from "../../hooks/usePagination";

const KYC_LABEL = {
  not_submitted: "Not submitted",
  pending: "Pending review",
  approved: "Verified",
  rejected: "Rejected",
};

export default function AdminSellers() {
  const { authHeader } = useAdminAuth();
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const { pageItems, pagerProps } = usePagination(sellers);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await client.get("/admin/sellers", { headers: authHeader() });
      setSellers(data.sellers || []);
    } catch (err) {
      setError(err.message || "Failed to load sellers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

  }, []);

  const openDetail = async (id) => {
    setSelectedId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const { data } = await client.get(`/admin/sellers/${id}`, { headers: authHeader() });
      setDetail(data);
    } catch (err) {
      setError(err.message || "Failed to load seller details.");
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleActive = async (seller) => {
    setSavingId(seller._id);
    try {
      const { data } = await client.put(
        `/admin/sellers/${seller._id}`,
        { is_active: !seller.is_active },
        { headers: authHeader() }
      );
      setSellers((list) => list.map((s) => (s._id === seller._id ? { ...s, ...data.seller } : s)));
      if (detail?.seller?._id === seller._id) setDetail((d) => ({ ...d, seller: { ...d.seller, ...data.seller } }));
    } catch (err) {
      setError(err.message || "Failed to update seller.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AdminLayout onRefresh={load}>
        <div className="adm-main-header">
          <div>
            <h1>Sellers</h1>
            <p className="adm-main-sub">
              {loading ? "Loading…" : `${sellers.length} seller${sellers.length === 1 ? "" : "s"} on the platform.`}
            </p>
          </div>
        </div>

        {error && <div className="adm-error adm-error-banner">{error}</div>}

        {loading ? (
          <div className="adm-empty">Loading sellers…</div>
        ) : sellers.length === 0 ? (
          <div className="adm-empty">
            <p>No sellers yet.</p>
          </div>
        ) : (
          <>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Store</th>
                    <th>Contact</th>
                    <th>KYC</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((s) => (
                    <tr key={s._id}>
                      <td>
                        <div className="adm-identity-name">{s.store_name || s.store_slug}</div>
                        <span className="adm-chip">{s.store_slug}</span>
                      </td>
                      <td>
                        <div>{s.email}</div>
                        <div className="muted">{s.phone}</div>
                      </td>
                      <td>
                        <span className={`adm-status adm-status-${s.kyc?.status === "approved" ? "approved" : s.kyc?.status === "rejected" ? "rejected" : "pending"}`}>
                          {KYC_LABEL[s.kyc?.status] || "Not submitted"}
                        </span>
                      </td>
                      <td>
                        <span className={`adm-status ${s.is_active ? "adm-status-approved" : "adm-status-rejected"}`}>
                          {s.is_active ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td className="adm-table-actions">
                        <button className="adm-btn adm-btn-ghost" onClick={() => openDetail(s._id)}>
                          View
                        </button>
                        <button
                          className={`adm-btn ${s.is_active ? "adm-btn-reject-outline" : "adm-btn-approve"}`}
                          disabled={savingId === s._id}
                          onClick={() => toggleActive(s)}
                        >
                          {s.is_active ? "Suspend" : "Reactivate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination variant="admin" {...pagerProps} />
          </>
        )}

      {selectedId && (
        <div className="adm-drawer-overlay" onClick={() => setSelectedId(null)}>
          <div className="adm-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="adm-drawer-header">
              <h2>Seller details</h2>
              <button className="adm-btn adm-btn-ghost" onClick={() => setSelectedId(null)}>
                Close
              </button>
            </div>

            {detailLoading || !detail ? (
              <p className="muted">Loading…</p>
            ) : (
              <div className="adm-drawer-body">
                <section>
                  <h3>Account</h3>
                  <dl className="adm-dl">
                    <dt>Name</dt>
                    <dd>{detail.seller.name}</dd>
                    <dt>Email</dt>
                    <dd>{detail.seller.email}</dd>
                    <dt>Phone</dt>
                    <dd>{detail.seller.phone}</dd>
                    <dt>Store slug</dt>
                    <dd>{detail.seller.store_slug}</dd>
                    <dt>Joined</dt>
                    <dd>{new Date(detail.seller.created_at).toLocaleDateString()}</dd>
                    <dt>Status</dt>
                    <dd>{detail.seller.is_active ? "Active" : "Suspended"}</dd>
                  </dl>
                </section>

                <section>
                  <h3>KYC</h3>
                  <dl className="adm-dl">
                    <dt>Status</dt>
                    <dd>{KYC_LABEL[detail.seller.kyc?.status] || "Not submitted"}</dd>
                    {detail.seller.kyc?.full_name && (
                      <>
                        <dt>Full name on file</dt>
                        <dd>{detail.seller.kyc.full_name}</dd>
                      </>
                    )}
                    {detail.seller.kyc?.rejection_reason && (
                      <>
                        <dt>Rejection reason</dt>
                        <dd>{detail.seller.kyc.rejection_reason}</dd>
                      </>
                    )}
                  </dl>
                </section>

                <section>
                  <h3>Payments</h3>
                  <dl className="adm-dl">
                    <dt>Razorpay linked account</dt>
                    <dd>{detail.seller.razorpay_account_status || "Not started"}</dd>
                    <dt>Online payments</dt>
                    <dd>{detail.storefront?.payment_settings?.online_enabled ? "Enabled" : "Disabled"}</dd>
                    <dt>COD</dt>
                    <dd>{detail.storefront?.payment_settings?.cod_enabled ? "Enabled" : "Disabled"}</dd>
                    <dt>Razorpay mode</dt>
                    <dd>
                      {detail.storefront?.payment_settings?.razorpay_mode === "own"
                        ? "Seller's own account"
                        : "Platform shared account"}
                    </dd>
                  </dl>
                </section>

                <section>
                  <h3>Store</h3>
                  <dl className="adm-dl">
                    <dt>Store name</dt>
                    <dd>{detail.storefront?.store_name || "—"}</dd>
                    <dt>Products</dt>
                    <dd>{detail.stats.product_count}</dd>
                    <dt>Orders</dt>
                    <dd>{detail.stats.order_count}</dd>
                  </dl>
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
