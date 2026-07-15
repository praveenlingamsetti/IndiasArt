import { http, requestData } from "@/lib/http";
import type { CartData } from "@/types/api";

export async function getCart() {
  return requestData<CartData>(http.get("/api/mobile/cart"));
}

export async function addToCart(payload: {
  productId: string;
  quantity?: number;
  variantId?: string;
}) {
  return requestData<CartData>(http.post("/api/mobile/cart", payload));
}

export async function updateCartItem(itemId: string, quantity: number) {
  return requestData<CartData>(http.patch("/api/mobile/cart", { itemId, quantity }));
}

export async function removeCartItem(itemId: string) {
  return requestData<CartData>(http.delete("/api/mobile/cart", { data: { itemId } }));
}
