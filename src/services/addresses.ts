import { http, requestData } from "@/lib/http";
import type { Address } from "@/types/api";

export type AddressPayload = {
  fullName: string;
  phone: string;
  addressLine1: string;
  streetLocality?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
  addressType?: "HOME" | "WORK" | "OTHER";
  addressLabel?: string;
};

export async function getAddresses() {
  return requestData<Address[]>(http.get("/api/mobile/customer/address"));
}

export async function createAddress(payload: AddressPayload) {
  return requestData<Address>(http.post("/api/mobile/customer/address", payload));
}

export async function updateAddress(id: string, payload: Partial<AddressPayload>) {
  return requestData<Address>(http.patch(`/api/mobile/customer/address/${id}`, payload));
}

export async function deleteAddress(id: string) {
  return requestData<{ deleted: boolean }>(http.delete(`/api/mobile/customer/address/${id}`));
}
