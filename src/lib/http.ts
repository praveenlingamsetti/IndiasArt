import axios from "axios";
import { env } from "@/config/env";
import type { ApiResponse } from "@/types/api";
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  saveAuthTokens,
} from "@/lib/token-storage";

export const http = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

const authHttp = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

type RetryableConfig = {
  _retry?: boolean;
  headers?: Record<string, string>;
};

http.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error.config as RetryableConfig | undefined;
    if (!originalRequest || status !== 401 || originalRequest._retry) {
      throw error;
    }

    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      await clearAuthTokens();
      throw error;
    }

    try {
      originalRequest._retry = true;
      const refreshResponse = await authHttp.post<
        ApiResponse<{ accessToken: string; refreshToken: string }>
      >("/api/mobile/auth/refresh", { refreshToken });

      if (!refreshResponse.data.success) {
        await clearAuthTokens();
        throw error;
      }

      await saveAuthTokens({
        accessToken: refreshResponse.data.data.accessToken,
        refreshToken: refreshResponse.data.data.refreshToken,
      });

      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.data.accessToken}`;
      return http(originalRequest);
    } catch {
      await clearAuthTokens();
      throw error;
    }
  },
);

export class ApiRequestError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

export async function requestData<T>(promise: Promise<{ data: ApiResponse<T> }>) {
  try {
    const response = await promise;
    if (!response.data.success) {
      throw new ApiRequestError(response.data.message);
    }

    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        (error.response?.data as { message?: string } | undefined)?.message ??
        error.message ??
        "Request failed";
      throw new ApiRequestError(message, error.response?.status);
    }
    throw error;
  }
}
