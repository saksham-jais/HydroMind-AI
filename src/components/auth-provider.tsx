import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api/client";

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  login: (userid: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);

  // Check local storage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("hydromind_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (userid: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userid, password }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setUser(data.user);
        setIsAuthenticated(true);
        localStorage.setItem("hydromind_user", JSON.stringify(data.user));
        toast.success("Welcome to Jalrakshak AI");
        return true;
      } else {
        const errorMsg = Array.isArray(data.detail) ? "Invalid input format" : data.detail;
        toast.error(errorMsg || "Invalid credentials");
        return false;
      }
    } catch (e) {
      console.error(e);
      toast.error("Unable to connect to authentication server");
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("hydromind_user");
    toast.info("Logged out successfully");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
