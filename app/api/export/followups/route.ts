import { prisma } from "@/lib/prisma";
import { buildFollowupInsights } from "@/lib/followup";
import { NextResponse } from "next/server";

export async function GET() {
  const leads = await prisma.lead.findMany({ include: { company: true, contact: true, products: true, communications: true } });
  const rows = buildFollowupInsights(leads as any).map((i) => ({
    company: i.lead.company.name,
    contact: i.lead.contact.name,
    country: i.lead.company.country,
    stage: i.lead.stage,
    products: i.lead.products.map((p) => p.product).join("; "),
    buckets: i.buckets.join("; "),
    recommendation: i.recommendedNextAction,
  }));
  const csv = [Object.keys(rows[0] || {}).join(","), ...rows.map((r) => Object.values(r).map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))].join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=followups.csv" } });
}
