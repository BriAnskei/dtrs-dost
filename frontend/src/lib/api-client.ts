import axios, { type AxiosError } from "axios";
import { toast } from "sonner";
import { notifySessionExpired } from "../features/authentication/authentication.events";
import {
  clearAuthenticated,
  isAuthenticated,
} from "../features/authentication/authentication.session";
import { authenticationService } from "../features/authentication/service/authentication.service";
import type { AuthenticationRequestConfig } from "../features/authentication/type/authentication.type";

const API_URL = import.meta.env.VITE_API_URL;

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;

let refreshPromise: Promise<void> | null = null;

function isRefreshRequest(url: string | undefined) {
  return url?.includes("/authentication/refresh") ?? false;
}

function isLoginRequest(url: string | undefined) {
  return url?.includes("/authentication/login") ?? false;
}

function isLogoutRequest(url: string | undefined) {
  return url?.includes("/authentication/logout") ?? false;
}

function isVerifyPasswordRequest(url: string | undefined) {
  return url?.includes("/authentication/verify-password") ?? false;
}

function showSessionExpiredToast() {
  toast.error("Your session has expired", {
    description: "Please sign in again.",
    id: "session-expired",
  });
}

apiClient.interceptors.response.use(
  (res) => res,

  async (err: AxiosError) => {
    const originalReq = err.config as AuthenticationRequestConfig | undefined;

    if (!originalReq) {
      return Promise.reject(err);
    }

    // No response at all => transport failure (server down, offline, DNS,
    // timeout, empty response). This is NOT an auth problem, so skip the
    // 401/refresh dance entirely and just surface a toast. Auth-flow calls
    // (login/refresh/logout) own their own error handling and stay quiet here.
    if (!err.response) {
      const isAuthFlow =
        isLoginRequest(originalReq.url) ||
        isRefreshRequest(originalReq.url) ||
        isLogoutRequest(originalReq.url);

      if (!isAuthFlow) {
        toast.error("Could not connect to the server", {
          description: "Check your connection or try again later.",
          id: "network-error",
        });
      }

      return Promise.reject(err);
    }

    const isUnauthorized = err.response?.status === 401;

    const shouldSkipRefresh =
      isRefreshRequest(originalReq.url) ||
      isLoginRequest(originalReq.url) ||
      isLogoutRequest(originalReq.url) ||
      isVerifyPasswordRequest(originalReq.url) ||
      originalReq._retry === true;

    if (!isUnauthorized || shouldSkipRefresh) {
      return Promise.reject(err);
    }

    originalReq._retry = true;

    if (!isRefreshing) {
      isRefreshing = true;

      refreshPromise = authenticationService
        .refresh()
        .then(() => {
          // New access token is already stored in the cookie.
        })
        .finally(() => {
          isRefreshing = false;
          refreshPromise = null;
        });
    }

    try {
      await refreshPromise;

      return apiClient(originalReq);
    } catch (refreshErr) {
      // Only notify if the app previously had an authenticated session.
      if (isAuthenticated()) {
        clearAuthenticated();

        showSessionExpiredToast();

        notifySessionExpired();
      }

      return Promise.reject(refreshErr);
    }
  },
);
