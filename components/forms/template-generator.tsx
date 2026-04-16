"use client";

import { useMemo, useState } from "react";

type LeadOption = {
  id: string;
  companyName: string;
  contactName: string;
  country: string;
  products: string[];
};

type Props = {
  leads: LeadOption[];
  useCases: string[];
  tones: string[];
  products: string[];
  initialLeadId?: string;
};

export function TemplateGenerator({ leads, useCases, tones, products, initialLeadId }: Props) {
  const initialSelectedLeadId = leads.find((l) => l.id === initialLeadId)?.id || leads[0]?.id || "";
  const [leadId, setLeadId] = useState(initialSelectedLeadId);
  const [useCase, setUseCase] = useState(useCases[0] || "");
  const [tone, setTone] = useState(tones[1] || tones[0] || "SOFT_BUSINESS");
  const [channel, setChannel] = useState<"email" | "whatsapp">("email");
  const [product, setProduct] = useState(products[0] || "");
  const [generated, setGenerated] = useState("");
  const [templateName, setTemplateName] = useState("Generated Template");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const hasValidLead = Boolean(leadId && leads.some((l) => l.id === leadId));

  const selectedLead = useMemo(() => leads.find((l) => l.id === leadId), [leads, leadId]);

  async function generate() {
    if (!hasValidLead) {
      setMessage("Please select a valid lead before generating a draft.");
      return;
    }
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/ai/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, useCase, tone, channel, product }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error || "Failed to generate draft.");
      return;
    }
    setGenerated(data.draft || "");
  }

  async function save(kind: "template" | "draft") {
    if (!hasValidLead) {
      setMessage("Please select a valid lead before saving.");
      return;
    }
    if (!generated.trim()) {
      setMessage("Generate a draft first.");
      return;
    }
    const res = await fetch("/api/templates/generated", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        leadId,
        useCase,
        tone,
        channel,
        product,
        content: generated,
        name: templateName,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || `Failed to save ${kind}.`);
      return;
    }
    setMessage(kind === "template" ? "Saved as reusable template." : "Saved as communication draft on timeline.");
  }

  return (
    <div className="space-y-2">
      <div>
        <label>Lead</label>
        <select value={leadId} onChange={(e) => setLeadId(e.target.value)}>
          {leads.map((l) => (
            <option key={l.id} value={l.id}>
              {l.companyName} / {l.contactName} ({l.country})
            </option>
          ))}
        </select>
      </div>
      {!hasValidLead ? <div className="text-xs text-amber-700">No valid lead selected. Generate/Save actions are disabled.</div> : null}
      <div className="grid grid-cols-2 gap-2">
        <div><label>Use case</label><select value={useCase} onChange={(e) => setUseCase(e.target.value)}>{useCases.map((u) => <option key={u}>{u}</option>)}</select></div>
        <div><label>Tone</label><select value={tone} onChange={(e) => setTone(e.target.value)}>{tones.map((t) => <option key={t}>{t}</option>)}</select></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label>Channel</label><select value={channel} onChange={(e) => setChannel(e.target.value as "email" | "whatsapp")}><option value="email">email</option><option value="whatsapp">whatsapp</option></select></div>
        <div><label>Product</label><select value={product} onChange={(e) => setProduct(e.target.value)}>{(selectedLead?.products.length ? selectedLead.products : products).map((p) => <option key={p}>{p}</option>)}</select></div>
      </div>
      <button type="button" onClick={generate} className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={loading || !hasValidLead}>{loading ? "Generating..." : "Generate"}</button>
      <div>
        <label>Generated preview (editable)</label>
        <textarea rows={9} value={generated} onChange={(e) => setGenerated(e.target.value)} />
      </div>
      <div>
        <label>Template name (for save as reusable template)</label>
        <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => save("template")} className="rounded border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60" disabled={!hasValidLead}>Save as Template</button>
        <button type="button" onClick={() => save("draft")} className="rounded border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60" disabled={!hasValidLead}>Save as Communication Draft</button>
      </div>
      {message ? <div className="text-xs text-slate-600">{message}</div> : null}
    </div>
  );
}
