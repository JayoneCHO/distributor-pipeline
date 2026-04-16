import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get("format") || "csv";
  const leads = await prisma.lead.findMany({ include: { company: true, contact: true, products: true } });
  const rows = leads.map((l) => ({
    company: l.company.name,
    country: l.company.country,
    contact: l.contact.name,
    email: l.contact.email,
    whatsapp: l.contact.whatsapp,
    stage: l.stage,
    products: l.products.map((p) => p.product).join("; "),
    nextFollowup: l.nextFollowupDate?.toISOString().slice(0, 10) || "",
  }));

  if (format === "xlsx") {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": "attachment; filename=leads.xlsx" } });
  }

  const csv = [Object.keys(rows[0] || {}).join(","), ...rows.map((r) => Object.values(r).map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=leads.csv" } });
}
