import * as SecureStore from "expo-secure-store";

const accessTokenKey = "indiasart_access_token";
const refreshTokenKey = "indiasart_refresh_token";

export async function getAccessToken() {
  return SecureStore.getItemAsync(accessTokenKey);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(refreshTokenKey);
}

export async function saveAuthTokens(tokens: {
  accessToken: string;
  refreshToken: string;
}) {
  await SecureStore.setItemAsync(accessTokenKey, tokens.accessToken);
  await SecureStore.setItemAsync(refreshTokenKey, tokens.refreshToken);
}

export async function clearAuthTokens() {
  await SecureStore.deleteItemAsync(accessTokenKey);
  await SecureStore.deleteItemAsync(refreshTokenKey);
}
