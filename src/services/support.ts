import { http, requestData } from "@/lib/http";

export type SupportTicket = {
  id: string;
  subject: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  createdAt: string;
  adminReply?: string | null;
};

export async function getSupportTickets() {
  return requestData<SupportTicket[]>(http.get("/api/mobile/support"));
}

export async function createSupportTicket(payload: {
  subject: string;
  description: string;
}) {
  return requestData<SupportTicket>(http.post("/api/mobile/support", payload));
}
