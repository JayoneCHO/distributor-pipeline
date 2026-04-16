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
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=contacts.xlsx",
      },
    });
  }
  const csv = [Object.keys(rows[0] || {}).join(","), ...rows.map((r) => Object.values(r).map((v) => `\"${String(v ?? "").replaceAll('\"', '\"\"')}\"`).join(","))].join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=contacts.csv" } });
}
