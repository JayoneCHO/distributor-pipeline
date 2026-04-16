import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";
import { STAGE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  await requireAuth();
  const data = await getDashboardData();

  const todayFollowups = data.followups.filter((f) => f.lead.nextFollowupDate && formatDate(f.lead.nextFollowupDate) === formatDate(new Date())).length;
  const negotiationAlerts = data.followups.filter((f) => f.buckets.includes("stalled negotiation")).length;
  const quoteAlerts = data.followups.filter((f) => f.buckets.includes("stalled quotation")).length;

  return (
    <AppShell>
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader>Overdue follow-ups</CardHeader><CardContent className="text-2xl font-semibold">{data.followups.length}</CardContent></Card>
        <Card><CardHeader>Today’s scheduled follow-ups</CardHeader><CardContent className="text-2xl font-semibold">{todayFollowups}</CardContent></Card>
        <Card><CardHeader>Negotiation-stalled alerts</CardHeader><CardContent className="text-2xl font-semibold">{negotiationAlerts}</CardContent></Card>
        <Card><CardHeader>Quotation follow-up alerts</CardHeader><CardContent className="text-2xl font-semibold">{quoteAlerts}</CardContent></Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>Leads by stage</CardHeader>
          <CardContent>{Object.entries(data.leadsByStage).map(([stage, count]) => <div key={stage} className="mb-1 flex justify-between"><span>{STAGE_LABELS[stage]}</span><Badge>{count}</Badge></div>)}</CardContent>
        </Card>
        <Card>
          <CardHeader>Leads by country</CardHeader>
          <CardContent>{Object.entries(data.leadsByCountry).map(([c, count]) => <div key={c} className="mb-1 flex justify-between"><span>{c}</span><Badge>{count}</Badge></div>)}</CardContent>
        </Card>
        <Card>
          <CardHeader>Top interested products</CardHeader>
          <CardContent>{data.topProducts.map(([p, count]) => <div key={p} className="mb-1 flex justify-between"><span>{p}</span><Badge>{count}</Badge></div>)}</CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>Recent activities</CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recentActivities.map((a) => (
                <div key={a.id} className="rounded border p-2">
                  <div className="text-xs text-slate-500">{formatDate(a.createdAt)} · {a.type}</div>
                  <div className="font-medium">{a.lead.company.name} — {a.title}</div>
                  <div className="text-sm text-slate-600">{a.summary}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>Follow-up and quote alerts</CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.followups.slice(0, 10).map((f) => (
                <div key={f.lead.id} className="rounded border p-2">
                  <div className="font-medium">{f.lead.company.name} ({f.lead.company.country})</div>
                  <div className="text-xs text-slate-500">{f.buckets.join(" · ")}</div>
                  <div className="text-sm">{f.recommendedNextAction}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
