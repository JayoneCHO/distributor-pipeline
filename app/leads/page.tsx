import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PRODUCT_TAGS, STAGE_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAuth();
  const q = (await searchParams).q || "";

  async function createLead(formData: FormData) {
    "use server";
    await requireAuth();
    const companyId = String(formData.get("companyId"));
    const contactId = String(formData.get("contactId"));
    const products = formData.getAll("products").map(String);
    const stage = String(formData.get("stage"));

    const lead = await prisma.lead.create({
      data: {
        companyId,
        contactId,
        stage: stage as any,
        sourceEvent: String(formData.get("sourceEvent") || ""),
        notes: String(formData.get("notes") || ""),
        internalComments: String(formData.get("internalComments") || ""),
        nextFollowupDate: formData.get("nextFollowupDate") ? new Date(String(formData.get("nextFollowupDate"))) : null,
      },
    });

    if (products.length) {
      await prisma.leadProduct.createMany({ data: products.map((p) => ({ leadId: lead.id, product: p })) });
    }

    redirect(`/leads/${lead.id}`);
  }

  const companies = await prisma.company.findMany({ include: { contacts: true }, orderBy: { name: "asc" } });
  const leads = await prisma.lead.findMany({
    where: q
      ? {
          OR: [
            { company: { name: { contains: q, mode: "insensitive" } } },
            { contact: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : undefined,
    include: { company: true, contact: true, products: true, communications: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <AppShell>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>Create lead</CardHeader>
          <CardContent>
            <form action={createLead} className="space-y-2">
              <div><label>Company</label><select name="companyId">{companies.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.country})</option>)}</select></div>
              <div><label>Contact</label><select name="contactId">{companies.flatMap((c) => c.contacts).map((ct) => <option key={ct.id} value={ct.id}>{ct.name} - {ct.email}</option>)}</select></div>
              <div><label>Stage</label><select name="stage">{Object.keys(STAGE_LABELS).map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}</select></div>
              <div><label>Products (multi-select)</label><select multiple name="products">{PRODUCT_TAGS.map((p) => <option key={p}>{p}</option>)}</select></div>
              <div><label>Source event</label><input name="sourceEvent" placeholder="KIMES / Dubai Derma" /></div>
              <div><label>Next follow-up date</label><input name="nextFollowupDate" type="date" /></div>
              <div><label>Notes</label><textarea name="notes" rows={2} /></div>
              <div><label>Internal comments</label><textarea name="internalComments" rows={2} /></div>
              <Button type="submit">Save lead</Button>
            </form>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <span>Leads list</span>
              <form className="flex gap-2" method="get">
                <input name="q" defaultValue={q} placeholder="Search company/contact" className="w-56" />
                <Button variant="outline" size="sm">Search</Button>
              </form>
            </div>
          </CardHeader>
          <CardContent>
            <table>
              <thead><tr><th>Company</th><th>Contact</th><th>Stage</th><th>Products</th><th>Latest</th><th></th></tr></thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>{lead.company.name}<div className="text-xs text-slate-500">{lead.company.country}</div></td>
                    <td>{lead.contact.name}</td>
                    <td>{STAGE_LABELS[lead.stage]}</td>
                    <td>{lead.products.map((p) => p.product).join(", ")}</td>
                    <td className="text-xs">{lead.communications[0]?.summary || "No log"}</td>
                    <td><Link className="text-blue-600" href={`/leads/${lead.id}`}>Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
