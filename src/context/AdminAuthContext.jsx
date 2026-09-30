import { createContext, useContext, useEffect, useState, useCallback } from "react";
import client from "../api/client";

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    const raw = localStorage.getItem("admin");
    return raw ? JSON.parse(raw) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("admin_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      if (token) {
        try {
          const { data } = await client.get("/admin/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          setAdmin(data.admin);
          localStorage.setItem("admin", JSON.stringify(data.admin));
        } catch {
          logout();
        }
      }
      setLoading(false);
    }
    bootstrap();

  }, []);

  const login = useCallback(async (username, password) => {
    const { data } = await client.post("/admin/login", { username, password });
    localStorage.setItem("admin_token", data.token);
    localStorage.setItem("admin", JSON.stringify(data.admin));
    setToken(data.token);
    setAdmin(data.admin);
    return data.admin;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin");
    setToken(null);
    setAdmin(null);
  }, []);

  const authHeader = useCallback(() => {
    const t = localStorage.getItem("admin_token");
    return t ? { Authorization: `Bearer ${t}` } : {};
  }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, token, loading, login, logout, authHeader }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
