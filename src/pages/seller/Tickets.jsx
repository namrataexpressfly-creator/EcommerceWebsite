import { useEffect, useState } from "react";
import client from "../../api/client";
import Modal from "../../components/Modal";
import { InfoIcon } from "../../components/Icons";
import { Loading, ErrorBox, EmptyState, StatusBadge } from "../../components/Ui";
import { formatDate, formatMoney } from "../../utils/format";
import { useToast } from "../../context/ToastContext";
import Pagination from "../../components/Pagination";
import usePagination from "../../hooks/usePagination";
import useTableSearch from "../../hooks/useTableSearch";
import TableSearch from "../../components/TableSearch";

const STATUS_OPTIONS = ["open", "in_progress", "resolved", "closed"];

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeTicket, setActiveTicket] = useState(null); 
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const toast = useToast();
  const { query, setQuery, filtered } = useTableSearch(tickets);
  const { pageItems, pagerProps } = usePagination(filtered, { resetKey: `${statusFilter}|${query}` });

  const load = () => {
    setLoading(true);
    client
      .get("/tickets/seller", { params: statusFilter ? { status: statusFilter } : {} })
      .then(({ data }) => {
        setTickets(data);
        
        setActiveTicket((prev) => (prev ? data.find((t) => t._id === prev._id) || prev : prev));
      })
      .catch((err) => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [statusFilter]);

  const updateStatus = async (id, status) => {
    try {
      const { data } = await client.put(`/tickets/seller/${id}/status`, { status });
      toast.success("Ticket updated.");
      setTickets((prev) => prev.map((t) => (t._id === id ? data : t)));
      setActiveTicket((prev) => (prev && prev._id === id ? data : prev));
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setError(msg);
      toast.error(msg || "Could not update ticket.");
    }
  };

  const sendReply = async () => {
    if (!activeTicket || !replyText.trim()) return;
    setSending(true);
    try {
      const { data } = await client.post(`/tickets/seller/${activeTicket._id}/reply`, {
        text: replyText.trim(),
      });
      setTickets((prev) => prev.map((t) => (t._id === activeTicket._id ? data : t)));
      setActiveTicket(data);
      setReplyText("");
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      toast.error(msg || "Could not send reply.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Support tickets</h1>
        <select className="input" style={{ maxWidth: 200 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <p className="muted small">Issues shoppers have reported from the Track Order page. Click the info icon to see and reply to the full conversation.</p>

      <ErrorBox message={error} />

      {loading ? (
        <Loading />
      ) : tickets.length === 0 ? (
        <EmptyState>No support tickets{statusFilter ? ` with status "${statusFilter}"` : ""} yet.</EmptyState>
      ) : (
        <>
          <TableSearch query={query} onChange={setQuery} shown={filtered.length} total={tickets.length} placeholder="Search by customer, reason or status…" />
          <table className="data-table">
            <thead>
              <tr>
                <th>Reported</th>
                <th>Customer</th>
                <th>Reason</th>
                <th>Order</th>
                <th>Status</th>
                <th>Conversation</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((t) => (
                <tr key={t._id}>
                  <td className="muted small">{formatDate(t.created_at)}</td>
                  <td>{t.customer_name || "Guest"}</td>
                  <td>{t.reason}</td>
                  <td className="muted small">
                    {t.order_id?.tracking_token || "—"}
                    {t.order_id?.total_amount ? ` · ${formatMoney(t.order_id.total_amount)}` : ""}
                  </td>
                  <td>
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="table-actions">
                    <button
                      type="button"
                      className="btn btn-icon"
                      title="View conversation"
                      onClick={() => {
                        setActiveTicket(t);
                        setReplyText("");
                      }}
                    >
                      <InfoIcon />
                      {t.messages?.length > 1 && (
                        <span className="muted small" style={{ marginLeft: 4 }}>
                          {t.messages.length}
                        </span>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination {...pagerProps} />
        </>
      )}

      {activeTicket && (
        <Modal title={`Conversation · ${activeTicket.reason}`} onClose={() => setActiveTicket(null)} width={560}>
          <p className="muted small">
            <strong>Order:</strong> {activeTicket.order_id?.tracking_token || "—"} ·{" "}
            {activeTicket.order_id?.status || "—"} ·{" "}
            {activeTicket.order_id?.total_amount ? formatMoney(activeTicket.order_id.total_amount) : "—"}
          </p>
          {activeTicket.order_id?.shipping_address && (
            <p className="muted small">
              <strong>Shipping to:</strong> {activeTicket.order_id.shipping_address?.name},{" "}
              {activeTicket.order_id.shipping_address?.phone}
              <br />
              {activeTicket.order_id.shipping_address?.line1} {activeTicket.order_id.shipping_address?.line2},{" "}
              {activeTicket.order_id.shipping_address?.city} {activeTicket.order_id.shipping_address?.pincode}
            </p>
          )}

          <div className="ticket-messages">
            {(activeTicket.messages || []).map((m, idx) => (
              <div key={idx} className={`ticket-message ticket-message-${m.sender}`}>
                <div className="muted small">
                  <strong>{m.sender === "customer" ? activeTicket.customer_name || "Customer" : "You"}</strong> ·{" "}
                  {formatDate(m.at)}
                </div>
                <div>{m.text}</div>
              </div>
            ))}
          </div>

          <div className="form-row" style={{ marginTop: 10 }}>
            <input
              className="input"
              placeholder="Write a reply…"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendReply()}
            />
            <button className="btn btn-primary" disabled={sending} onClick={sendReply}>
              {sending ? "Sending…" : "Send"}
            </button>
          </div>

          <div className="form-row" style={{ marginTop: 12 }}>
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                className={`btn ${activeTicket.status === s ? "btn-primary" : "btn-ghost"}`}
                onClick={() => updateStatus(activeTicket._id, s)}
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
