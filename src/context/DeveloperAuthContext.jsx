import { createContext, useContext, useEffect, useState, useCallback } from "react";
import client from "../api/client";

// Same pattern as AdminAuthContext, but for developer accounts. Uses its own
// localStorage keys so an admin and a developer can be signed in side by side.
const DeveloperAuthContext = createContext(null);

export function DeveloperAuthProvider({ children }) {
  const [developer, setDeveloper] = useState(() => {
    try {
      const raw = localStorage.getItem("developer");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("developer_token"));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("developer_token");
    localStorage.removeItem("developer");
    setToken(null);
    setDeveloper(null);
  }, []);

  useEffect(() => {
    async function bootstrap() {
      if (token) {
        try {
          const { data } = await client.get("/developer/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          setDeveloper(data.developer);
          localStorage.setItem("developer", JSON.stringify(data.developer));
        } catch {
          logout();
        }
      }
      setLoading(false);
    }
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (username, password) => {
    const { data } = await client.post("/developer/login", { username, password });
    localStorage.setItem("developer_token", data.token);
    localStorage.setItem("developer", JSON.stringify(data.developer));
    setToken(data.token);
    setDeveloper(data.developer);
    return data.developer;
  }, []);

  const authHeader = useCallback(() => {
    const t = localStorage.getItem("developer_token");
    return t ? { Authorization: `Bearer ${t}` } : {};
  }, []);

  return (
    <DeveloperAuthContext.Provider value={{ developer, token, loading, login, logout, authHeader }}>
      {children}
    </DeveloperAuthContext.Provider>
  );
}

export function useDeveloperAuth() {
  const ctx = useContext(DeveloperAuthContext);
  if (!ctx) throw new Error("useDeveloperAuth must be used within DeveloperAuthProvider");
  return ctx;
}
