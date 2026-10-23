import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "../types";
import { api } from "../services/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: any) => Promise<void>;
  register: (data: any) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  demoLogin: (role: "reader" | "unverified" | "bookseller" | "moderator" | "admin") => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      setUser(res.data.user);
    } catch {
      setUser(null);
      localStorage.removeItem("session_token");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials: any) => {
    const res = await api.login(credentials);
    if (res.data.sessionToken) {
      localStorage.setItem("session_token", res.data.sessionToken);
    }
    setUser(res.data.user);
  };

  const register = async (data: any) => {
    const res = await api.register(data);
    return res.data;
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      localStorage.removeItem("session_token");
      setUser(null);
    }
  };

  const demoLogin = async (role: "reader" | "unverified" | "bookseller" | "moderator" | "admin") => {
    const creds: Record<string, { email: string; pass: string }> = {
      reader: { email: "reader@indiebooks.demo", pass: "ReaderPass123!" },
      unverified: { email: "unverified@indiebooks.demo", pass: "ReaderPass123!" },
      bookseller: { email: "bookseller@beaconhill.demo", pass: "BooksellerPass123!" },
      moderator: { email: "moderator@bookclub.demo", pass: "ModeratorPass123!" },
      admin: { email: "admin@indiebooks.demo", pass: "AdminPass123!" },
    };

    const target = creds[role];
    if (target) {
      await login({ email: target.email, password: target.pass });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
        demoLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
