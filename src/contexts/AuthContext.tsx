import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@/types";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await apiClient.auth.me();
        setCurrentUser(user);
      } catch (error) {
        // No valid token or user not found
        console.log("No authenticated user");
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.auth.login({ email, password });
      setCurrentUser(response.user);
      toast.success(`Willkommen, ${response.user.name}!`);
      return response.user;
    } catch (error: any) {
      toast.error(error.message || "Login fehlgeschlagen");
      throw error;
    }
  };

  const logout = () => {
    apiClient.auth.logout();
    setCurrentUser(null);
    toast.info("Erfolgreich abgemeldet");
  };

  const refreshUser = async () => {
    try {
      const user = await apiClient.auth.me();
      setCurrentUser(user);
    } catch (error) {
      console.error("Failed to refresh user:", error);
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
