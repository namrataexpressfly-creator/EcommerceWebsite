import { createContext, useContext, useEffect, useState, useCallback } from "react";
import client from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [seller, setSeller] = useState(() => {
    const raw = localStorage.getItem("seller");
    return raw ? JSON.parse(raw) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("seller_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      if (token) {
        try {
          const { data } = await client.get("/seller/me");
          setSeller(data);
          localStorage.setItem("seller", JSON.stringify(data));
        } catch {
          logout();
        }
      }
      setLoading(false);
    }
    bootstrap();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await client.post("/seller/login", { email, password });
    localStorage.setItem("seller_token", data.token);
    localStorage.setItem("seller", JSON.stringify(data.seller));
    setToken(data.token);
    setSeller(data.seller);
    return data.seller;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await client.post("/seller/register", payload);
    localStorage.setItem("seller_token", data.token);
    localStorage.setItem("seller", JSON.stringify(data.seller));
    setToken(data.token);
    setSeller(data.seller);
    return data.seller;
  }, []);

  const refreshSeller = useCallback(async () => {
    const { data } = await client.get("/seller/me");
    setSeller(data);
    localStorage.setItem("seller", JSON.stringify(data));
    return data;
  }, []);

  const forgotPassword = useCallback(async (email) => {
    const { data } = await client.post("/seller/forgot-password", { email });
    return data;
  }, []);

  const resetPassword = useCallback(async (email, token, password) => {
    const { data } = await client.post("/seller/reset-password", { email, token, password });
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("seller_token");
    localStorage.removeItem("seller");
    setToken(null);
    setSeller(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ seller, token, loading, login, register, logout, refreshSeller, forgotPassword, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}