import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useCustomerAuth } from "../context/CustomerAuthContext";
import { digitsOnly } from "../utils/validate";

export default function CustomerLoginModal({ onClose, onSuccess }) {
  const { sendOtp, login } = useCustomerAuth();
  const [step, setStep] = useState("phone"); 
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState(false);


  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }
    setSending(true);
    try {
      const result = await sendOtp(digits);
      setDevOtpHint(Boolean(result?.dev_mode));
      setStep("otp");
    } catch (err) {
      setError(err.response?.data?.error || "We couldn't send the code. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    if (!otp.trim()) {
      setError("Please enter the code sent to your phone.");
      return;
    }
    setSending(true);
    try {
      const digits = phone.replace(/\D/g, "");
      const customer = await login(digits, otp.trim(), name.trim() || undefined);
      onSuccess?.(customer);
    } catch (err) {
      setError(err.response?.data?.error || "That code doesn't match. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return createPortal(
    <div className="side-panel-overlay" onClick={onClose}>
      <div className="side-panel" onClick={(e) => e.stopPropagation()}>
        <div className="side-panel-header">
          <h3>Log in to continue</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="side-panel-body">
          {step === "phone" ? (
            <form onSubmit={handleSendOtp}>
              <p className="muted small" style={{ marginTop: 0 }}>
                We'll text you a one-time code to verify it's you — no password needed.
              </p>
              <label className="field-label">Your name</label>
              <input
                className="input"
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <label className="field-label" style={{ marginTop: 10 }}>Phone number</label>
              <input
                className="input"
                type="tel"
                placeholder="10-digit mobile number"
                value={phone}
                maxLength={10}
                inputMode="numeric"
                onChange={(e) => setPhone(digitsOnly(e.target.value, 10))}
              />
              {error && <div className="error-box" style={{ marginTop: 8 }}>{error}</div>}
              <button className="btn btn-primary btn-block" type="submit" disabled={sending} style={{ marginTop: 14 }}>
                {sending ? "Sending…" : "Send OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify}>
              <p className="muted small" style={{ marginTop: 0 }}>
                Enter the 6-digit code sent to <strong>{phone}</strong>.
              </p>
              {devOtpHint && (
                <div className="muted small" style={{ marginBottom: 8 }}>
                  (Dev mode — check the backend server console for your code.)
                </div>
              )}
              <label className="field-label" style={{ marginTop: 10 }}>One-time code</label>
              <input
                className="input"
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                autoFocus
              />
              {error && <div className="error-box" style={{ marginTop: 8 }}>{error}</div>}
              <button className="btn btn-primary btn-block" type="submit" disabled={sending} style={{ marginTop: 14 }}>
                {sending ? "Verifying…" : "Verify & Continue"}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-block"
                style={{ marginTop: 8 }}
                onClick={() => {
                  setStep("phone");
                  setOtp("");
                  setError("");
                }}
              >
                Use a different number
              </button>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
