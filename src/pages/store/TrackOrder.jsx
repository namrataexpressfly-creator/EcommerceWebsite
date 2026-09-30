import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import client, { createTicket, getTicketReasons } from "../../api/client";
import { Loading, ErrorBox, SuccessBox, StatusBadge } from "../../components/Ui";
import { formatMoney, formatDate } from "../../utils/format";
import { useStoreSlug } from "../../context/StoreSlugContext";

export default function TrackOrder() {
  const { token } = useParams();
  const { slug, basePath } = useStoreSlug();
  const navigate = useNavigate();

  const [inputToken, setInputToken] = useState(token || "");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [returnReason, setReturnReason] = useState("");
  const [returnMessage, setReturnMessage] = useState("");

  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueReasons, setIssueReasons] = useState([]);
  const [issueReason, setIssueReason] = useState("");
  const [issueText, setIssueText] = useState("");
  const [issueSubmitting, setIssueSubmitting] = useState(false);
  const [issueResult, setIssueResult] = useState("");
  const [issueError, setIssueError] = useState("");

  const lookup = async (t, { silent = false } = {}) => {
    if (!t) return;
    if (!silent) {
      setLoading(true);
      setError("");
      setOrder(null);
    }
    try {
      const { data } = await client.get(`/track/${t}`);
      setOrder(data);
    } catch (err) {
      if (!silent) setError(err.response?.data?.error || "We couldn't load this order right now. Please try again.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (token) lookup(token);
  }, [token]);

  useEffect(() => {
    getTicketReasons()
      .then((data) => setIssueReasons(data))
      .catch(() => setIssueReasons([]));
  }, []);

  const submitIssue = async (e) => {
    e.preventDefault();
    setIssueError("");
    setIssueResult("");

    if (!issueReason) {
      setIssueError("Please select a reason.");
      return;
    }
    if (issueReason === "Other" && !issueText.trim()) {
      setIssueError("Please describe the issue.");
      return;
    }

    setIssueSubmitting(true);
    try {
      await createTicket(slug, {
        tracking_token: token,
        reason: issueReason,
        message: issueText.trim(),
      });
      setIssueResult(
        "Thanks — we've logged your issue and the seller will get back to you. You can follow the conversation under Help & Support."
      );
      setIssueReason("");
      setIssueText("");
      setShowIssueForm(false);
      lookup(token, { silent: true });
    } catch (err) {
      setIssueError(err.response?.data?.error || "We couldn't submit your issue. Please try again.");
    } finally {
      setIssueSubmitting(false);
    }
  };

  const submitReturn = async () => {
    setReturnMessage("");
    try {
      await client.post("/returns/request", {
        tracking_token: token,
        reason: returnReason,
        items: order.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      });
      setReturnMessage("Return request submitted. The seller will review it shortly.");
    } catch (err) {
      setReturnMessage(err.response?.data?.error || "We couldn't submit your return request. Please try again.");
    }
  };

  return (
    <div className="track-page">
      <h1>Track your order</h1>
      <div className="form-row">
        <input
          className="input"
          placeholder="Enter your tracking token"
          value={inputToken}
          onChange={(e) => setInputToken(e.target.value)}
        />
        <button
          className="btn btn-primary"
          onClick={() => navigate(`${basePath}/track/${inputToken.trim()}`)}
        >
          Track
        </button>
      </div>

      {loading && <Loading label="Looking up order…" />}
      <ErrorBox message={error} />

      {order && (
        <div className="track-result">
          <div className="track-header">
            <div>
              <StatusBadge status={order.status} />
              <span className="muted small"> · placed {formatDate(order.created_at)}</span>
            </div>
            <div className="muted small">Payment: {order.payment_status}</div>
          </div>

          <div className="status-timeline">
            {(order.status_history || []).map((s, idx) => (
              <div className="timeline-step" key={idx}>
                <div className="timeline-dot" />
                <div>
                  <div className="timeline-status">{s.status.replace(/_/g, " ")}</div>
                  <div className="muted small">{formatDate(s.at)}</div>
                  {s.note && <div className="muted small">{s.note}</div>}
                </div>
              </div>
            ))}
          </div>

          <section className="checkout-section">
            <h2>Items</h2>
            {order.items.map((i, idx) => (
              <div className="cart-summary-line" key={idx}>
                <span>
                  {i.name} × {i.quantity}
                </span>
                <span>{formatMoney(i.price * i.quantity)}</span>
              </div>
            ))}
            <hr />
            <div className="cart-summary-line">
              <span>Subtotal</span>
              <span>{formatMoney(order.subtotal)}</span>
            </div>
            {order.item_discount > 0 && (
              <div className="cart-summary-line">
                <span>Discount</span>
                <span>-{formatMoney(order.item_discount)}</span>
              </div>
            )}
            {order.discount > 0 && (
              <div className="cart-summary-line">
                <span>Coupon discount</span>
                <span>-{formatMoney(order.discount)}</span>
              </div>
            )}
            {order.tax_amount > 0 && (
              <div className="cart-summary-line">
                <span>Tax</span>
                <span>{formatMoney(order.tax_amount)}</span>
              </div>
            )}
            <div className="cart-summary-line">
              <span>Shipping</span>
              <span>{order.shipping === 0 ? "Free" : formatMoney(order.shipping)}</span>
            </div>
            <div className="cart-summary-line total">
              <span>Total</span>
              <strong>{formatMoney(order.total_amount)}</strong>
            </div>
          </section>

          <section className="checkout-section">
            <h2>Shipping address</h2>
            <p className="muted">
              {order.shipping_address?.name}, {order.shipping_address?.phone}
              <br />
              {order.shipping_address?.line1} {order.shipping_address?.line2}
              <br />
              {order.shipping_address?.city}, {order.shipping_address?.state} -{" "}
              {order.shipping_address?.pincode}
            </p>
          </section>

          {order.status === "delivered" && (
            <section className="checkout-section">
              <h2>Request a return</h2>
              <textarea
                className="input"
                placeholder="Reason for return"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
              />
              <button className="btn btn-ghost" onClick={submitReturn}>
                Submit return request
              </button>
              <SuccessBox message={returnMessage} />
            </section>
          )}

          {(order.tickets || []).length > 0 && (
            <section className="checkout-section">
              <h2>Issues you've reported</h2>
              {order.tickets.map((t) => (
                <div className="ticket-card" key={t._id || t.created_at} style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                  <div className="cart-summary-line">
                    <strong>{t.reason}</strong>
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="muted small">Raised on {formatDate(t.created_at)}</div>
                  {(t.messages || []).length > 0 ? (
                    (t.messages || []).map((m, i) => (
                      <div key={i} className="small" style={{ marginTop: 6, overflowWrap: "anywhere" }}>
                        <strong>{m.sender === "seller" ? "Seller" : "You"}:</strong> {m.text}
                      </div>
                    ))
                  ) : (
                    t.message && (
                      <div className="small" style={{ marginTop: 6, overflowWrap: "anywhere" }}>
                        {t.message}
                      </div>
                    )
                  )}
                </div>
              ))}
              <p className="muted small" style={{ marginTop: 8 }}>
                You can reply to the seller under <a href={`${basePath}/my-conversations`}>My conversations</a>.
              </p>
            </section>
          )}

          <section className="checkout-section">
            <h2>Having an issue?</h2>
            {!showIssueForm ? (
              <button className="btn btn-ghost" onClick={() => setShowIssueForm(true)}>
                Report a problem with this order
              </button>
            ) : (
              <form className="issue-form" onSubmit={submitIssue}>
                <p className="muted small">
                  Order #{order._id?.slice(-6) || token} · {order.items?.length || 0} item
                  {order.items?.length === 1 ? "" : "s"} · {formatMoney(order.total_amount)}
                </p>

                <label className="muted small" htmlFor="issue-reason">
                  What's wrong?
                </label>
                <select
                  id="issue-reason"
                  className="input"
                  value={issueReason}
                  onChange={(e) => setIssueReason(e.target.value)}
                >
                  <option value="">Select a reason…</option>
                  {issueReasons.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                <textarea
                  className="input"
                  placeholder={
                    issueReason === "Other"
                      ? "Please describe the issue"
                      : "Any extra details (optional)"
                  }
                  value={issueText}
                  onChange={(e) => setIssueText(e.target.value)}
                />

                <div className="form-row">
                  <button className="btn btn-primary" type="submit" disabled={issueSubmitting}>
                    {issueSubmitting ? "Submitting…" : "Submit issue"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setShowIssueForm(false);
                      setIssueError("");
                    }}
                  >
                    Cancel
                  </button>
                </div>

                {issueError && <ErrorBox message={issueError} />}
                {issueResult && <SuccessBox message={issueResult} />}
              </form>
            )}
          </section>

        </div>
      )}
    </div>
  );
}