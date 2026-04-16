export const PRODUCT_TAGS = ["PICO RU", "REBEAM", "MIWAVE", "FONS SVR", "LAMIS XL"] as const;

export const STAGE_LABELS: Record<string, string> = {
  NEW_LEAD: "New Lead",
  CONTACTED: "Contacted",
  WAITING_REPLY: "Waiting Reply",
  NEGOTIATION: "Negotiation",
  QUOTED: "Quoted",
  CLOSED_WON: "Closed Won",
  CLOSED_LOST: "Closed Lost",
  DORMANT: "Dormant",
};

export const TONES = ["FORMAL", "SOFT_BUSINESS", "ACTIVE_SALES", "SHORT_FOLLOW_UP"] as const;
export const USE_CASES = [
  "exhibition follow-up",
  "brochure sending",
  "price indication",
  "quotation follow-up",
  "no-reply reminder",
  "distributor discussion",
  "reactivation of dormant lead",
  "technical response follow-up",
] as const;
