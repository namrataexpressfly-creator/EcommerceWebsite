import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { isRequired } from "../../utils/validate";

export default function AdminLogin() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!isRequired(username)) {
      setError("Please enter your username.");
      return;
    }
    if (!isRequired(password)) {
      setError("Please enter your password.");
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="adm-login">
      <div className="adm-login-brand">
        <div className="adm-login-brand-inner">
          <span className="adm-wordmark">Expressfly</span>
          <span className="adm-tag">Admin console</span>
          <p className="adm-login-copy">
            Review seller identity documents, verify PAN and Aadhaar details, and approve or
            reject KYC submissions before a store goes live.
          </p>
        </div>
      </div>

      <div className="adm-login-form-side">
        <form className="adm-login-form" onSubmit={submit}>
          <h1>Sign in</h1>
          <p className="adm-login-sub">Use your admin credentials to continue.</p>

          <label className="adm-field-label" htmlFor="adm-username">
            Username
          </label>
          <input
            id="adm-username"
            className="adm-input"
            type="text"
            autoFocus
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <label className="adm-field-label" htmlFor="adm-password">
            Password
          </label>
          <input
            id="adm-password"
            className="adm-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <div className="adm-error">{error}</div>}

          <button className="adm-btn adm-btn-primary adm-btn-block" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

