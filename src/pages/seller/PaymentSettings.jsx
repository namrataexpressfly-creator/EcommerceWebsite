import { useEffect, useState } from "react";
import client from "../../api/client";
import { Loading, ErrorBox, SuccessBox } from "../../components/Ui";
import { isRequired } from "../../utils/validate";

const defaultSettings = {
  cod_enabled: true,
  online_enabled: true,
  cod_extra_charge: 0,
  cod_min_order_value: 0,
  cod_max_order_value: 0,
  razorpay_mode: "platform",
  own_razorpay_key_id: "",
  own_razorpay_configured: false,
};

export default function PaymentSettings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  
  const [keyForm, setKeyForm] = useState({ key_id: "", key_secret: "" });
  const [keySaving, setKeySaving] = useState(false);
  const [keyError, setKeyError] = useState("");
  const [webhookInfo, setWebhookInfo] = useState(null); 

  const load = () => {
    setLoading(true);
    client
      .get("/seller/storefront")
      .then(({ data }) => setSettings({ ...defaultSettings, ...(data.payment_settings || {}) }))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!settings.cod_enabled && !settings.online_enabled) {
      setError("Please allow at least one way for customers to pay.");
      return;
    }
    if (settings.cod_enabled) {
      const min = Number(settings.cod_min_order_value) || 0;
      const max = Number(settings.cod_max_order_value) || 0;
      if (min < 0 || max < 0 || Number(settings.cod_extra_charge) < 0) {
        setError("COD amounts can't be negative.");
        return;
      }
      if (max > 0 && min > max) {
        setError("Minimum order value for COD can't be more than the maximum.");
        return;
      }
    }

    setSaving(true);
    try {
      const { data } = await client.put("/seller/storefront/payment-settings", settings);
      setSettings((s) => ({ ...s, ...(data.payment_settings || {}) }));
      setSuccess("Payment settings saved.");
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUseOwnRazorpay = async (e) => {
    e.preventDefault();
    setKeyError("");
    setWebhookInfo(null);

    if (!isRequired(keyForm.key_id)) {
      setKeyError("Please enter your Razorpay Key ID.");
      return;
    }
    if (!isRequired(keyForm.key_secret)) {
      setKeyError("Please enter your Razorpay Key Secret.");
      return;
    }

    setKeySaving(true);
    try {
      const { data } = await client.put("/seller/storefront/payment-settings/own-razorpay", keyForm);
      setSettings((s) => ({ ...s, ...data }));
      setWebhookInfo({ webhook_url: data.webhook_url, webhook_secret: data.webhook_secret });
      setKeyForm({ key_id: "", key_secret: "" });
    } catch (err) {
      setKeyError(err.response?.data?.error || err.message);
    } finally {
      setKeySaving(false);
    }
  };

  const switchToPlatform = async () => {
    setError("");
    try {
      const { data } = await client.put("/seller/storefront/payment-settings/use-platform-razorpay");
      setSettings((s) => ({ ...s, ...(data.payment_settings || {}) }));
      setWebhookInfo(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div className="page-header">
        <h1>Payment methods</h1>
      </div>
      <p className="muted">
        Control how customers can pay at checkout — Cash on Delivery (COD) or Pay online (Razorpay).
      </p>

      <ErrorBox message={error} />
      <SuccessBox message={success} />

      <form className="card" onSubmit={handleSave}>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={settings.cod_enabled}
            onChange={(e) => setSettings({ ...settings, cod_enabled: e.target.checked })}
          />
          Allow Cash on Delivery (COD)
        </label>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={settings.online_enabled}
            onChange={(e) => setSettings({ ...settings, online_enabled: e.target.checked })}
          />
          Allow online payment (Razorpay — UPI, cards, netbanking)
        </label>

        {settings.cod_enabled && (
          <div className="form-grid" style={{ marginTop: 16 }}>
            <label>
              Extra COD charge (₹)
              <input
                className="input"
                type="number"
                min="0"
                value={settings.cod_extra_charge}
                onChange={(e) => setSettings({ ...settings, cod_extra_charge: e.target.value })}
              />
              <span className="muted small">Added on top of the order total when a customer pays COD.</span>
            </label>

            <label>
              Minimum order value for COD (₹)
              <input
                className="input"
                type="number"
                min="0"
                value={settings.cod_min_order_value}
                onChange={(e) => setSettings({ ...settings, cod_min_order_value: e.target.value })}
              />
              <span className="muted small">0 = no minimum.</span>
            </label>

            <label>
              Maximum order value for COD (₹)
              <input
                className="input"
                type="number"
                min="0"
                value={settings.cod_max_order_value}
                onChange={(e) => setSettings({ ...settings, cod_max_order_value: e.target.value })}
              />
              <span className="muted small">0 = no maximum. High-value COD orders are also screened by Fraud & COD.</span>
            </label>
          </div>
        )}

        <button className="btn btn-primary" type="submit" disabled={saving} style={{ marginTop: 16 }}>
          {saving ? "Saving…" : "Save payment settings"}
        </button>
      </form>

     
      {settings.online_enabled && (
        <div className="card" style={{ marginTop: 20 }}>
          <h2 style={{ marginTop: 0 }}>Razorpay account</h2>

          {settings.razorpay_mode === "own" ? (
            <>
              <p className="muted small">
                Online payments for your store go straight into your own Razorpay account
                {settings.own_razorpay_key_id_masked ? ` (key ${settings.own_razorpay_key_id_masked})` : ""}.
                Expressfly never sees your secret key.
              </p>
              <button className="btn btn-ghost" onClick={switchToPlatform} type="button">
                Switch back to Expressfly's shared account
              </button>
            </>
          ) : (
            <p className="muted small">
              Right now online payments go through Expressfly's shared Razorpay account, and your
              share settles automatically to your linked bank account (see Wallet). If you'd rather
              use your own Razorpay account instead, add your keys below.
            </p>
          )}

          <form onSubmit={handleUseOwnRazorpay} style={{ marginTop: 14 }}>
            <div className="form-grid">
              <label>
                Razorpay Key ID
                <input
                  className="input"
                  type="text"
                  placeholder="rzp_live_xxxxxxxxxxxx"
                  value={keyForm.key_id}
                  onChange={(e) => setKeyForm({ ...keyForm, key_id: e.target.value })}
                />
              </label>
              <label>
                Razorpay Key Secret
                <input
                  className="input"
                  type="password"
                  placeholder="Your Razorpay Key Secret"
                  value={keyForm.key_secret}
                  onChange={(e) => setKeyForm({ ...keyForm, key_secret: e.target.value })}
                />
                <span className="muted small">
                  Stored encrypted. We'll never show this back to you after saving.
                </span>
              </label>
            </div>

            <ErrorBox message={keyError} />

            <button className="btn btn-primary" type="submit" disabled={keySaving} style={{ marginTop: 12 }}>
              {keySaving
                ? "Saving…"
                : settings.razorpay_mode === "own"
                ? "Update key"
                : "Use my own Razorpay account"}
            </button>
          </form>

          {webhookInfo && (
            <div className="alert alert-warning" style={{ marginTop: 16 }}>
              <strong>Set this up in your Razorpay dashboard now</strong> — the webhook secret below
              is shown only this once.
              <div style={{ marginTop: 8 }}>
                <div>
                  Webhook URL: <code>{webhookInfo.webhook_url}</code>
                </div>
                <div>
                  Webhook secret: <code>{webhookInfo.webhook_secret}</code>
                </div>
              </div>
              <p className="muted small" style={{ marginTop: 8 }}>
                In Razorpay: Settings → Webhooks → Add New Webhook. Paste the URL, paste the secret,
                and enable the <code>payment.captured</code> and <code>payment.failed</code> events.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
