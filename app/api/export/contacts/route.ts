import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get("format") || "csv";
  const contacts = await prisma.contact.findMany({ include: { company: true } });
  const rows = contacts.map((c) => ({ company: c.company.name, country: c.company.country, name: c.name, title: c.title, email: c.email, whatsapp: c.whatsapp }));
  if (format === "xlsx") {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Contacts");
    return new NextResponse(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
  }
  const csv = [Object.keys(rows[0] || {}).join(","), ...rows.map((r) => Object.values(r).join(","))].join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv" } });
}
