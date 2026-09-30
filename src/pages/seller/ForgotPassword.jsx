import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ErrorBox, SuccessBox } from "../../components/Ui";
import { isRequired, isValidEmail } from "../../utils/validate";

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devHint, setDevHint] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!isRequired(email)) {
      setError("Please enter your email address.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const result = await forgotPassword(email);
      setDevHint(Boolean(result?.dev_mode));
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Forgot password</h1>
        <p className="muted small" style={{ marginTop: 0 }}>
          Enter the email address on your seller account and we'll send you a link to reset your password.
        </p>

        {sent ? (
          <>
            <SuccessBox message="If an account exists for that email, we've sent a password reset link. Check your inbox." />
            {devHint && (
              <p className="muted small">
                (Dev mode — check the backend server console for your reset link.)
              </p>
            )}
          </>
        ) : (
          <>
            <input
              className="input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
            />
            <ErrorBox message={error} />
            <button className="btn btn-primary btn-block" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </>
        )}

        <p className="muted small">
          <Link to="/seller/login">Back to sign in</Link>
        </p>
      </form>
    </div>
  );
}