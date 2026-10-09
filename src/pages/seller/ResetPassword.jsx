import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import gsap from "gsap";
import { useAuth } from "../../context/AuthContext";
import SellerAuthShell from "../../components/SellerAuthShell";

const EyeIcon = ({ open }) =>
  open ? (
    <svg viewBox="0 0 20 20" fill="none"><path d="M3 3l14 14M8.6 8.7a2.2 2.2 0 0 0 3 3M6 6.2C4 7.5 2.7 9.3 2.3 10c1.3 2.4 4.1 5.3 7.7 5.3 1.3 0 2.5-.3 3.6-.9M10 4.7c3.6 0 6.4 2.9 7.7 5.3-.4.8-1.1 1.8-2 2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ) : (
    <svg viewBox="0 0 20 20" fill="none"><path d="M2.3 10S5.1 4.7 10 4.7 17.7 10 17.7 10 14.9 15.3 10 15.3 2.3 10 2.3 10z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><circle cx="10" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.5" /></svg>
  );

function strength(pw) {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
const LEVELS = ["Too short", "Weak", "Okay", "Good", "Strong"];

export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const emailFromLink = searchParams.get("email") || "";
  const errorRef = useRef(null);

  const [email, setEmail] = useState(emailFromLink);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (error && errorRef.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.fromTo(errorRef.current, { x: -8 }, { x: 0, duration: 0.6, ease: "elastic.out(1, 0.25)" });
    }
  }, [error]);

  const score = password ? strength(password) : -1;

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Your new password needs to be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Those passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email.trim(), token, password);
      setDone(true);
      setTimeout(() => navigate("/seller/login"), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const shell = (animKey, children) => (
    <SellerAuthShell
      animKey={animKey}
      eyebrow="Account recovery"
      headline="Choose a new password and get back to selling."
      lead="Pick something strong that you don't use anywhere else."
      points={["At least 6 characters", "Mix letters, numbers and symbols", "You'll sign in again afterwards"]}
      chips={["Secure reset", "Almost done"]}
    >
      {children}
    </SellerAuthShell>
  );

  if (!token) {
    return shell(
      "invalid",
      <div className="slp-center">
        <div className="slp-success-icon slp-icon-warn" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M12 7v6M12 17h.01" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" /></svg>
        </div>
        <h1 className="slp-anim">Link not valid</h1>
        <p className="slp-sub slp-anim">This reset link is missing or incomplete. Please request a new one.</p>
        <Link to="/seller/forgot-password" className="slp-submit slp-linkbtn slp-anim">Request a new link</Link>
        <p className="slp-reg slp-anim"><Link to="/seller/login">← Back to sign in</Link></p>
      </div>
    );
  }

  if (done) {
    return shell(
      "done",
      <div className="slp-center">
        <div className="slp-success-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h1 className="slp-anim">Password updated</h1>
        <p className="slp-sub slp-anim">Your password has been reset. Taking you to sign in…</p>
        <p className="slp-reg slp-anim"><Link to="/seller/login">Go to sign in now</Link></p>
      </div>
    );
  }

  return shell(
    "form",
    <form onSubmit={submit} noValidate>
      <div className="slp-badge slp-anim" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none"><path d="M15.5 9.5a4 4 0 1 1-3.2-3.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M13 11l7 7M17 15l2-2M15 17l2-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </div>
      <h1 className="slp-anim">Set a new password</h1>
      <p className="slp-sub slp-anim">Enter and confirm your new password below.</p>

      <div className="slp-field slp-anim">
        <input id="slp-rp-email" type="email" autoComplete="email" placeholder=" " value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="slp-rp-email">Email address</label>
      </div>

      <div className="slp-field slp-anim">
        <input id="slp-rp-pass" type={show ? "text" : "password"} autoFocus autoComplete="new-password" placeholder=" " value={password} onChange={(e) => setPassword(e.target.value)} />
        <label htmlFor="slp-rp-pass">New password</label>
        <button type="button" className="slp-eye" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}><EyeIcon open={show} /></button>
      </div>

      {password && (
        <div className="slp-meter" aria-live="polite">
          <div className="slp-meter-bars">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={i < score ? `on lvl-${score}` : ""} />
            ))}
          </div>
          <span className="slp-meter-text">{LEVELS[score]}</span>
        </div>
      )}

      <div className="slp-field slp-anim">
        <input id="slp-rp-confirm" type={show ? "text" : "password"} autoComplete="new-password" placeholder=" " value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        <label htmlFor="slp-rp-confirm">Confirm new password</label>
      </div>

      {error && <div className="slp-error" role="alert" ref={errorRef}>{error}</div>}

      <button type="submit" className="slp-submit slp-anim" disabled={loading}>
        {loading ? (<><span className="slp-spin" /> Resetting…</>) : (
          <>Reset password<svg viewBox="0 0 20 20" fill="none"><path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></>
        )}
      </button>

      <p className="slp-reg slp-anim"><Link to="/seller/login">← Back to sign in</Link></p>
    </form>
  );
}
