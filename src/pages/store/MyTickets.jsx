import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyTickets, replyToTicket } from "../../api/client";
import { useCustomerAuth } from "../../context/CustomerAuthContext";
import CustomerLoginModal from "../../components/CustomerLoginModal";
import { Loading, ErrorBox, EmptyState, StatusBadge } from "../../components/Ui";
import { formatDate, formatMoney } from "../../utils/format";
import { useStoreSlug } from "../../context/StoreSlugContext";

export default function MyTickets() {
  const { slug, basePath } = useStoreSlug();
  const { isLoggedIn, loading: authLoading } = useCustomerAuth();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const load = () => {
    if (!isLoggedIn) return;
    setLoading(true);
    getMyTickets(slug)
      .then((data) => setTickets(data))
      .catch((err) => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [isLoggedIn, slug]);

  const handleReply = async (ticketId) => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const updated = await replyToTicket(slug, ticketId, replyText.trim());
      setTickets((prev) => prev.map((t) => (t._id === ticketId ? updated : t)));
      setReplyText("");
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSending(false);
    }
  };

  if (authLoading) return <Loading />;

  if (!isLoggedIn) {
    return (
      <div className="store-page">
        <div className="page-header">
          <h1>My conversations</h1>
        </div>
        <EmptyState>
          <p>Log in to see every issue and conversation you've had with the seller, all in one place.</p>
          <button className="btn btn-primary" onClick={() => setShowLogin(true)}>
            Log in
          </button>
        </EmptyState>
        {showLogin && <CustomerLoginModal onClose={() => setShowLogin(false)} onSuccess={() => setShowLogin(false)} />}
      </div>
    );
  }

  return (
    <div className="store-page">
      <div className="page-header">
        <h1>My conversations</h1>
      </div>
      <p className="muted">
        Every issue you've reported and product review conversation with the seller, in one place.
      </p>

      <ErrorBox message={error} />

      {loading ? (
        <Loading />
      ) : tickets.length === 0 ? (
        <EmptyState>
          No conversations yet. Report an issue from{" "}
          <Link className="link" to={`${basePath}/track`}>
            Track Order
          </Link>{" "}
          and it'll show up here.
        </EmptyState>
      ) : (
        <div className="ticket-thread-list">
          {tickets.map((t) => (
            <div className="panel form-panel" key={t._id} style={{ marginBottom: 16 }}>
              <div className="page-header" style={{ marginBottom: 8 }}>
                <div>
                  <strong>{t.reason}</strong>
                  <div className="muted small">
                    Order {t.order_id?.tracking_token || "—"} · reported {formatDate(t.created_at)}
                    {t.order_id?.total_amount ? ` · ${formatMoney(t.order_id.total_amount)}` : ""}
                  </div>
                </div>
                <StatusBadge status={t.status} />
              </div>

              <button
                className="btn btn-ghost"
                onClick={() => setOpenId(openId === t._id ? null : t._id)}
              >
                {openId === t._id ? "Hide conversation" : "View conversation"}
              </button>

              {openId === t._id && (
                <div style={{ marginTop: 12 }}>
                  <div className="ticket-messages">
                    {(t.messages || []).map((m, idx) => (
                      <div
                        key={idx}
                        className={`ticket-message ticket-message-${m.sender}`}
                      >
                        <div className="muted small">
                          <strong>{m.sender === "customer" ? "You" : "Seller"}</strong> ·{" "}
                          {formatDate(m.at)}
                        </div>
                        <div>{m.text}</div>
                      </div>
                    ))}
                  </div>

                  {t.status !== "closed" && (
                    <div className="form-row" style={{ marginTop: 10 }}>
                      <input
                        className="input"
                        placeholder="Write a reply…"
                        value={openId === t._id ? replyText : ""}
                        onChange={(e) => setReplyText(e.target.value)}
                      />
                      <button
                        className="btn btn-primary"
                        disabled={sending}
                        onClick={() => handleReply(t._id)}
                      >
                        {sending ? "Sending…" : "Send"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
