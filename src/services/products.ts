import { http, requestData } from "@/lib/http";
import type { ProductDetail, ProductListingData } from "@/types/api";

export type Category = {
  id: string;
  name: string;
  slug: string;
};

export async function getProducts(params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "popularity" | "relevance";
  minPrice?: number;
  maxPrice?: number;
  artist?: string;
}) {
  return requestData<ProductListingData>(
    http.get("/api/products/listing", {
      params,
    }),
  );
}

export async function getProductBySlug(slug: string) {
  return requestData<ProductDetail>(http.get(`/api/products/${slug}`));
}

export async function getCategories() {
  return requestData<Category[]>(http.get("/api/categories"));
}
