import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { useAuth } from "../../context/AuthContext";
import SellerAuthShell from "../../components/SellerAuthShell";

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const errorRef = useRef(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (error && errorRef.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.fromTo(errorRef.current, { x: -8 }, { x: 0, duration: 0.6, ease: "elastic.out(1, 0.25)" });
    }
  }, [error]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const value = email.trim();
    if (!value) {
      setError("Enter the email you registered your store with.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("That doesn't look like an email address. Please check it and try again.");
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(value);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SellerAuthShell
      animKey={sent ? "sent" : "form"}
      eyebrow="Account recovery"
      headline="Locked out? We'll get you back in."
      lead="Tell us your registered email and we'll send a secure link to choose a new password."
      points={["A reset link arrives in your inbox", "The link expires for your safety", "Your store and orders stay untouched"]}
      chips={["Reset link on its way", "Secure & private"]}
    >
      {sent ? (
        <div className="slp-center">
          <div className="slp-success-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <h1 className="slp-anim">Check your email</h1>
          <p className="slp-sub slp-anim">
            If an account exists for <strong>{email.trim()}</strong>, we've sent a password reset link. It can take a minute to arrive, so check your spam folder too.
          </p>
          <button type="button" className="slp-ghost slp-anim" onClick={() => { setSent(false); setEmail(""); }}>
            Use a different email
          </button>
          <p className="slp-reg slp-anim"><Link to="/seller/login">← Back to sign in</Link></p>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <div className="slp-badge slp-anim" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none"><rect x="5" y="10.5" width="14" height="10" rx="2.4" stroke="currentColor" strokeWidth="1.8" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><circle cx="12" cy="15.5" r="1.3" fill="currentColor" /></svg>
          </div>
          <h1 className="slp-anim">Forgot your password?</h1>
          <p className="slp-sub slp-anim">No problem. Enter your email and we'll send you a reset link.</p>

          <div className="slp-field slp-anim">
            <input id="slp-fp-email" type="email" autoFocus autoComplete="email" placeholder=" " value={email} onChange={(e) => setEmail(e.target.value)} />
            <label htmlFor="slp-fp-email">Email address</label>
          </div>

          {error && <div className="slp-error" role="alert" ref={errorRef}>{error}</div>}

          <button type="submit" className="slp-submit slp-anim" disabled={loading}>
            {loading ? (<><span className="slp-spin" /> Sending…</>) : (
              <>Send reset link<svg viewBox="0 0 20 20" fill="none"><path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></>
            )}
          </button>

          <p className="slp-reg slp-anim"><Link to="/seller/login">← Back to sign in</Link></p>
        </form>
      )}
    </SellerAuthShell>
  );
}
