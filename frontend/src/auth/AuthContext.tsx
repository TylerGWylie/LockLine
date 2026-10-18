import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { apiFetch, hasStoredSession, setTokens } from "../api/client";
import type { User } from "../types";

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string, phone?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasStoredSession()) {
      setLoading(false);
      return;
    }
    apiFetch<User>("/auth/me")
      .then(setUser)
      .catch(() => setTokens(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const data = await apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setTokens(data);
    setUser(data.user);
  }

  async function signup(email: string, password: string, displayName: string, phone?: string) {
    const data = await apiFetch<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, displayName, phone }),
    });
    setTokens(data);
    setUser(data.user);
  }

  function logout() {
    setTokens(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
