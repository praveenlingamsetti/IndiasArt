type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(event: string, payload: AnalyticsPayload = {}) {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[analytics] ${event}`, payload);
  }
}

export function trackScreenView(screenName: string) {
  trackEvent("screen_view", { screenName });
}
