import { Navigate } from "react-router-dom";
import { useDeveloperAuth } from "../context/DeveloperAuthContext";

export default function DeveloperProtectedRoute({ children }) {
  const { token, loading } = useDeveloperAuth();

  if (loading) return <div className="page-loading">Loading…</div>;
  if (!token) return <Navigate to="/developer/login" replace />;
  return children;
}
