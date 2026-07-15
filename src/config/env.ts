const fallbackApiBaseUrl = "http://10.0.2.2:3000";

export const env = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? fallbackApiBaseUrl,
  razorpayKeyId: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? "",
};

export const appConfig = {
  appName: "INDIASART",
};
