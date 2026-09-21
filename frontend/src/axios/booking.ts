import { axiosInstance } from "./axiosInstance";

export interface ApiInterviewer {
  interviewers_id: string;
  name: string;
  company_name: string;
  job_title: string;
  interview_title: string;
  description: string | null;
  experience_years: number | null;
  profile_image_url: string | null;
}

export interface ApiInterviewSlot {
  interview_slots_id: string;
  interviewer_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
}

export async function getInterviewers(): Promise<ApiInterviewer[]> {
  const response = await axiosInstance.get<ApiInterviewer[]>(
    "/get/interviewers",
  );
  return response.data;
}

export async function getInterviewSlots(): Promise<ApiInterviewSlot[]> {
  const response = await axiosInstance.get<ApiInterviewSlot[]>(
    "/get/interview-slots",
  );
  return response.data;
}

export interface CompanyInterviewApplicationPayload {
  interviewerId: string;
  slotId: string;
  intervieweeJobRole: string;
  domain: string;
  level: "Easy" | "Medium" | "Hard";
  jobDescription: string;
}

export interface AIInterviewApplicationPayload {
  targetRole: string;
  domain: string;
  level: "Easy" | "Medium" | "Hard";
  jobDescription: string;
  scheduledAt: string;
  interviewType: "Technical" | "Behavioral" | "Mixed";
  questionCount: number;
  interviewMode: "Text" | "Audio";
}

// ── Razorpay payment (AI + company interviews) ──────────────────────────────
//
// Bookings are created only once payment is verified — there is no separate
// "create booking" call. /order reserves nothing in the booking tables yet
// (it only opens a Razorpay order); /verify is what actually creates the row,
// and only after the payment signature checks out. If payment fails or is
// cancelled, /failed just logs the attempt — no interview is ever booked.

export interface RazorpayOrderDetails {
  applicationId: string;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  name: string;
  description: string;
  prefill: { name: string; email: string };
}

export interface PaymentIdentifiers {
  applicationId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface ReportPaymentFailurePayload {
  applicationId: string;
  razorpay_order_id: string;
  errorCode?: string;
  errorDescription?: string;
}

export async function createAIInterviewPaymentOrder(
  payload: AIInterviewApplicationPayload,
): Promise<RazorpayOrderDetails> {
  const response = await axiosInstance.post<RazorpayOrderDetails>(
    "/payments/ai-interview/order",
    payload,
  );
  return response.data;
}

export async function verifyAIInterviewPayment(
  payload: PaymentIdentifiers & AIInterviewApplicationPayload,
): Promise<{ success: boolean; status: string; applicationId: string }> {
  const response = await axiosInstance.post<{ success: boolean; status: string; applicationId: string }>(
    "/payments/ai-interview/verify",
    payload,
  );
  return response.data;
}

export async function reportAIInterviewPaymentFailure(
  payload: ReportPaymentFailurePayload,
): Promise<void> {
  await axiosInstance.post("/payments/ai-interview/failed", payload);
}

export async function createCompanyInterviewPaymentOrder(
  payload: CompanyInterviewApplicationPayload,
): Promise<RazorpayOrderDetails> {
  const response = await axiosInstance.post<RazorpayOrderDetails>(
    "/payments/company-interview/order",
    payload,
  );
  return response.data;
}

export async function verifyCompanyInterviewPayment(
  payload: PaymentIdentifiers & CompanyInterviewApplicationPayload,
): Promise<{ success: boolean; status: string; applicationId: string }> {
  const response = await axiosInstance.post<{ success: boolean; status: string; applicationId: string }>(
    "/payments/company-interview/verify",
    payload,
  );
  return response.data;
}

export async function reportCompanyInterviewPaymentFailure(
  payload: ReportPaymentFailurePayload,
): Promise<void> {
  await axiosInstance.post("/payments/company-interview/failed", payload);
}

export interface DashboardAIInterview {
  id: string;
  target_role: string;
  domain: string;
  level: string;
  status: string;
  scheduled_at: string | null;
  created_at: string;
  has_feedback: boolean;
}

export interface DashboardCompanyInterview {
  id: string;
  target_role: string;
  domain: string;
  level: string;
  status: string;
  created_at: string;
  interviewer_name: string | null;
  interviewer_company: string | null;
  slot_date: string | null;
  start_time: string | null;
  end_time: string | null;
}

export interface MyInterviewsResponse {
  aiInterviews: DashboardAIInterview[];
  companyInterviews: DashboardCompanyInterview[];
}

export async function getMyInterviews(): Promise<MyInterviewsResponse> {
  const response = await axiosInstance.get<MyInterviewsResponse>(
    "/get/my-interviews",
  );
  return response.data;
}

// ── AI interview live session ───────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AISessionInterviewConfig {
  targetRole: string;
  domain: string;
  difficulty: "Easy" | "Medium" | "Hard";
  interviewType: "Technical" | "Behavioral" | "Mixed";
  questionCount: number;
  interviewMode: "Text" | "Audio";
}

export interface AISessionStartResponse {
  sessionId: string;
  interview: AISessionInterviewConfig;
  history: ChatMessage[];
  pendingQuestion: string | null;
  readyToComplete: boolean;
}

export interface AIInterviewChatResponse {
  message: string;
  done: boolean;
}

export interface AIInterviewEvaluation {
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  confidenceScore: number;
  relevanceScore: number;
  strengths: string[];
  areasForImprovement: string[];
  detailedFeedback: string;
  recommendation: "strong" | "good" | "average" | "needs_improvement";
}

export const AI_RECOMMENDATION_LABEL: Record<AIInterviewEvaluation["recommendation"], string> = {
  strong: "Strong Performance",
  good: "Good Performance",
  average: "Average Performance",
  needs_improvement: "Needs Improvement",
};

export async function startAISession(
  id: string,
): Promise<AISessionStartResponse> {
  const response = await axiosInstance.post<AISessionStartResponse>(
    `/ai-interviews/${id}/start`,
  );
  return response.data;
}

export async function sendAIInterviewAnswer(
  id: string,
  answer?: string,
): Promise<AIInterviewChatResponse> {
  const response = await axiosInstance.post<AIInterviewChatResponse>(
    `/ai-interviews/${id}/chat`,
    { answer },
  );
  return response.data;
}

export async function transcribeAIAnswer(
  id: string,
  audio: Blob,
  filename: string,
): Promise<string> {
  const formData = new FormData();
  formData.append("audio", audio, filename);

  const response = await axiosInstance.post<{ transcript: string }>(
    `/ai-interviews/${id}/stt`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data.transcript;
}

export async function completeAISession(
  id: string,
): Promise<AIInterviewEvaluation | null> {
  const response = await axiosInstance.post<{ evaluation: AIInterviewEvaluation | null }>(
    `/ai-interviews/${id}/complete`,
  );
  return response.data.evaluation;
}

export async function getAIInterviewFeedback(
  id: string,
): Promise<AIInterviewEvaluation> {
  const response = await axiosInstance.get<{ evaluation: AIInterviewEvaluation }>(
    `/ai-interviews/${id}/feedback`,
  );
  return response.data.evaluation;
}
