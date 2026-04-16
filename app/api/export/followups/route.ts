import { prisma } from "@/lib/prisma";
import { buildFollowupInsights } from "@/lib/followup";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get("format") || "csv";
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

  if (format === "xlsx") {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Followups");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=followups.xlsx",
      },
    });
  }

  const csv = [Object.keys(rows[0] || {}).join(","), ...rows.map((r) => Object.values(r).map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))].join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=followups.csv" } });
}
