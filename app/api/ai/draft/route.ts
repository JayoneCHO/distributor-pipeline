import { generateDraft } from "@/lib/ai-service";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const lead = await prisma.lead.findUnique({ where: { id: body.leadId }, include: { company: true, contact: true, products: true } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const draft = generateDraft({
    lead: { stage: lead.stage, sourceEvent: lead.sourceEvent, contactName: lead.contact.name, companyName: lead.company.name, country: lead.company.country },
    useCase: body.useCase,
    channel: body.channel,
    tone: body.tone,
    product: body.product || lead.products[0]?.product,
  });

  return NextResponse.json({ draft });
}
