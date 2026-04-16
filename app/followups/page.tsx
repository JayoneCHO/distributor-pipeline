import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildFollowupInsights, FollowupBucket } from "@/lib/followup";
import { STAGE_LABELS } from "@/lib/constants";

const buckets: FollowupBucket[] = [
  "3-day no-reply",
  "7-day no-reply",
  "14-day no-reply",
  "stalled negotiation",
  "stalled quotation",
  "dormant reactivation",
];

export default async function FollowupPage() {
  await requireAuth();
  const leads = await prisma.lead.findMany({ include: { company: true, contact: true, products: true, communications: true } });
  const rows = buildFollowupInsights(leads as any);

  return (
    <AppShell>
      <div className="mb-3 flex justify-end gap-2">
        <a className="rounded border px-2 py-1 text-sm" href="/api/export/followups?format=csv">Follow-up CSV</a>
        <a className="rounded border px-2 py-1 text-sm" href="/api/export/followups?format=xlsx">Follow-up XLSX</a>
      </div>
      <div className="space-y-4">
        {buckets.map((bucket) => {
          const items = rows.filter((r) => r.buckets.includes(bucket));
          return (
            <Card key={bucket}>
              <CardHeader>{bucket} ({items.length})</CardHeader>
              <CardContent>
                <div className="grid gap-2 lg:grid-cols-2">
                  {items.map((item) => (
                    <div key={`${bucket}-${item.lead.id}`} className="rounded border p-3 text-sm">
                      <div className="font-semibold">{item.lead.company.name} · {item.lead.contact.name}</div>
                      <div className="text-slate-500">{item.lead.company.country} · {STAGE_LABELS[item.lead.stage]}</div>
                      <div><b>Products:</b> {item.lead.products.map((p) => p.product).join(", ")}</div>
                      <div><b>Latest summary:</b> {item.latestSummary}</div>
                      <div><b>Recommended next action:</b> {item.recommendedNextAction}</div>
                      <div className="mt-2 flex gap-2">
                        <Link href={`/templates?leadId=${item.lead.id}`} className="rounded border px-2 py-1">Generate Draft</Link>
                        <Link href={`/leads/${item.lead.id}`} className="rounded border px-2 py-1">Update Stage</Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
