import { http, requestData } from "@/lib/http";
import { env } from "@/config/env";
import { getAccessToken } from "@/lib/token-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import type { Order, OrderTracking } from "@/types/api";

export async function getOrders() {
  return requestData<Order[]>(http.get("/api/mobile/orders"));
}

export async function getOrderDetail(orderId: string) {
  return requestData<Order>(http.get(`/api/mobile/orders/${orderId}`));
}

export async function getOrderTracking(orderId: string) {
  return requestData<OrderTracking>(http.get(`/api/mobile/orders/${orderId}/tracking`));
}

export async function cancelOrder(orderId: string, reason: string) {
  const clean = reason.trim();
  return requestData<{ message: string }>(
    http.post(`/api/mobile/orders/${orderId}/cancel`, {
      reasonName: clean || "Cancelled from mobile app",
      reasonCategory: "OTHER",
      reasonDescription: clean || undefined,
    }),
  );
}

export async function requestOrderReturn(
  orderId: string,
  reason: string,
  orderItemIds: string[],
) {
  return requestData<{ message: string }>(
    http.post(`/api/mobile/orders/${orderId}/return`, { reason, orderItemIds }),
  );
}

export async function downloadOrderInvoice(orderId: string) {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Please login again to download invoice.");
  }

  const fileUri = `${FileSystem.cacheDirectory}invoice-${orderId}.pdf`;
  const result = await FileSystem.downloadAsync(
    `${env.apiBaseUrl}/api/mobile/orders/${orderId}/invoice`,
    fileUri,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available on this device.");
  }

  await Sharing.shareAsync(result.uri, {
    mimeType: "application/pdf",
    dialogTitle: "Invoice",
  });
}
