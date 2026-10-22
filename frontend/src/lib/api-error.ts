import axios from "axios";

export interface ApiErrorResponse {
  message: string | string[];
  error?: string;
  statusCode: number;
  code?: string;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong.",
): string {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return fallback;
  }

  const status = error.response?.status;
  const data = error.response?.data;

  if (status === 409 && data?.code === "IDEMPOTENCY_KEY_IN_USE") {
    return "This request is still processing. Please wait a moment before trying again.";
  }

  if (status === 422 && data?.code === "IDEMPOTENCY_KEY_REUSED") {
    return "This request key was already used for different data. Please refresh and try again.";
  }

  if (status === 400 && data?.code === "IDEMPOTENCY_KEY_REQUIRED") {
    return "A required request identifier is missing. Please refresh and try again.";
  }

  if (status === 429) {
    return "Too many requests. Please wait a moment before trying again.";
  }

  if (Array.isArray(data?.message)) {
    return data.message.join(", ");
  }

  return data?.message ?? data?.error ?? fallback;
}

export function getErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

export function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response;
}
