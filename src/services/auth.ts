import { http, requestData } from "@/lib/http";
import {
  clearAuthTokens,
  getRefreshToken,
  saveAuthTokens,
} from "@/lib/token-storage";
import type { AuthSession, SessionUser } from "@/types/api";

export type LoginPayload = {
  email: string;
  password: string;
};

export async function login(payload: LoginPayload) {
  const session = await requestData<AuthSession>(
    http.post("/api/mobile/auth/login", payload),
  );
  await saveAuthTokens({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  });
  return session.user;
}

export async function logout() {
  const refreshToken = await getRefreshToken();
  await http.post("/api/mobile/auth/logout", { refreshToken }).catch(() => null);
  await clearAuthTokens();
}

export async function getMe() {
  return requestData<SessionUser>(http.get("/api/mobile/auth/me"));
}
