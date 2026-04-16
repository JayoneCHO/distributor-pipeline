import { Lead, Communication } from "@prisma/client";
import { recommendNextAction, summarizeTimeline } from "@/lib/ai-service";

export type FollowupBucket =
  | "3-day no-reply"
  | "7-day no-reply"
  | "14-day no-reply"
  | "stalled negotiation"
  | "stalled quotation"
  | "dormant reactivation";

export function buildFollowupInsights(leads: (Lead & { communications: Communication[]; company: { name: string; country: string }; contact: { name: string }; products: { product: string }[] })[]) {
  const now = new Date().getTime();

  return leads
    .map((lead) => {
      const last = [...lead.communications].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];
      const days = last ? Math.floor((now - +new Date(last.createdAt)) / 86400000) : 999;

      const buckets: FollowupBucket[] = [];
      if (lead.stage === "DORMANT") buckets.push("dormant reactivation");
      if (days >= 3) buckets.push("3-day no-reply");
      if (days >= 7) buckets.push("7-day no-reply");
      if (days >= 14) buckets.push("14-day no-reply");
      if (lead.stage === "NEGOTIATION" && days >= 10) buckets.push("stalled negotiation");
      if (lead.stage === "QUOTED" && days >= 7) buckets.push("stalled quotation");

      return {
        lead,
        days,
        buckets,
        latestSummary: last?.summary || "No communication logged",
        timelineSummary: summarizeTimeline(lead.communications),
        recommendedNextAction: recommendNextAction(lead.stage, days),
      };
    })
    .filter((x) => x.buckets.length > 0);
}
