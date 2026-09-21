import { createContext } from "react";
import type { LoginResponse } from "../axios/data";

export type AuthUser = LoginResponse;

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
