import { createContext, useContext, useEffect, useMemo, useState } from "react";
import http from "../api/http";

const AuthContext = createContext(null);
const disableSignIn = import.meta.env.VITE_DISABLE_SIGNIN === "true";
const autoLoginEmail = import.meta.env.VITE_AUTO_LOGIN_EMAIL || "yusufmohamedyak55@gmail.com";
const autoLoginPassword = import.meta.env.VITE_AUTO_LOGIN_PASSWORD || "yusuf@55555";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const { data } = await http.get("/auth/me");
      setUser(data.user);
    } catch (_error) {
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const autoLogin = async () => {
    try {
      const { data } = await http.post("/auth/login", {
        email: autoLoginEmail,
        password: autoLoginPassword,
        deviceInfo: "auto-login"
      });
      localStorage.setItem("token", data.token);
      setUser(data.user);
    } catch (_error) {
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (disableSignIn) {
      autoLogin();
      return;
    }

    fetchMe();
  }, []);

  const login = async (payload) => {
    const { data } = await http.post("/auth/login", payload);
    localStorage.setItem("token", data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    if (disableSignIn) {
      return;
    }

    localStorage.removeItem("token");
    setUser(null);
  };

  const value = useMemo(() => ({ user, loading, login, logout, refresh: fetchMe }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
};
