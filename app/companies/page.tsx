import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

const companyTypes = ["DISTRIBUTOR", "CLINIC", "DEALER", "HOSPITAL", "END_USER"] as const;

export default async function CompaniesPage() {
  await requireAuth();

  async function createCompany(formData: FormData) {
    "use server";
    await requireAuth();
    await prisma.company.create({
      data: {
        name: String(formData.get("name")),
        country: String(formData.get("country")),
        companyType: String(formData.get("companyType")) as any,
        website: String(formData.get("website") || ""),
        sourceEvent: String(formData.get("sourceEvent") || ""),
        notes: String(formData.get("notes") || ""),
        internalComments: String(formData.get("internalComments") || ""),
      },
    });
    redirect("/companies");
  }

  async function createContact(formData: FormData) {
    "use server";
    await requireAuth();
    await prisma.contact.create({
      data: {
        companyId: String(formData.get("companyId")),
        name: String(formData.get("name")),
        title: String(formData.get("title") || ""),
        email: String(formData.get("email")),
        whatsapp: String(formData.get("whatsapp") || ""),
      },
    });
    redirect("/companies");
  }

  const companies = await prisma.company.findMany({ include: { contacts: true }, orderBy: { name: "asc" } });

  return (
    <AppShell>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>Add company</CardHeader>
          <CardContent>
            <form action={createCompany} className="space-y-2">
              <div><label>Company name</label><input name="name" required /></div>
              <div><label>Country</label><input name="country" required /></div>
              <div><label>Company type</label><select name="companyType">{companyTypes.map((t) => <option key={t}>{t}</option>)}</select></div>
              <div><label>Website</label><input name="website" /></div>
              <div><label>Source event</label><input name="sourceEvent" /></div>
              <div><label>Notes</label><textarea name="notes" rows={2}/></div>
              <div><label>Internal comments</label><textarea name="internalComments" rows={2}/></div>
              <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Save company</button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>Add contact</CardHeader>
          <CardContent>
            <form action={createContact} className="space-y-2">
              <div><label>Company</label><select name="companyId">{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label>Name</label><input name="name" required /></div>
              <div><label>Title</label><input name="title" /></div>
              <div><label>Email</label><input name="email" type="email" required /></div>
              <div><label>WhatsApp</label><input name="whatsapp" /></div>
              <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Save contact</button>
            </form>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1">
          <CardHeader>Companies & contacts</CardHeader>
          <CardContent>
            <div className="max-h-[520px] space-y-2 overflow-auto">
              {companies.map((c) => (
                <div key={c.id} className="rounded border p-2">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-slate-500">{c.country} · {c.companyType}</div>
                  <ul className="mt-1 list-disc pl-4 text-sm">
                    {c.contacts.map((ct) => <li key={ct.id}>{ct.name} ({ct.email})</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
