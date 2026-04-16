import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PRODUCT_TAGS } from "@/lib/constants";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function PricesPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requireAuth();
  const editId = (await searchParams).edit;

  async function savePriceTemplate(formData: FormData) {
    "use server";
    await requireAuth();
    const payload = {
      product: String(formData.get("product")),
      scope: String(formData.get("scope")) as any,
      market: String(formData.get("market") || ""),
      basePrice: String(formData.get("basePrice")),
      promoPrice: formData.get("promoPrice") ? String(formData.get("promoPrice")) : null,
      includedAccessories: String(formData.get("includedAccessories")),
      optionalAccessories: String(formData.get("optionalAccessories") || ""),
      paymentTerms: String(formData.get("paymentTerms")),
      leadTime: String(formData.get("leadTime")),
      shippingTerms: String(formData.get("shippingTerms")),
      remarks: String(formData.get("remarks") || ""),
      marketNotes: String(formData.get("marketNotes") || ""),
    };

    const id = String(formData.get("id") || "");
    if (id) {
      await prisma.priceTemplate.update({ where: { id }, data: payload });
    } else {
      await prisma.priceTemplate.create({ data: payload });
    }
    redirect("/prices");
  }

  async function deletePriceTemplate(formData: FormData) {
    "use server";
    await requireAuth();
    const id = String(formData.get("id"));
    if (id) await prisma.priceTemplate.delete({ where: { id } });
    redirect("/prices");
  }

  const items = await prisma.priceTemplate.findMany({ orderBy: { updatedAt: "desc" } });
  const editItem = editId ? items.find((x) => x.id === editId) : undefined;

  return (
    <AppShell>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-slate-600">Manage global defaults, market overrides, and special offers for consistent quotation logic.</div>
        <div className="flex gap-2">
          <a className="rounded border px-2 py-1 text-sm" href="/api/export/quotations?format=csv">Quotation CSV</a>
          <a className="rounded border px-2 py-1 text-sm" href="/api/export/quotations?format=xlsx">Quotation XLSX</a>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>{editItem ? "Edit price template" : "Price template manager"}</CardHeader>
          <CardContent>
            <form action={savePriceTemplate} className="space-y-2">
              <input type="hidden" name="id" value={editItem?.id || ""} />
              <div><label>Product</label><select name="product" defaultValue={editItem?.product || PRODUCT_TAGS[0]}>{PRODUCT_TAGS.map((p) => <option key={p}>{p}</option>)}</select></div>
              <div><label>Scope</label><select name="scope" defaultValue={editItem?.scope || "GLOBAL_DEFAULT"}><option>GLOBAL_DEFAULT</option><option>MARKET_OVERRIDE</option><option>SPECIAL_OFFER</option></select></div>
              <div><label>Market (optional)</label><input name="market" defaultValue={editItem?.market || ""} /></div>
              <div><label>Base price</label><input name="basePrice" type="number" step="0.01" defaultValue={editItem?.basePrice.toString() || ""} required /></div>
              <div><label>Promo price</label><input name="promoPrice" type="number" step="0.01" defaultValue={editItem?.promoPrice?.toString() || ""} /></div>
              <div><label>Included accessories</label><textarea name="includedAccessories" rows={2} defaultValue={editItem?.includedAccessories || ""} required /></div>
              <div><label>Optional accessories</label><textarea name="optionalAccessories" rows={2} defaultValue={editItem?.optionalAccessories || ""} /></div>
              <div><label>Payment terms</label><input name="paymentTerms" defaultValue={editItem?.paymentTerms || ""} required /></div>
              <div><label>Lead time</label><input name="leadTime" defaultValue={editItem?.leadTime || ""} required /></div>
              <div><label>Shipping terms</label><input name="shippingTerms" defaultValue={editItem?.shippingTerms || ""} required /></div>
              <div><label>Remarks</label><textarea name="remarks" rows={2} defaultValue={editItem?.remarks || ""} /></div>
              <div><label>Market notes</label><textarea name="marketNotes" rows={2} defaultValue={editItem?.marketNotes || ""} /></div>
              <div className="flex gap-2">
                <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white">{editItem ? "Update price structure" : "Save price structure"}</button>
                {editItem ? <a href="/prices" className="rounded border px-3 py-2 text-sm">Cancel</a> : null}
              </div>
            </form>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>Global / market / special overrides</CardHeader>
          <CardContent>
            <table>
              <thead><tr><th>Product</th><th>Scope</th><th>Market</th><th>Base</th><th>Promo</th><th>Terms</th><th>Actions</th></tr></thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.product}</td>
                    <td>{i.scope}</td>
                    <td>{i.market || "-"}</td>
                    <td>{i.basePrice.toString()}</td>
                    <td>{i.promoPrice?.toString() || "-"}</td>
                    <td className="text-xs">{i.paymentTerms} / {i.shippingTerms}</td>
                    <td>
                      <div className="flex gap-1">
                        <a href={`/prices?edit=${i.id}`} className="rounded border px-2 py-1 text-xs">Edit</a>
                        <form action={deletePriceTemplate}>
                          <input type="hidden" name="id" value={i.id} />
                          <button className="rounded border px-2 py-1 text-xs">Delete</button>
                        </form>
                      </div>
                    </td>
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
