import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PRODUCT_TAGS } from "@/lib/constants";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function PricesPage() {
  await requireAuth();

  async function savePriceTemplate(formData: FormData) {
    "use server";
    await requireAuth();
    await prisma.priceTemplate.create({
      data: {
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
      },
    });
    redirect("/prices");
  }

  const items = await prisma.priceTemplate.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <AppShell>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>Price template manager</CardHeader>
          <CardContent>
            <form action={savePriceTemplate} className="space-y-2">
              <div><label>Product</label><select name="product">{PRODUCT_TAGS.map((p) => <option key={p}>{p}</option>)}</select></div>
              <div><label>Scope</label><select name="scope"><option>GLOBAL_DEFAULT</option><option>MARKET_OVERRIDE</option><option>SPECIAL_OFFER</option></select></div>
              <div><label>Market (optional)</label><input name="market" /></div>
              <div><label>Base price</label><input name="basePrice" type="number" step="0.01" required /></div>
              <div><label>Promo price</label><input name="promoPrice" type="number" step="0.01" /></div>
              <div><label>Included accessories</label><textarea name="includedAccessories" rows={2} required /></div>
              <div><label>Optional accessories</label><textarea name="optionalAccessories" rows={2} /></div>
              <div><label>Payment terms</label><input name="paymentTerms" required /></div>
              <div><label>Lead time</label><input name="leadTime" required /></div>
              <div><label>Shipping terms</label><input name="shippingTerms" required /></div>
              <div><label>Remarks</label><textarea name="remarks" rows={2} /></div>
              <div><label>Market notes</label><textarea name="marketNotes" rows={2} /></div>
              <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Save price structure</button>
            </form>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>Global / market / special overrides</CardHeader>
          <CardContent>
            <table>
              <thead><tr><th>Product</th><th>Scope</th><th>Market</th><th>Base</th><th>Promo</th><th>Terms</th></tr></thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.product}</td>
                    <td>{i.scope}</td>
                    <td>{i.market || "-"}</td>
                    <td>{i.basePrice.toString()}</td>
                    <td>{i.promoPrice?.toString() || "-"}</td>
                    <td className="text-xs">{i.paymentTerms} / {i.shippingTerms}</td>
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
