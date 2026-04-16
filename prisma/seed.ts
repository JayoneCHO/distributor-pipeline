import { PrismaClient, CompanyType, LeadStage, CommunicationType, DraftTone, PriceScope } from "@prisma/client";
import { createHash } from "crypto";

const prisma = new PrismaClient();

const products = ["PICO RU", "REBEAM", "MIWAVE", "FONS SVR", "LAMIS XL"];

function hashPassword(v: string) {
  return createHash("sha256").update(v).digest("hex");
}

async function main() {
  await prisma.attachment.deleteMany();
  await prisma.communication.deleteMany();
  await prisma.leadProduct.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  await prisma.priceTemplate.deleteMany();
  await prisma.messageTemplate.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      email: process.env.ADMIN_EMAIL || "admin@ruikd.local",
      passwordHash: hashPassword(process.env.ADMIN_PASSWORD || "admin1234"),
      name: "Overseas Sales Director",
    },
  });

  const companiesData = [
    ["Aster Aesthetic Trading", "UAE", CompanyType.DISTRIBUTOR],
    ["NordCare Skin Clinic Group", "Sweden", CompanyType.CLINIC],
    ["Lumina Beauty Devices", "Brazil", CompanyType.DEALER],
    ["Helios MedTech Supply", "Greece", CompanyType.DISTRIBUTOR],
    ["NovaDerma Hospital Network", "Mexico", CompanyType.HOSPITAL],
    ["Pearl Laser Center", "Thailand", CompanyType.CLINIC],
    ["Vita Estetica Solutions", "Italy", CompanyType.DEALER],
    ["Sahara Clinical Partners", "Egypt", CompanyType.DISTRIBUTOR],
    ["Meridian Skin Institute", "Vietnam", CompanyType.END_USER],
    ["Baltic Aesthetic Systems", "Poland", CompanyType.DISTRIBUTOR],
  ] as const;

  const companies = [] as any[];
  for (const [name, country, companyType] of companiesData) {
    companies.push(
      await prisma.company.create({
        data: {
          name,
          country,
          companyType,
          website: `https://${name.toLowerCase().replace(/\s+/g, "-")}.example.com`,
          sourceEvent: Math.random() > 0.5 ? "KIMES" : "Dubai Derma",
          notes: "Interested in KOL support and training package.",
          internalComments: "Prioritize response within 24h after brochure sending.",
        },
      }),
    );
  }

  const contacts = [] as any[];
  const contactNames = [
    ["Rania Khalid", "Procurement Manager"],
    ["Dr. Erik Nyström", "Medical Director"],
    ["Fernanda Costa", "Regional Sales Head"],
    ["Nikos Petrou", "Business Development Manager"],
    ["Dr. Elisa Romero", "Dermatology Lead"],
    ["Chatchai Arun", "Clinic Operations Lead"],
    ["Marco Bianchi", "Purchasing Director"],
    ["Heba Nasser", "Distribution Manager"],
    ["Nguyen Thi Lan", "Clinical Coordinator"],
    ["Marek Zielinski", "General Manager"],
    ["Laura Gomez", "Product Specialist"],
    ["Sophie Martin", "Key Account Manager"],
  ];

  for (let i = 0; i < 12; i++) {
    const company = companies[i % companies.length];
    const [name, title] = contactNames[i];
    contacts.push(
      await prisma.contact.create({
        data: {
          companyId: company.id,
          name,
          title,
          email: `${name.toLowerCase().replace(/[^a-z]/g, ".").replace(/\.+/g, ".")}@${company.name
            .toLowerCase()
            .replace(/\s+/g, "")}.com`,
          whatsapp: `+${9700000000 + i}`,
        },
      }),
    );
  }

  const stages = [
    LeadStage.NEW_LEAD,
    LeadStage.CONTACTED,
    LeadStage.WAITING_REPLY,
    LeadStage.NEGOTIATION,
    LeadStage.QUOTED,
    LeadStage.CLOSED_WON,
    LeadStage.CLOSED_LOST,
    LeadStage.DORMANT,
  ];

  const now = new Date();
  const leads = [] as any[];
  for (let i = 0; i < 20; i++) {
    const company = companies[i % companies.length];
    const contact = contacts[i % contacts.length];
    const stage = stages[i % stages.length];
    const lead = await prisma.lead.create({
      data: {
        companyId: company.id,
        contactId: contact.id,
        stage,
        sourceEvent: i % 2 === 0 ? "KIMES" : "Dubai Derma",
        notes: "Needs distributor margin model and clinical data pack.",
        internalComments: "Check regulatory docs before final quote.",
        nextFollowupDate: new Date(now.getTime() + ((i % 7) - 3) * 86400000),
        latestOfferedPrice: 15000 + i * 350,
      },
    });

    await prisma.leadProduct.createMany({
      data: [
        { leadId: lead.id, product: products[i % products.length] },
        { leadId: lead.id, product: products[(i + 2) % products.length] },
      ],
      skipDuplicates: true,
    });

    const commAt = new Date(now.getTime() - ((i % 16) + 1) * 86400000);
    await prisma.communication.create({
      data: {
        leadId: lead.id,
        type: i % 3 === 0 ? CommunicationType.EMAIL : CommunicationType.WHATSAPP,
        title: i % 2 === 0 ? "Initial follow-up" : "Pricing discussion",
        summary: i % 2 === 0 ? "Brochure sent, waiting for feedback." : "Requested revised quote with handpiece option.",
        content:
          "Discussed product positioning, training support, and initial commercial terms. Next action pending customer confirmation.",
        createdById: admin.id,
        createdAt: commAt,
      },
    });

    if (stage === LeadStage.QUOTED || stage === LeadStage.NEGOTIATION) {
      await prisma.quotation.create({
        data: {
          leadId: lead.id,
          quoteNo: `Q-2026-${String(i + 1).padStart(3, "0")}`,
          amount: 18000 + i * 500,
          status: stage === LeadStage.QUOTED ? "Sent" : "Under Revision",
          followupDue: new Date(now.getTime() + ((i % 5) - 2) * 86400000),
          notes: "Includes standard accessories and one optional handpiece.",
        },
      });
    }

    leads.push(lead);
  }

  await prisma.messageTemplate.createMany({
    data: [
      {
        name: "Exhibition Follow-up Soft",
        useCase: "exhibition follow-up",
        channel: "email",
        tone: DraftTone.SOFT_BUSINESS,
        product: "PICO RU",
        content: "Dear {{contactName}}, thank you for visiting our booth at {{sourceEvent}}. Sharing brochure and baseline pricing for {{product}}.",
      },
      {
        name: "No Reply Reminder WhatsApp",
        useCase: "no-reply reminder",
        channel: "whatsapp",
        tone: DraftTone.SHORT_FOLLOW_UP,
        product: null,
        content: "Hi {{contactName}}, just following up regarding our previous discussion. Please let me know your preferred timing for next steps.",
      },
      {
        name: "Quotation Follow-up Formal",
        useCase: "quotation follow-up",
        channel: "email",
        tone: DraftTone.FORMAL,
        product: null,
        content: "Dear {{contactName}}, kindly confirming receipt of quotation {{quoteNo}} and checking if any revision is required.",
      },
    ],
  });

  await prisma.priceTemplate.createMany({
    data: [
      {
        product: "PICO RU",
        scope: PriceScope.GLOBAL_DEFAULT,
        market: null,
        basePrice: 22000,
        promoPrice: 20500,
        includedAccessories: "Standard handpiece, starter consumables, user training",
        optionalAccessories: "Fractional handpiece kit",
        paymentTerms: "30% deposit, 70% before shipment",
        leadTime: "4-6 weeks",
        shippingTerms: "FOB Busan",
        remarks: "MOQ 1 unit",
        marketNotes: "Used as reference for distributor channels",
      },
      {
        product: "MIWAVE",
        scope: PriceScope.MARKET_OVERRIDE,
        market: "UAE",
        basePrice: 19500,
        promoPrice: 18000,
        includedAccessories: "Core applicator set",
        optionalAccessories: "Premium applicator bundle",
        paymentTerms: "50% advance / 50% before dispatch",
        leadTime: "5 weeks",
        shippingTerms: "CIF Dubai",
        remarks: "Valid until end of quarter",
        marketNotes: "Competitive pressure from EU brand",
      },
      {
        product: "LAMIS XL",
        scope: PriceScope.SPECIAL_OFFER,
        market: "Brazil",
        basePrice: 26000,
        promoPrice: 23900,
        includedAccessories: "2 handpieces + marketing kit",
        optionalAccessories: "Extended warranty",
        paymentTerms: "LC at sight",
        leadTime: "6-8 weeks",
        shippingTerms: "FOB Busan",
        remarks: "Special exhibition campaign",
        marketNotes: "Use with KOL demo support",
      },
    ],
  });

  console.log("Seed complete", { companies: companies.length, contacts: contacts.length, leads: leads.length });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
