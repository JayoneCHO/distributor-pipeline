import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const quotes = await prisma.quotation.findMany({ include: { lead: { include: { company: true, contact: true } } }, orderBy: { issuedAt: "desc" } });
  const csv = [
    "quoteNo,company,contact,amount,currency,status,issuedAt,followupDue",
    ...quotes.map((q) => [q.quoteNo, q.lead.company.name, q.lead.contact.name, q.amount.toString(), q.currency, q.status, q.issuedAt.toISOString().slice(0, 10), q.followupDue?.toISOString().slice(0, 10) || ""].join(",")),
  ].join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=quotation-summary.csv" } });
}
