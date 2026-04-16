import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PRODUCT_TAGS, TONES, USE_CASES } from "@/lib/constants";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TemplateGenerator } from "@/components/forms/template-generator";
import { redirect } from "next/navigation";

export default async function TemplatesPage() {
  await requireAuth();

  async function saveTemplate(formData: FormData) {
    "use server";
    await requireAuth();
    await prisma.messageTemplate.create({
      data: {
        name: String(formData.get("name")),
        useCase: String(formData.get("useCase")),
        channel: String(formData.get("channel")),
        tone: String(formData.get("tone")) as any,
        product: String(formData.get("product") || ""),
        content: String(formData.get("content")),
      },
    });
    redirect("/templates");
  }

  const leads = await prisma.lead.findMany({ include: { company: true, contact: true, products: true }, orderBy: { updatedAt: "desc" }, take: 40 });
  const templates = await prisma.messageTemplate.findMany({ orderBy: { createdAt: "desc" } });
  const leadOptions = leads.map((lead) => ({
    id: lead.id,
    companyName: lead.company.name,
    contactName: lead.contact.name,
    country: lead.company.country,
    products: lead.products.map((p) => p.product),
  }));

  return (
    <AppShell>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>Draft generator (explicit Generate + save workflow)</CardHeader>
          <CardContent>
            <TemplateGenerator leads={leadOptions} useCases={[...USE_CASES]} tones={[...TONES]} products={[...PRODUCT_TAGS]} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>Save reusable template</CardHeader>
          <CardContent>
            <form action={saveTemplate} className="space-y-2">
              <div><label>Name</label><input name="name" required /></div>
              <div><label>Use case</label><select name="useCase">{USE_CASES.map((u) => <option key={u}>{u}</option>)}</select></div>
              <div><label>Channel</label><select name="channel"><option>email</option><option>whatsapp</option></select></div>
              <div><label>Tone</label><select name="tone">{TONES.map((t) => <option key={t}>{t}</option>)}</select></div>
              <div><label>Product</label><select name="product"><option value="">Any</option>{PRODUCT_TAGS.map((p) => <option key={p}>{p}</option>)}</select></div>
              <div><label>Template content</label><textarea name="content" rows={6} placeholder="Use placeholders like {{contactName}}, {{companyName}}, {{product}}" required /></div>
              <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Save template</button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>Saved templates</CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {templates.map((t) => (
                <div key={t.id} className="rounded border p-2">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-slate-500">{t.useCase} · {t.channel} · {t.tone}</div>
                  <div className="mt-1 line-clamp-3">{t.content}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
