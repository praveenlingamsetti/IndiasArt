import { http, requestData } from "@/lib/http";

export type ReviewEligibility = {
  canReview: boolean;
  existingReview: {
    id: string;
    rating: number;
    comment?: string | null;
    imageUrls?: string[];
  } | null;
};

export type SubmitReviewPayload = {
  rating: number;
  comment?: string;
  imageUrls?: string[];
};

export async function getReviewEligibility(slug: string) {
  return requestData<ReviewEligibility>(http.get(`/api/mobile/products/${slug}/reviews`));
}

export async function submitProductReview(slug: string, payload: SubmitReviewPayload) {
  return requestData<{ id: string }>(http.post(`/api/mobile/products/${slug}/reviews`, payload));
}
