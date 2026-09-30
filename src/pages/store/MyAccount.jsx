import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getCustomerOrders } from "../../api/client";
import { useCustomerAuth } from "../../context/CustomerAuthContext";
import CustomerLoginModal from "../../components/CustomerLoginModal";
import { Loading, EmptyState, StatusBadge } from "../../components/Ui";
import { formatMoney, formatDate } from "../../utils/format";
import { useStoreSlug } from "../../context/StoreSlugContext";
import { digitsOnly, isValidPincode } from "../../utils/validate";

const TABS = [
  { key: "profile", label: "My Profile" },
  { key: "orders", label: "Orders" },
  { key: "addresses", label: "Saved Addresses" },
];

export default function MyAccount() {
  const { slug, basePath } = useStoreSlug();
  const { isLoggedIn, loading: authLoading, customer, logout, saveAddress, editAddress, removeAddress } = useCustomerAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === searchParams.get("tab")) ? searchParams.get("tab") : "profile";
  const [showLogin, setShowLogin] = useState(false);

  if (authLoading) return <Loading />;

  if (!isLoggedIn) {
    return (
      <div className="account-page">
        <h1>My Account</h1>
        <EmptyState>
          <p>Log in to see your profile, orders, and saved addresses.</p>
          <button className="btn btn-primary" onClick={() => setShowLogin(true)}>Log in</button>
        </EmptyState>
        {showLogin && <CustomerLoginModal onClose={() => setShowLogin(false)} onSuccess={() => setShowLogin(false)} />}
      </div>
    );
  }

  return (
    <div className="account-page">
      <h1>My Account</h1>
      <div className="account-layout">
        <aside className="account-sidebar">
          <div className="account-sidebar-name">{customer?.name || "Guest"}</div>
          <div className="muted small">{customer?.phone}</div>
          <nav className="account-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`account-tab ${tab === t.key ? "account-tab-active" : ""}`}
                onClick={() => setSearchParams({ tab: t.key })}
              >
                {t.label}
              </button>
            ))}
            <Link to={`${basePath}/wishlist`} className="account-tab">Wishlist</Link>
            <button type="button" className="account-tab account-tab-logout" onClick={logout}>
              Logout
            </button>
          </nav>
        </aside>

        <div className="account-content">
          {tab === "profile" && <ProfileTab />}
          {tab === "orders" && <OrdersTab slug={slug} basePath={basePath} />}
          {tab === "addresses" && (
            <AddressesTab
              addresses={customer?.addresses || []}
              onSave={saveAddress}
              onEdit={editAddress}
              onRemove={removeAddress}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileTab() {
  const { customer, updateProfile } = useCustomerAuth();
  const [name, setName] = useState(customer?.name || "");
  const [email, setEmail] = useState(customer?.email || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await updateProfile({ name, email });
      setMessage("Profile updated.");
    } catch (err) {
      setError(err.response?.data?.error || "We couldn't save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="panel form-panel" onSubmit={handleSave}>
      <h2>Profile information</h2>
      <label className="field-label">Full name</label>
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
      <label className="field-label" style={{ marginTop: 10 }}>Phone number</label>
      <input className="input" value={customer?.phone || ""} disabled />
      <label className="field-label" style={{ marginTop: 10 }}>Email address</label>
      <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      {error && <div className="error-box" style={{ marginTop: 10 }}>{error}</div>}
      {message && <div className="success-box" style={{ marginTop: 10 }}>{message}</div>}
      <button className="btn btn-primary" type="submit" disabled={saving} style={{ marginTop: 14 }}>
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

function OrdersTab({ slug, basePath }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCustomerOrders(slug)
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Loading />;
  if (orders.length === 0) return <EmptyState>You haven't placed any orders yet.</EmptyState>;

  return (
    <div className="order-history-list">
      {orders.map((o) => (
        <Link to={`${basePath}/track/${o.tracking_token}`} key={o._id} className="panel order-history-row">
          <div>
            <div className="product-name">{o.items.map((i) => i.name).join(", ")}</div>
            <div className="muted small">{formatDate(o.created_at)} · {o.payment_method === "cod" ? "Cash on delivery" : "Paid online"}</div>
          </div>
          <div className="order-history-row-right">
            <StatusBadge status={o.status} />
            <div className="product-price">{formatMoney(o.total_amount)}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function AddressesTab({ addresses, onSave, onEdit, onRemove }) {
  const emptyForm = { label: "Home", line1: "", line2: "", city: "", state: "", pincode: "" };
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.line1 || !form.city || !form.state || !form.pincode) {
      setError("Please fill in your address line, city, state, and PIN code.");
      return;
    }
    if (!isValidPincode(form.pincode)) {
      setError("PIN code should be exactly 6 digits.");
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      setForm(emptyForm);
      setAdding(false);
    } catch (err) {
      setError(err.response?.data?.error || "We couldn't save that address. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {addresses.length === 0 && !adding && <EmptyState>No saved addresses yet.</EmptyState>}
      {addresses.map((a) => (
        <div key={a._id} className="panel address-history-row">
          <div>
            <strong>{a.label || "Address"}</strong>{a.is_default ? <span className="badge badge-confirmed" style={{ marginLeft: 8 }}>Default</span> : null}
            <div>{a.line1}{a.line2 ? `, ${a.line2}` : ""}</div>
            <div>{a.city}, {a.state} {a.pincode}</div>
          </div>
          <div className="table-actions">
            {!a.is_default && (
              <button className="btn btn-ghost" onClick={() => onEdit(a._id, { is_default: true })}>Set default</button>
            )}
            <button className="btn btn-ghost danger" onClick={() => onRemove(a._id)}>Remove</button>
          </div>
        </div>
      ))}

      {!adding ? (
        <button type="button" className="btn btn-primary" onClick={() => setAdding(true)} style={{ marginTop: 12 }}>
          + Add a new address
        </button>
      ) : (
        <form className="panel form-panel" onSubmit={handleSave} style={{ marginTop: 12 }}>
          <h2>New address</h2>
          <input className="input" placeholder="Label (Home, Work…)" value={form.label} onChange={update("label")} />
          <input className="input" placeholder="Address line 1" value={form.line1} onChange={update("line1")} />
          <input className="input" placeholder="Address line 2 (optional)" value={form.line2} onChange={update("line2")} />
          <div className="form-row form-row-3">
            <input className="input" placeholder="City" value={form.city} onChange={update("city")} />
            <input className="input" placeholder="State" value={form.state} onChange={update("state")} />
            <input
              className="input"
              placeholder="Pincode"
              value={form.pincode}
              maxLength={6}
              inputMode="numeric"
              onChange={(e) => setForm((f) => ({ ...f, pincode: digitsOnly(e.target.value, 6) }))}
            />
          </div>
          {error && <div className="error-box">{error}</div>}
          <div className="form-row">
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save address"}</button>
            <button type="button" className="btn btn-ghost" onClick={() => { setAdding(false); setError(""); }}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
