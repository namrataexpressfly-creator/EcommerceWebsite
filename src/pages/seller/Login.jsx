import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ErrorBox } from "../../components/Ui";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("demo@expressfly.test");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState(() => {
    const notice = sessionStorage.getItem("seller_notice") || "";
    sessionStorage.removeItem("seller_notice");
    return notice;
  });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const seller = await login(email, password);
  
      navigate(seller?.kyc?.status === "approved" ? "/seller" : "/seller/kyc");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Seller login</h1>
 
        <input className="input" type="email" placeholder="Email" 

         onChange={(e) => setEmail(e.target.value)} />
        <input
          className="input"
          type="password"
          placeholder="Password"

          onChange={(e) => setPassword(e.target.value)}
        />
        <ErrorBox message={error} />
        <button className="btn btn-primary btn-block" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <p className="muted small">
          <Link to="/seller/forgot-password">Forgot password?</Link>
        </p>
        <p className="muted small">
          No account? <Link to="/seller/register">Register a store</Link>
        </p>
      </form>
    </div>
  );
}