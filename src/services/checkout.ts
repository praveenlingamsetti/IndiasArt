import { http, requestData } from "@/lib/http";
import type {
  CheckoutEstimate,
  CreateOrderPayload,
  Order,
  PaymentCreateOrderResponse,
  PaymentVerifyPayload,
} from "@/types/api";

export async function getCheckoutEstimate(options?: {
  cartItemId?: string;
  couponCode?: string;
}) {
  const params =
    options?.cartItemId || options?.couponCode
      ? {
          ...(options?.cartItemId ? { cartItemId: options.cartItemId } : {}),
          ...(options?.couponCode ? { couponCode: options.couponCode } : {}),
        }
      : undefined;
  return requestData<CheckoutEstimate>(
    http.get("/api/mobile/checkout/estimate", { params }),
  );
}

export async function createMobileOrder(payload: CreateOrderPayload) {
  return requestData<Order>(http.post("/api/mobile/orders/create", payload));
}

export async function createMobilePaymentOrder(orderId: string) {
  return requestData<PaymentCreateOrderResponse>(
    http.post("/api/mobile/payments/create-order", { orderId }),
  );
}

export async function verifyMobilePayment(payload: PaymentVerifyPayload) {
  return requestData<{ message: string; orderNumber: string }>(
    http.post("/api/mobile/payments/verify", payload),
  );
}
