import axios from "axios";

export interface ApiErrorResponse {
  message: string | string[];
  error?: string;
  statusCode: number;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong.",
): string {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return fallback;
  }

  const status = error.response?.status;

  if (status === 429) {
    return "Too many login attempts. Please try again later.";
  }

  const message = error.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(", ");
  }

  return message ?? fallback;
}

/**
 * Transport-level failure: the request was sent but no response was ever
 * received (server down, network offline, DNS failure, timeout, or an empty
 * response). These are connectivity problems, NOT authentication problems, so
 * they must never be treated like a 401 (no token refresh, no session-expiry
 * redirect — just surface the error).
 */
export function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response;
}
