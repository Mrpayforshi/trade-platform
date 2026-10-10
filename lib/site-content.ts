import type { VisualKey } from "@/components/site/Visuals";

export type Stage = { title: string; detail: string; when: string; state: "done" | "now" | "next" };

export const stages: Stage[] = [
  { title: "Quote accepted", detail: "Buyer picks a curated supplier and accepts the landed-cost estimate.", when: "Day 0", state: "done" },
  { title: "Compliance case opened", detail: "Nexum maps the product to its import route and lists the permits and documents needed.", when: "Day 0", state: "done" },
  { title: "Funds protected", detail: "Payment goes to a licensed payment partner, not Nexum's operating account.", when: "Day 1", state: "now" },
  { title: "Supplier released", detail: "Goods are released only once permit and payment conditions are met.", when: "Pending", state: "next" },
  { title: "Freight and customs", detail: "Inspection, insurance and freight run while a registered clearing agent prepares entry.", when: "Pending", state: "next" },
  { title: "Delivered", detail: "Proof of delivery closes the order and updates the supplier's record.", when: "Pending", state: "next" },
];

export const nav = [
  { label: "Platform", items: [
    { href: "/how-it-works", label: "How it works", hint: "Quote to doorstep, step by step" },
    { href: "/compliance", label: "Compliance", hint: "Permits checked before shipping" },
    { href: "/payments", label: "Protected payments", hint: "Funds released on conditions" },
  ] },
  { label: "Buyers", items: [
    { href: "/digital-trade", label: "Digital Trade", hint: "Buy without travelling" },
    { href: "/trade-visit", label: "Trade Visit", hint: "See the factory yourself" },
  ] },
  { label: "Suppliers", items: [{ href: "/suppliers", label: "Suppliers", hint: "" }] },
  { label: "About", items: [{ href: "/about", label: "About", hint: "" }] },
];

export type SitePage = {
  slug: string; title: string; lede: string; visual?: VisualKey;
  cols: { title?: string; items: string[] }[]; note?: string;
};

export const pages: SitePage[] = [
  { slug: "how-it-works", title: "How Nexum works", lede: "From what you need to goods at your door, in six stages.", visual: "freight",
    cols: [{ items: stages.map((s) => `${s.title}: ${s.detail}`) }],
    note: "Illustrative flow from the business plan. Timings and partners will be set once operations are live." },
  { slug: "compliance", title: "Compliance before shipping", lede: "Nexum finds the import route and required permits before the supplier is released.", visual: "compliance",
    cols: [
      { title: "What the engine checks", items: ["Product description and specification", "Tariff classification, with human review when unclear", "Country of origin, quantity and value", "Required permits, licences and certificates", "Required customs documents", "Known duty and tax treatment"] },
      { title: "Who decides what", items: ["Government authorities issue permits and licences", "The customs authority assesses duty and clears goods", "Registered clearing agents file entries", "Nexum prepares applications, tracks status and holds shipment until conditions are met"] },
    ],
    note: "Nexum never issues permits. Duty figures are estimates until officially assessed. Any government portal integration is planned and depends on agency agreement." },
  { slug: "payments", title: "Protected payments", lede: "Your money moves into a regulated structure before the supplier is released.", visual: "payment",
    cols: [
      { title: "How funds move", items: ["Quote accepted and buyer verified", "Funds placed with an approved payment partner", "Compliance and supplier conditions verified", "Funds released to supplier on agreed terms", "Delivery confirmed, dispute window closes"] },
      { title: "Large orders", items: ["High-value orders can use milestones: deposit, production, inspection, shipment, delivery."] },
    ],
    note: "Launch depends on a licensed payment partner and regulatory confirmation. Do not describe this as escrow until that is in place." },
  { slug: "digital-trade", title: "Digital Trade", lede: "Buy without travelling. If it is on Nexum, you can complete the order remotely.",
    cols: [{ items: ["Curated suppliers with trust indicators", "Specification and price comparison", "Landed-cost estimate before purchase", "Compliance screening and permit workflow", "Protected payment", "Factory and product inspection options", "Freight, insurance and customs coordination", "Delivery tracking and a document vault"] }] },
  { slug: "trade-visit", title: "Trade Visit", lede: "See it yourself. A guided China sourcing trip on the same record as your order.",
    cols: [{ items: ["Travel planning and estimated trip cost", "Factory and showroom meetings arranged for you", "Interpreter and negotiation support", "Independent factory and product inspection", "Sample collection and comparison", "Freight and consolidation after the trip"] }] },
  { slug: "suppliers", title: "Suppliers", lede: "Nexum admits a limited number of suppliers per category, so a place on the panel means something.", visual: "suppliers",
    cols: [
      { title: "How suppliers are admitted", items: ["Business identity and ownership checks", "Factory or site verification", "Product specification and certification review", "Export and documentation review", "Bank account verification", "Sample order for selected categories"] },
      { title: "How suppliers are scored", items: ["On-time release", "Product conformity", "Inspection pass rate", "Dispute rate", "Lead-time accuracy", "Warranty and after-sales", "Documentation accuracy"] },
    ],
    note: "Ranking is based on performance, never payment. Any sponsored placement will be labelled." },
  { slug: "about", title: "About Nexum", lede: "A trade operating layer for the China–Zimbabwe corridor, built to grow into a wider Africa–world network.",
    cols: [{ title: "Team", items: ["Jernaid A. Mutendera — Founder, Head of Operations", "Tadiwa Mandizha — Co-founder, Head of Technology"] }],
    note: "Nexum is in development. Details on this site are illustrative." },
];
