# Mobile Release Readiness

## Analytics

- Screen tracking is wired in `App.tsx` through `trackScreenView()`.
- Event helper lives in `src/lib/analytics.ts`.
- Next step: forward these events to Firebase Analytics or PostHog.

## QA Smoke Checks

- Run API smoke checks:
  - `npm run qa:smoke`
- Optional auth smoke:
  - `SMOKE_TEST_EMAIL` and `SMOKE_TEST_PASSWORD` env vars

## Build Profiles (EAS)

- Config file: `eas.json`
- Internal Android APK:
  - `eas build -p android --profile preview`
- Development build:
  - `eas build -p android --profile development`
- Production:
  - `eas build -p android --profile production`

## Beta Rollout Checklist

1. Verify `.env` points to production API URL.
2. Run `npm run typecheck`.
3. Run `npm run qa:smoke`.
4. Build preview APK and run on at least 3 Android devices.
5. Validate critical journeys:
   - login
   - browse/search
   - cart update
   - checkout summary
   - orders list
6. Monitor API errors and crashes after rollout.
