import { useEffect, useState } from "react";
import client, { resolveMediaUrl } from "../../api/client";
import { useAdminAuth } from "../../context/AdminAuthContext";
import AdminLayout from "./AdminLayout";
import Pagination from "../../components/Pagination";
import usePagination from "../../hooks/usePagination";

export default function AdminKyc() {
  const { authHeader } = useAdminAuth();
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actioningId, setActioningId] = useState(null);
  const [rejectReasons, setRejectReasons] = useState({});
  const [rejectOpenFor, setRejectOpenFor] = useState(null);
  const { pageItems, pagerProps } = usePagination(sellers);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await client.get("/admin/kyc/pending", { headers: authHeader() });
      setSellers(data.sellers || []);
    } catch (err) {
      setError(err.message || "Failed to load pending KYC submissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

  }, []);

  const approve = async (sellerId) => {
    setActioningId(sellerId);
    setError("");
    try {
      await client.post(`/admin/kyc/${sellerId}/approve`, {}, { headers: authHeader() });
      setSellers((list) => list.filter((s) => s._id !== sellerId));
    } catch (err) {
      setError(err.message || "Failed to approve.");
    } finally {
      setActioningId(null);
    }
  };

  const reject = async (sellerId) => {
    const reason = (rejectReasons[sellerId] || "").trim();
    if (!reason) {
      setError("Please enter a rejection reason before rejecting.");
      return;
    }
    setActioningId(sellerId);
    setError("");
    try {
      await client.post(`/admin/kyc/${sellerId}/reject`, { reason }, { headers: authHeader() });
      setSellers((list) => list.filter((s) => s._id !== sellerId));
    } catch (err) {
      setError(err.message || "Failed to reject.");
    } finally {
      setActioningId(null);
    }
  };

  const docList = (kyc) =>
    [
      ["PAN document", kyc?.pan_doc_url],
      ["Aadhaar (front)", kyc?.aadhaar_front_url],
      ["Aadhaar (back)", kyc?.aadhaar_back_url],
      ["Bank proof", kyc?.bank_proof_url],
    ].filter(([, url]) => url);

  return (
    <AdminLayout onRefresh={load}>
        <div className="adm-main-header">
          <div>
            <h1>KYC verification queue</h1>
            <p className="adm-main-sub">
              {loading
                ? "Loading…"
                : sellers.length === 0
                ? "Nothing waiting on review."
                : `${sellers.length} seller${sellers.length === 1 ? "" : "s"} awaiting a decision.`}
            </p>
          </div>
        </div>

        {error && <div className="adm-error adm-error-banner">{error}</div>}

        {loading ? (
          <div className="adm-empty">Loading submissions…</div>
        ) : sellers.length === 0 ? (
          <div className="adm-empty">
            <div className="adm-empty-mark">✓</div>
            <p>No pending KYC submissions right now.</p>
          </div>
        ) : (
          <>
            <div className="adm-queue">
              {pageItems.map((seller) => (
                <article key={seller._id} className="adm-card">
                  <div className="adm-card-top">
                    <div className="adm-identity">
                      <div className="adm-identity-name">{seller.kyc?.full_name || seller.name}</div>
                      <div className="adm-identity-meta">
                        <span className="adm-chip">{seller.store_slug}</span>
                        <span>{seller.email}</span>
                        <span>{seller.phone}</span>
                      </div>
                    </div>
                    <span className="adm-status adm-status-pending">Pending review</span>
                  </div>

                  <div className="adm-divider" />

                  <div className="adm-detail-grid">
                    <div className="adm-detail">
                      <span className="adm-detail-label">PAN number</span>
                      <span className="adm-mono">{seller.kyc?.pan_number || "—"}</span>
                    </div>
                    <div className="adm-detail">
                      <span className="adm-detail-label">Aadhaar number</span>
                      <span className="adm-mono">{seller.kyc?.aadhaar_number || "—"}</span>
                    </div>
                    <div className="adm-detail">
                      <span className="adm-detail-label">Submitted</span>
                      <span>
                        {seller.kyc?.submitted_at
                          ? new Date(seller.kyc.submitted_at).toLocaleString()
                          : "—"}
                      </span>
                    </div>
                  </div>

                  <div className="adm-docs">
                    {docList(seller.kyc).map(([label, url]) => (
                      <a
                        key={label}
                        className="adm-doc-chip"
                        href={resolveMediaUrl(url)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {label}
                      </a>
                    ))}
                  </div>

                  <div className="adm-actions">
                    <button
                      className="adm-btn adm-btn-approve"
                      disabled={actioningId === seller._id}
                      onClick={() => approve(seller._id)}
                    >
                      Approve
                    </button>

                    {rejectOpenFor === seller._id ? (
                      <div className="adm-reject-row">
                        <input
                          className="adm-input adm-input-inline"
                          type="text"
                          placeholder="Reason for rejection"
                          autoFocus
                          value={rejectReasons[seller._id] || ""}
                          onChange={(e) =>
                            setRejectReasons((r) => ({ ...r, [seller._id]: e.target.value }))
                          }
                        />
                        <button
                          className="adm-btn adm-btn-reject"
                          disabled={actioningId === seller._id}
                          onClick={() => reject(seller._id)}
                        >
                          Confirm reject
                        </button>
                        <button
                          className="adm-btn adm-btn-ghost"
                          onClick={() => setRejectOpenFor(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="adm-btn adm-btn-reject-outline"
                        onClick={() => setRejectOpenFor(seller._id)}
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
            <Pagination variant="admin" {...pagerProps} />
          </>
        )}
    </AdminLayout>
  );
}
