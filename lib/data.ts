import { prisma } from "@/lib/prisma";
import { buildFollowupInsights } from "@/lib/followup";

export async function getDashboardData() {
  const leads = await prisma.lead.findMany({
    include: {
      company: true,
      contact: true,
      products: true,
      communications: { orderBy: { createdAt: "desc" }, take: 5 },
      quotations: { orderBy: { issuedAt: "desc" }, take: 1 },
    },
  });

  const followups = buildFollowupInsights(leads as any);
  const leadsByStage = leads.reduce<Record<string, number>>((acc: Record<string, number>, lead) => {
    acc[lead.stage] = (acc[lead.stage] || 0) + 1;
    return acc;
  }, {});

  const leadsByCountry = leads.reduce<Record<string, number>>((acc: Record<string, number>, lead) => {
    acc[lead.company.country] = (acc[lead.company.country] || 0) + 1;
    return acc;
  }, {});

  const productCounter: Record<string, number> = {};
  leads.forEach((lead) => lead.products.forEach((p) => (productCounter[p.product] = (productCounter[p.product] || 0) + 1)));

  const recentActivities = await prisma.communication.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { lead: { include: { company: true } } },
  });

  return {
    followups,
    leadsByStage,
    leadsByCountry,
    topProducts: Object.entries(productCounter)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5),
    recentActivities,
  };
}
