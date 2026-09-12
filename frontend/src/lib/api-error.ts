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

  const message = error.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(", ");
  }

  return message ?? fallback;
}
