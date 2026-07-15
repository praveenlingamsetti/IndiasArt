# indiasArt Mobile App (React Native + Expo)

This app is the customer-first React Native client for `indiasArt-webapp`.

## What is set up

- Expo + TypeScript project
- React Navigation (bottom tabs + stack)
- React Query for API data caching
- Axios API client with shared response handling (`success/data` and `success/message`)
- Mobile JWT auth flow (`/api/mobile/auth/login`, `refresh`, `me`, `logout`)
- Connected starter flows:
  - Product listing (`GET /api/products/listing`)
  - Product detail (`GET /api/products/[slug]`)
  - Mobile cart (`/api/mobile/cart`)
  - Orders (`GET /api/mobile/orders`)
  - Addresses (`/api/mobile/customer/address`)
  - Wishlist (`/api/mobile/wishlist`)
  - Support tickets (`/api/mobile/support`)

## Folder structure

- `src/config`: app/environment configuration
- `src/context`: global providers (`auth-context`)
- `src/lib`: API/query setup
- `src/navigation`: tab + stack navigation
- `src/screens`: customer screens (home/search/cart/orders/profile/support/wishlist)
- `src/services`: API calls grouped by domain
- `src/types`: API types
- `docs/api-matrix.md`: web-to-mobile endpoint parity map
- `docs/release-readiness.md`: analytics/QA/beta checklist

## Run locally

1. Install dependencies:
   - `npm install`
2. Create `.env` from `.env.example`:
   - `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000` (Android emulator -> local backend)
   - For real device, use your computer LAN IP, example: `http://192.168.1.20:3000`
3. Start backend:
   - In `indiasArt-webapp`, run `npm run dev`
4. Start mobile app:
   - In `indiasArt-mobileapp`, run `npm run start`
5. Open in Expo Go / Android emulator.

## Important env var

`EXPO_PUBLIC_API_BASE_URL` is the backend URL used by the mobile app.

- Android emulator local backend: `http://10.0.2.2:3000`
- Real device on same Wi-Fi: `http://<your-laptop-ip>:3000`
- Deployed app URL example: `https://valurarts.vercel.app`

## QA and beta

- Type check: `npm run typecheck`
- API smoke checks: `npm run qa:smoke`
- Build profiles are configured in `eas.json`

## Next steps to reach full parity with web app

1. Add screens matching web routes:
   - checkout, order history, wishlist, returns, track-order
2. Add role-based app areas:
   - customer, vendor, admin
3. Reuse web validations:
   - copy Zod schemas from `indiasArt-webapp/src/lib/validations` into shared package
4. Add image caching and upload flows:
   - Cloudinary upload flow for vendor/admin product management
