import { useEffect, useState } from "react";
import client from "../../api/client";
import { Loading, ErrorBox, EmptyState, StatusBadge } from "../../components/Ui";
import { formatDate } from "../../utils/format";
import Pagination from "../../components/Pagination";
import usePagination from "../../hooks/usePagination";
import useTableSearch from "../../hooks/useTableSearch";
import TableSearch from "../../components/TableSearch";

export default function Returns() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refundTarget, setRefundTarget] = useState(null);
  const [refundValue, setRefundValue] = useState("");
  const { query, setQuery, filtered } = useTableSearch(returns);
  const { pageItems, pagerProps } = usePagination(filtered, { resetKey: query });

  const load = () => {
    setLoading(true);
    client
      .get("/returns/seller")
      .then(({ data }) => setReturns(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const act = async (id, action, body) => {
    setError("");
    try {
      await client.put(`/returns/seller/${id}/${action}`, body || {});
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const openRefundModal = (r) => {
    setRefundTarget(r);
    setRefundValue("");
  };

  const submitRefund = async () => {
    await act(refundTarget._id, "refund", { refund_amount: Number(refundValue || 0) });
    setRefundTarget(null);
  };

  return (
    <div>
      <h1>Return requests</h1>
      <ErrorBox message={error} />
      {loading ? (
        <Loading />
      ) : returns.length === 0 ? (
        <EmptyState>No return requests yet.</EmptyState>
      ) : (
        <>
          <TableSearch query={query} onChange={setQuery} shown={filtered.length} total={returns.length} placeholder="Search return requests…" />
          <table className="data-table">
            <colgroup>
              <col style={{ width: "20%" }} />
              <col style={{ width: "30%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "30%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Requested</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((r) => (
                <tr key={r._id}>
                  <td className="muted small">{formatDate(r.created_at)}</td>
                  <td>{r.reason || "-"}</td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="table-actions">
                    <div style={{ minHeight: 36, display: "flex", alignItems: "center", gap: 8 }}>
                      {(r.status === "pending" || r.status === "requested") && (
                        <>
                          <button className="btn btn-ghost" onClick={() => act(r._id, "approve")}>
                            Approve
                          </button>
                          <button className="btn btn-ghost danger" onClick={() => act(r._id, "reject")}>
                            Reject
                          </button>
                        </>
                      )}
                      {r.status === "approved" && (
                        <button className="btn btn-ghost" onClick={() => openRefundModal(r)}>
                          Mark refunded
                        </button>
                      )}
                      {(r.status === "rejected" || r.status === "refunded") && (
                        <span className="muted small">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination {...pagerProps} />
        </>
      )}

      {refundTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
          onClick={() => setRefundTarget(null)}
        >
          <div
            className="checkout-section"
            style={{ background: "#fff", padding: 24, borderRadius: 8, width: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Refund amount</h2>
            <p className="muted small">Reason: {refundTarget.reason}</p>
            <input
              className="input"
              type="number" min="0"
              placeholder="Refund amount"
              value={refundValue}
              onChange={(e) => setRefundValue(e.target.value)}
              autoFocus
            />
            <div className="form-row" style={{ marginTop: 12 }}>
              <button className="btn btn-ghost" onClick={() => setRefundTarget(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={submitRefund}>
                Confirm refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}