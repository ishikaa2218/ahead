import axios from "axios";
import { axiosInstance } from "./axiosInstance";

export type SignupRole = "student" | "interviewer";

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  role: SignupRole;
}

export interface SignupResponse {
  id: number;
  name: string;
  email: string;
  role: SignupRole;
}

export interface LoginPayload {
  email: string;
  password: string;
  role: SignupRole;
}

export interface LoginResponse {
  id: number;
  loginId: string;
  name: string;
  email: string;
  role: SignupRole;
}

export interface ResetPasswordPayload {
  email: string;
  role: SignupRole;
  newPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}

interface ApiErrorBody {
  message?: string;
}

export async function signupUser(payload: SignupPayload): Promise<SignupResponse> {
  const response = await axiosInstance.post<SignupResponse>( "/post/signup-details", payload);
  return response.data;
}

export async function loginUser(payload: LoginPayload): Promise<LoginResponse> {
  const response = await axiosInstance.post<LoginResponse>("/post/login-details", payload);
  return response.data;
}

export async function getCurrentUser(): Promise<LoginResponse> {
  const response = await axiosInstance.get<LoginResponse>("/get/me");
  return response.data;
}

export async function logoutUser(): Promise<void> {
  await axiosInstance.post("/post/logout");
}

export async function resetPassword(
  payload: ResetPasswordPayload,
): Promise<ResetPasswordResponse> {
  const response = await axiosInstance.post<ResetPasswordResponse>(
    "/post/reset-password",
    payload,
  );
  return response.data;
}

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return (
      error.response?.data?.message ?? "Something went wrong. Please try again."
    );
  }

  return "Something went wrong. Please try again.";
}
