# INDIASART Mobile API Matrix

Baseline web app: [valurarts.vercel.app](https://valurarts.vercel.app)

This matrix tracks route parity between `indiasArt-webapp` and `indiasArt-mobileapp`.

## Auth

| Mobile Service | Endpoint | Method | Source Route | Screen(s) | Notes |
| --- | --- | --- | --- | --- | --- |
| `auth.login` | `/api/mobile/auth/login` | `POST` | New mobile route | `LoginScreen` | Returns access + refresh token |
| `auth.refresh` | `/api/mobile/auth/refresh` | `POST` | New mobile route | background | Rotates access token |
| `auth.me` | `/api/mobile/auth/me` | `GET` | New mobile route | `ProfileScreen`, bootstrap | Bearer token auth |
| `auth.logout` | `/api/mobile/auth/logout` | `POST` | New mobile route | `ProfileScreen` | Client token clear + optional server ack |
| `auth.register` | `/api/auth/register` | `POST` | [`src/app/api/auth/register/route.ts`](../../indiasArt-webapp/src/app/api/auth/register/route.ts) | (future register screen) | Reused |

## Catalog and Discovery

| Mobile Service | Endpoint | Method | Source Route | Screen(s) | Notes |
| --- | --- | --- | --- | --- | --- |
| `products.list` | `/api/products/listing` | `GET` | [`src/app/api/products/listing/route.ts`](../../indiasArt-webapp/src/app/api/products/listing/route.ts) | `HomeScreen`, `SearchScreen` | Public |
| `products.search` | `/api/products/search` | `GET` | [`src/app/api/products/search/route.ts`](../../indiasArt-webapp/src/app/api/products/search/route.ts) | `SearchScreen` | Public |
| `products.detail` | `/api/products/:slug` | `GET` | [`src/app/api/products/[slug]/route.ts`](../../indiasArt-webapp/src/app/api/products/[slug]/route.ts) | `ProductDetailScreen` | Public |
| `products.categories` | `/api/categories` | `GET` | [`src/app/api/categories/route.ts`](../../indiasArt-webapp/src/app/api/categories/route.ts) | `HomeScreen` | Public |
| `reviews.add` | `/api/products/:slug/reviews` | `POST` | [`src/app/api/products/[slug]/reviews/route.ts`](../../indiasArt-webapp/src/app/api/products/[slug]/reviews/route.ts) | (future review flow) | Session-based web route (future mobile token guard) |

## Cart and Checkout

| Mobile Service | Endpoint | Method | Source Route | Screen(s) | Notes |
| --- | --- | --- | --- | --- | --- |
| `cart.get` | `/api/mobile/cart` | `GET` | New mobile route | `CartScreen`, `CheckoutScreen` | Bearer token auth |
| `cart.add` | `/api/mobile/cart` | `POST` | New mobile route | `ProductDetailScreen` | Bearer token auth |
| `cart.update` | `/api/mobile/cart` | `PATCH` | New mobile route | `CartScreen` | Bearer token auth |
| `cart.remove` | `/api/mobile/cart` | `DELETE` | New mobile route | `CartScreen` | Bearer token auth |
| `checkout.estimate` | `/api/checkout/estimate` | `GET` | [`src/app/api/checkout/estimate/route.ts`](../../indiasArt-webapp/src/app/api/checkout/estimate/route.ts) | `CheckoutScreen` | Works for guest/web session; token-ready endpoint planned |
| `checkout.coupon` | `/api/checkout/coupon` | `POST/DELETE` | [`src/app/api/checkout/coupon/route.ts`](../../indiasArt-webapp/src/app/api/checkout/coupon/route.ts) | `CheckoutScreen` | Session cookie today |
| `orders.create` | `/api/orders` | `POST` | [`src/app/api/orders/route.ts`](../../indiasArt-webapp/src/app/api/orders/route.ts) | `CheckoutScreen` | Session cookie today |
| `payments.createOrder` | `/api/create-order` | `POST` | [`src/app/api/create-order/route.ts`](../../indiasArt-webapp/src/app/api/create-order/route.ts) | `CheckoutScreen` | Razorpay |
| `payments.verify` | `/api/verify-payment` | `POST` | [`src/app/api/verify-payment/route.ts`](../../indiasArt-webapp/src/app/api/verify-payment/route.ts) | `CheckoutScreen` | Razorpay |

## Account, Orders, and Support

| Mobile Service | Endpoint | Method | Source Route | Screen(s) | Notes |
| --- | --- | --- | --- | --- | --- |
| `orders.list` | `/api/mobile/orders` | `GET` | New mobile route | `OrdersScreen` | Bearer token auth |
| `orders.track` | `/api/orders/:id/tracking` | `GET` | [`src/app/api/orders/[id]/tracking/route.ts`](../../indiasArt-webapp/src/app/api/orders/[id]/tracking/route.ts) | `OrderDetailScreen` | Session route today |
| `orders.cancel` | `/api/orders/:id/cancel` | `POST` | [`src/app/api/orders/[id]/cancel/route.ts`](../../indiasArt-webapp/src/app/api/orders/[id]/cancel/route.ts) | `OrderDetailScreen` | Session route today |
| `orders.return` | `/api/orders/:id/return` | `POST` | [`src/app/api/orders/[id]/return/route.ts`](../../indiasArt-webapp/src/app/api/orders/[id]/return/route.ts) | `OrderDetailScreen` | Session route today |
| `addresses.list` | `/api/mobile/customer/address` | `GET` | New mobile route | `AddressesScreen` | Bearer token auth |
| `addresses.create` | `/api/mobile/customer/address` | `POST` | New mobile route | `AddressFormScreen` | Bearer token auth |
| `addresses.update` | `/api/mobile/customer/address/:id` | `PATCH` | New mobile route | `AddressFormScreen` | Bearer token auth |
| `addresses.delete` | `/api/mobile/customer/address/:id` | `DELETE` | New mobile route | `AddressesScreen` | Bearer token auth |
| `wishlist.list` | `/api/mobile/wishlist` | `GET` | New mobile route | `WishlistScreen` | Bearer token auth |
| `wishlist.add/remove` | `/api/mobile/wishlist` | `POST/DELETE` | New mobile route | `ProductDetailScreen`, `WishlistScreen` | Bearer token auth |
| `support.list` | `/api/mobile/support` | `GET` | New mobile route | `SupportScreen` | Bearer token auth |
| `support.create` | `/api/mobile/support` | `POST` | New mobile route | `SupportScreen` | Bearer token auth |

## Gaps to Close Next

1. Token-auth compatible checkout/order creation endpoints.
2. Token-auth compatible tracking/cancel/return endpoints.
3. Review submission route for mobile JWT auth.
4. Push-notification webhook endpoints for mobile device tokens.
