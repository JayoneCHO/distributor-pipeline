import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get("format") || "csv";
  const quotes = await prisma.quotation.findMany({ include: { lead: { include: { company: true, contact: true } } }, orderBy: { issuedAt: "desc" } });
  const rows = quotes.map((q) => ({
    quoteNo: q.quoteNo,
    company: q.lead.company.name,
    contact: q.lead.contact.name,
    amount: q.amount.toString(),
    currency: q.currency,
    status: q.status,
    issuedAt: q.issuedAt.toISOString().slice(0, 10),
    followupDue: q.followupDue?.toISOString().slice(0, 10) || "",
  }));

  if (format === "xlsx") {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Quotations");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=quotation-summary.xlsx",
      },
    });
  }

  const csv = [
    "quoteNo,company,contact,amount,currency,status,issuedAt,followupDue",
    ...rows.map((q) => [q.quoteNo, q.company, q.contact, q.amount, q.currency, q.status, q.issuedAt, q.followupDue].join(",")),
  ].join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=quotation-summary.csv" } });
}
