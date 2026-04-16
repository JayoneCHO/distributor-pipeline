import { Lead, Communication } from "@prisma/client";

type Tone = "FORMAL" | "SOFT_BUSINESS" | "ACTIVE_SALES" | "SHORT_FOLLOW_UP";

export function summarizeTimeline(items: Pick<Communication, "summary" | "createdAt">[]) {
  if (!items.length) return "No activity yet.";
  return `Last ${Math.min(items.length, 3)} updates: ${items
    .slice(0, 3)
    .map((i) => `${i.summary} (${new Date(i.createdAt).toISOString().slice(0, 10)})`)
    .join(" | ")}`;
}

export function recommendNextAction(stage: string, daysSinceLastContact: number) {
  if (stage === "NEGOTIATION" && daysSinceLastContact >= 10) return "Schedule decision call and send revised commercial comparison.";
  if (stage === "QUOTED" && daysSinceLastContact >= 7) return "Send quotation follow-up with payment/lead-time clarification.";
  if (daysSinceLastContact >= 14) return "Final check-in and dormant qualification.";
  if (daysSinceLastContact >= 7) return "Active follow-up with clear CTA and available meeting slot.";
  return "Soft reminder with brochure/value reinforcement.";
}

export function generateDraft(input: {
  lead: Pick<Lead, "stage" | "sourceEvent"> & { contactName: string; companyName: string; country: string };
  useCase: string;
  channel: "email" | "whatsapp";
  tone: Tone;
  product: string;
}) {
  const opener =
    input.channel === "email"
      ? `Dear ${input.lead.contactName},\n\n`
      : `Hi ${input.lead.contactName}, `;

  const toneLine: Record<Tone, string> = {
    FORMAL: "I hope this message finds you well.",
    SOFT_BUSINESS: "Hope you are doing well.",
    ACTIVE_SALES: "Great to reconnect and move this opportunity forward.",
    SHORT_FOLLOW_UP: "Quick follow-up from my side.",
  };

  const core = `Regarding ${input.product}, this message is for ${input.useCase}. We can support your market in ${input.lead.country} with training, brochures, and structured quotation options.`;
  const close =
    input.channel === "email"
      ? "\n\nBest regards,\nOverseas Sales Director\nRUIKD"
      : " Please let me know your preferred next step.";

  return `${opener}${toneLine[input.tone]} ${core}${close}`;
}
