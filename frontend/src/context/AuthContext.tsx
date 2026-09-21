import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getCurrentUser, logoutUser } from "../axios/data";
import { AuthContext, type AuthUser } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    getCurrentUser()
      .then((currentUser) => {
        if (!isActive) return;
        setUser(currentUser);
      })
      .catch(() => {
        if (!isActive) return;
        setUser(null);
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    }
  }, []);

  async function logout() {
    await logoutUser();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
