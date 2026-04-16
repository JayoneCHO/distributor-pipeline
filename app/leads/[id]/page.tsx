import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PRODUCT_TAGS, STAGE_LABELS, TONES, USE_CASES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { generateDraft } from "@/lib/ai-service";
import { redirect } from "next/navigation";

const commTypes = ["EMAIL", "WHATSAPP", "MEETING", "INTERNAL_NOTE", "QUOTATION_NOTE", "BROCHURE_SENT", "TECHNICAL_DISCUSSION"] as const;

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;

  async function logCommunication(formData: FormData) {
    "use server";
    await requireAuth();
    await prisma.communication.create({
      data: {
        leadId: id,
        type: String(formData.get("type")) as any,
        title: String(formData.get("title")),
        summary: String(formData.get("summary")),
        content: String(formData.get("content")),
        createdById: (await prisma.user.findFirstOrThrow()).id,
      },
    });
    redirect(`/leads/${id}`);
  }

  async function quickUpdate(formData: FormData) {
    "use server";
    await requireAuth();
    await prisma.lead.update({
      where: { id },
      data: {
        stage: String(formData.get("stage")) as any,
        nextFollowupDate: formData.get("nextFollowupDate") ? new Date(String(formData.get("nextFollowupDate"))) : null,
        latestOfferedPrice: formData.get("latestOfferedPrice") ? String(formData.get("latestOfferedPrice")) : null,
        notes: String(formData.get("notes") || ""),
        internalComments: String(formData.get("internalComments") || ""),
      },
    });
    redirect(`/leads/${id}`);
  }

  const lead = await prisma.lead.findUniqueOrThrow({
    where: { id },
    include: { company: true, contact: true, products: true, communications: { orderBy: { createdAt: "desc" } }, quotations: { orderBy: { issuedAt: "desc" }, take: 1 } },
  });

  const draft = generateDraft({
    lead: { stage: lead.stage, sourceEvent: lead.sourceEvent, contactName: lead.contact.name, companyName: lead.company.name, country: lead.company.country },
    useCase: "quotation follow-up",
    channel: "email",
    tone: "SOFT_BUSINESS",
    product: lead.products[0]?.product || PRODUCT_TAGS[0],
  });

  return (
    <AppShell>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xl font-semibold">{lead.company.name}</div>
                <div className="text-sm text-slate-600">{lead.contact.name} · {lead.contact.title || "-"} · {lead.contact.email}</div>
                <div className="text-sm text-slate-500">{lead.company.country} · {lead.company.companyType}</div>
              </div>
              <Badge>{STAGE_LABELS[lead.stage]}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap gap-1">{lead.products.map((p) => <Badge key={p.id}>{p.product}</Badge>)}</div>
            <div className="grid gap-2 md:grid-cols-2 text-sm">
              <div><b>Latest offered price:</b> {lead.latestOfferedPrice?.toString() || "-"}</div>
              <div><b>Next follow-up date:</b> {formatDate(lead.nextFollowupDate)}</div>
            </div>
            <div className="mt-3 text-sm"><b>Quotation note:</b> {lead.quotations[0]?.notes || "No quotation note"}</div>

            <div className="mt-4">
              <h3 className="mb-2 font-semibold">Communication timeline</h3>
              <div className="space-y-2">
                {lead.communications.map((c) => (
                  <div key={c.id} className="rounded border p-2">
                    <div className="text-xs text-slate-500">{formatDate(c.createdAt)} · {c.type}</div>
                    <div className="font-medium">{c.title}</div>
                    <div className="text-sm text-slate-600">{c.summary}</div>
                    <div className="mt-1 text-sm">{c.content}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>Quick stage + note update</CardHeader>
            <CardContent>
              <form action={quickUpdate} className="space-y-2">
                <div><label>Stage</label><select name="stage" defaultValue={lead.stage}>{Object.keys(STAGE_LABELS).map((s) => <option key={s}>{s}</option>)}</select></div>
                <div><label>Latest offered price</label><input name="latestOfferedPrice" type="number" step="0.01" defaultValue={lead.latestOfferedPrice?.toString() || ""}/></div>
                <div><label>Next follow-up date</label><input name="nextFollowupDate" type="date" defaultValue={lead.nextFollowupDate ? new Date(lead.nextFollowupDate).toISOString().slice(0,10) : ""}/></div>
                <div><label>Notes</label><textarea name="notes" defaultValue={lead.notes || ""} rows={2}/></div>
                <div><label>Internal comments</label><textarea name="internalComments" defaultValue={lead.internalComments || ""} rows={2}/></div>
                <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Update lead</button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>Quick communication entry</CardHeader>
            <CardContent>
              <form action={logCommunication} className="space-y-2">
                <div><label>Type</label><select name="type">{commTypes.map((t) => <option key={t}>{t}</option>)}</select></div>
                <div><label>Title</label><input name="title" required/></div>
                <div><label>Short summary</label><input name="summary" required/></div>
                <div><label>Content</label><textarea name="content" rows={3} required/></div>
                <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Add timeline item</button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>Quick draft generation (editable)</CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="rounded border p-2 whitespace-pre-wrap">{draft}</div>
                <div className="text-xs text-slate-500">Use Templates page for full use-case and tone controls ({USE_CASES.length} use-cases, {TONES.length} tones).</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
