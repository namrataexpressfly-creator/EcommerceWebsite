import { useEffect, useState } from "react";
import { useCustomerAuth } from "../context/CustomerAuthContext";
import { isValidPincode, digitsOnly } from "../utils/validate";

const emptyForm = { label: "Home", line1: "", line2: "", city: "", state: "", pincode: "" };

export default function AddressSidebar({ addresses, selectedId, onSelect, onClose }) {
  const { saveAddress, removeAddress } = useCustomerAuth();
  const [adding, setAdding] = useState(addresses.length === 0);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

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
      const updated = await saveAddress(form);
      const newest = updated[updated.length - 1];
      onSelect(newest._id);
      setForm(emptyForm);
      setAdding(false);
    } catch (err) {
      setError(err.response?.data?.error || "We couldn't save that address. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await removeAddress(id);
      if (selectedId === id) onSelect(null);
    } catch {
      setError("We couldn't remove that address. Please try again.");
    }
  };

  return (
    <div className="side-panel-overlay" onClick={onClose}>
      <div className="side-panel" onClick={(e) => e.stopPropagation()}>
        <div className="side-panel-header">
          <h3>Choose a delivery address</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="side-panel-body">
          {addresses.map((a) => (
            <label key={a._id} className={`address-card ${selectedId === a._id ? "address-card-selected" : ""}`}>
              <input
                type="radio"
                name="ship-address"
                checked={selectedId === a._id}
                onChange={() => onSelect(a._id)}
              />
              <div className="address-card-body">
                <div className="address-card-label">{a.label || "Address"}</div>
                <div>{a.line1}{a.line2 ? `, ${a.line2}` : ""}</div>
                <div>{a.city}, {a.state} {a.pincode}</div>
              </div>
              <button type="button" className="address-card-remove" onClick={() => handleDelete(a._id)} title="Remove address">
                Remove
              </button>
            </label>
          ))}

          {!adding ? (
            <button type="button" className="btn btn-ghost btn-block" onClick={() => setAdding(true)} style={{ marginTop: 12 }}>
              + Add a new address
            </button>
          ) : (
            <form onSubmit={handleSave} className="side-panel-form">
              <h4 style={{ marginTop: 16 }}>New address</h4>
              <div className="form-row">
                <input className="input" placeholder="Label (Home, Work…)" value={form.label} onChange={update("label")} />
              </div>
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
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save address"}
                </button>
                {addresses.length > 0 && (
                  <button type="button" className="btn btn-ghost" onClick={() => { setAdding(false); setError(""); }}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {!adding && (
          <div className="side-panel-footer">
            <button type="button" className="btn btn-primary btn-block" onClick={onClose} disabled={!selectedId}>
              Use this address
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
