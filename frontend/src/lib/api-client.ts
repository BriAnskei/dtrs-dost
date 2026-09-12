import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { authenticationService } from "../features/authentication/authentication.service";

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

apiClient.interceptors.response.use(
  (res) => res,

  async (err: AxiosError) => {
    const originalReq = err.config as
      | (InternalAxiosRequestConfig & {
          _retry?: boolean;
        })
      | undefined;

    if (!originalReq) {
      return Promise.reject(err);
    }

    if (
      err.response?.status !== 401 ||
      originalReq._retry ||
      originalReq.url?.includes("/authentication/refresh")
    ) {
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
      return Promise.reject(refreshErr);
    }
  },
);
