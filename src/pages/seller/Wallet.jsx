import { useEffect, useState } from "react";
import client from "../../api/client";
import { Loading, ErrorBox, EmptyState, StatusBadge } from "../../components/Ui";
import { formatMoney, formatDate } from "../../utils/format";
import Pagination from "../../components/Pagination";
import usePagination from "../../hooks/usePagination";
import useTableSearch from "../../hooks/useTableSearch";
import TableSearch from "../../components/TableSearch";

const TYPE_LABELS = {
  split_created: "Order placed (online)",
  settled: "Settled to bank",
  failed: "Payout failed",
  cod_collected: "COD collected",
};

export default function Wallet() {
  const [wallet, setWallet] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  const [form, setForm] = useState({
    business_name: "",
    email: "",
    phone: "",
    beneficiary_name: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const txSearch = useTableSearch(wallet?.recent_transactions);
  const txPager = usePagination(txSearch.filtered, { resetKey: txSearch.query });

  const load = () => {
    setLoading(true);
    setError("");
    Promise.all([client.get("/seller/payments/wallet"), client.get("/seller/payments/status")])
      .then(([w, s]) => {
        setWallet(w.data);
        setStatus(s.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submitOnboarding = async (e) => {
    e.preventDefault();
    setFormError("");

    if (form.business_name.trim().length < 2) {
      setFormError("Please enter your business or your name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setFormError("Please enter a valid email address.");
      return;
    }
    if (form.phone.replace(/\D/g, "").length < 10) {
      setFormError("Please enter a valid 10-digit phone number.");
      return;
    }
    if (form.beneficiary_name.trim().length < 2) {
      setFormError("Please enter the beneficiary name as it appears on your bank account.");
      return;
    }

    setSubmitting(true);
    try {
      await client.post("/seller/payments/onboard", form);
      load();
    } catch (err) {
      setFormError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading label="Loading wallet…" />;

  return (
    <div>
      <h1>Wallet</h1>
      <ErrorBox message={error} />

      {status && !status.payout_ready && (
        <section className="panel">
          <h2>Connect payouts</h2>
          {status.razorpay_account_status === "not_started" ? (
            <>
              <p>
                Connect your bank account so online payments split automatically — your share
                goes straight to your bank, no manual transfers needed.
              </p>
              {formError && <ErrorBox message={formError} />}
              <form onSubmit={submitOnboarding}>
                <div className="form-row form-row-3">
                  <input
                    className="input"
                    placeholder="Business / your name"
                    value={form.business_name}
                    onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                    required
                  />
                  <input
                    className="input"
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                  <input
                    className="input"
                    placeholder="Phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="form-row">
                  <input
                    className="input"
                    placeholder="Beneficiary name (as per bank account)"
                    value={form.beneficiary_name}
                    onChange={(e) => setForm({ ...form, beneficiary_name: e.target.value })}
                    required
                  />
                </div>
                <button className="btn btn-primary" type="submit" disabled={submitting}>
                  {submitting ? "Connecting…" : "Connect payouts"}
                </button>
              </form>
            </>
          ) : (
            <p>
              Payout account status: <StatusBadge status={status.razorpay_account_status} /> —
              Razorpay is verifying your details. This page will update automatically once
              you're approved.
            </p>
          )}
        </section>
      )}

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Settled to bank</div>
          <div className="stat-value">{formatMoney(wallet?.settled_to_bank)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending settlement</div>
          <div className="stat-value">{formatMoney(wallet?.pending_settlement)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Failed transfers</div>
          <div className="stat-value">{formatMoney(wallet?.failed_transfers)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">COD collected</div>
          <div className="stat-value">{formatMoney(wallet?.cod_collected_total)}</div>
        </div>
      </div>

      <section className="panel">
        <h2>Transaction history</h2>
        {!wallet?.recent_transactions?.length ? (
          <EmptyState>No wallet activity yet.</EmptyState>
        ) : (
          <>
            <TableSearch query={txSearch.query} onChange={txSearch.setQuery} shown={txSearch.filtered.length} total={wallet.recent_transactions.length} placeholder="Search transactions…" />
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Order total</th>
                  <th>Platform fee</th>
                  <th>Your amount</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {txPager.pageItems.map((t) => (
                  <tr key={t.id}>
                    <td>{formatDate(t.created_at)}</td>
                    <td>{TYPE_LABELS[t.type] || t.type}</td>
                    <td>{formatMoney(t.order_total)}</td>
                    <td>{formatMoney(t.platform_fee)}</td>
                    <td>{formatMoney(t.seller_amount)}</td>
                    <td>{t.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination {...txPager.pagerProps} />
          </>
        )}
      </section>
    </div>
  );
}
