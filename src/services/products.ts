import { http, requestData } from "@/lib/http";
import type { ProductDetail, ProductListingData } from "@/types/api";

export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type ArtistOption = {
  name: string;
  slug: string;
};

export type PopularSearchTerms = {
  terms: string[];
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

export async function getArtistOptions() {
  const data = await requestData<{
    products: Array<{
      vendor?: { storeName?: string | null; storeSlug?: string | null } | null;
    }>;
  }>(http.get("/api/products", { params: { page: 1, limit: 48 } }));

  const dedup = new Map<string, ArtistOption>();
  data.products.forEach((item) => {
    const name = item.vendor?.storeName?.trim();
    const slug = item.vendor?.storeSlug?.trim();
    if (!name || !slug) return;
    if (!dedup.has(slug)) {
      dedup.set(slug, { name, slug });
    }
  });

  return Array.from(dedup.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getPopularSearchTerms() {
  return requestData<PopularSearchTerms>(http.get("/api/mobile/search/popular"));
}
