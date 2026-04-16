import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const { kind, leadId, useCase, tone, channel, product, content, name } = body;
  if (kind !== "template" && kind !== "draft") {
    return NextResponse.json({ error: "kind must be 'template' or 'draft'." }, { status: 400 });
  }

  if (typeof channel !== "string" || (channel !== "email" && channel !== "whatsapp")) {
    return NextResponse.json({ error: "channel must be 'email' or 'whatsapp'." }, { status: 400 });
  }

  if (typeof tone !== "string" || !["FORMAL", "SOFT_BUSINESS", "ACTIVE_SALES", "SHORT_FOLLOW_UP"].includes(tone)) {
    return NextResponse.json({ error: "Invalid tone value." }, { status: 400 });
  }

  if (!content || !String(content).trim()) {
    return NextResponse.json({ error: "Generated content is required." }, { status: 400 });
  }

  if (kind === "template") {
    const template = await prisma.messageTemplate.create({
      data: {
        name: name || `Generated ${useCase}`,
        useCase: useCase || "general follow-up",
        channel: channel || "email",
        tone: tone || "SOFT_BUSINESS",
        product: product || null,
        content,
      },
    });
    return NextResponse.json({ ok: true, id: template.id, kind });
  }

  if (kind === "draft") {
    if (!leadId) return NextResponse.json({ error: "leadId is required for draft save." }, { status: 400 });
    const admin = await prisma.user.findFirst();
    if (!admin) return NextResponse.json({ error: "Admin user not found." }, { status: 400 });

    const draft = await prisma.communication.create({
      data: {
        leadId,
        type: "INTERNAL_NOTE",
        title: `Draft: ${useCase || "follow-up"} (${channel || "email"})`,
        summary: String(content).slice(0, 120),
        content,
        createdById: admin.id,
      },
    });
    return NextResponse.json({ ok: true, id: draft.id, kind });
  }

  return NextResponse.json({ error: "Unsupported save kind." }, { status: 400 });
}
