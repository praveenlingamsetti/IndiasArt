import { http, requestData } from "@/lib/http";

export type WishlistItem = {
  id: string;
  productId: string;
  product: {
    id: string;
    title: string;
    slug: string;
    price: number;
    stock?: number;
    status?: string;
    vendor?: { storeName?: string };
    variants?: Array<{ id: string; stock: number; price: number | string; name: string }>;
    images: Array<{ imageUrl: string }>;
  };
};

export async function getWishlist() {
  return requestData<WishlistItem[]>(http.get("/api/mobile/wishlist"));
}

export async function addWishlist(productId: string) {
  return requestData<WishlistItem>(http.post("/api/mobile/wishlist", { productId }));
}

export async function removeWishlist(productId: string) {
  return requestData<{ removed: boolean }>(
    http.delete("/api/mobile/wishlist", { data: { productId } }),
  );
}
