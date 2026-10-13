// Matching and ranking for Start Order. Pure functions, no database access, so the
// rules can be tested on their own. The catalogue is small and curated (10 to 20
// suppliers per category), so scoring in memory is enough; no search engine needed.

import type { ListLine } from "./parse-list";

export type OfferProduct = {
  id: string;
  name: string;
  specification: string | null;
  unit: string;
  /** Supplier price. Not a landed cost. */
  unit_price_usd: number;
  moq: number;
  /** The supplier's own lead time, before freight and clearing. */
  lead_time_days: number | null;
  warranty_months: number | null;
  category_id: string;
  supplier_id: string;
  supplier: { name: string; country: string | null; score: number | null };
  category: { name: string; slug: string } | null;
};

export type Match = { product: OfferProduct; score: number };
export type LineResult = { line: ListLine; matches: Match[] };

export type Lens = "match" | "quality" | "price" | "lead";
export type View = Lens | "supplier";

export const VIEW_ORDER: View[] = ["match", "quality", "price", "lead", "supplier"];

export const VIEW_LABELS: Record<View, string> = {
  match: "Best match",
  quality: "Highest quality",
  price: "Lowest price",
  lead: "Fastest lead time",
  supplier: "By supplier",
};

export function parseView(value: string | string[] | undefined): View {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "quality" || v === "price" || v === "lead" || v === "supplier" ? v : "match";
}

// ---- tokens ---------------------------------------------------------------

const STOP = new Set(["a", "an", "the", "of", "for", "and", "with", "in", "to", "new", "some", "any"]);

// Words buyers use for the same thing. Small on purpose; extend as real searches show gaps.
const SYNONYMS: Record<string, string[]> = {
  pv: ["solar"],
  dump: ["tipper"],
  tipper: ["dump"],
  lorry: ["truck"],
  truck: ["lorry"],
  drip: ["irrigation"],
  sprinkler: ["irrigation"],
  pivot: ["irrigation"],
  genset: ["generator"],
  generator: ["genset"],
};

function stem(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (/(ches|shes|xes|sses)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !STOP.has(w))
    .map(stem);
}

const sameWord = (a: string, b: string) =>
  a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a)));

// ---- scoring --------------------------------------------------------------

const NAME_WEIGHT = 3;
const CATEGORY_WEIGHT = 2;
const SPEC_WEIGHT = 1;

/** 0 means no match. Needs at least half the query words to hit, and at least one in the
 *  product name or category, so a stray word in a specification never creates a match. */
export function scoreProduct(query: string[], product: OfferProduct): number {
  if (query.length === 0) return 0;
  const name = tokens(product.name);
  const category = tokens(`${product.category?.name ?? ""} ${product.category?.slug ?? ""}`);
  const spec = tokens(product.specification ?? "");

  let total = 0;
  let hits = 0;
  let strongHit = false;
  for (const q of query) {
    const options = [q, ...(SYNONYMS[q] ?? [])];
    const inField = (field: string[]) => options.some((o) => field.some((t) => sameWord(o, t)));
    let weight = 0;
    if (inField(name)) weight = NAME_WEIGHT;
    else if (inField(category)) weight = CATEGORY_WEIGHT;
    else if (inField(spec)) weight = SPEC_WEIGHT;
    if (weight > 0) {
      hits += 1;
      total += weight;
      if (weight >= CATEGORY_WEIGHT) strongHit = true;
    }
  }
  const coverage = hits / query.length;
  if (!strongHit || coverage < 0.5) return 0;
  return total * coverage;
}

export function matchLine(line: ListLine, offers: OfferProduct[]): LineResult {
  const query = tokens(line.term);
  const matches: Match[] = [];
  for (const product of offers) {
    const score = scoreProduct(query, product);
    if (score > 0) matches.push({ product, score });
  }
  return { line, matches };
}

// ---- ranking --------------------------------------------------------------

function cmpNum(a: number | null, b: number | null, dir: "asc" | "desc"): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return dir === "asc" ? a - b : b - a;
}

/** Ranking is on performance and the buyer's chosen lens, never on payment. */
export function rank(matches: Match[], lens: Lens): Match[] {
  const byPrice = (a: Match, b: Match) => cmpNum(a.product.unit_price_usd, b.product.unit_price_usd, "asc");
  const byScore = (a: Match, b: Match) => cmpNum(a.product.supplier.score, b.product.supplier.score, "desc");
  const compare: Record<Lens, (a: Match, b: Match) => number> = {
    match: (a, b) => cmpNum(a.score, b.score, "desc") || byScore(a, b) || byPrice(a, b),
    quality: (a, b) => byScore(a, b) || byPrice(a, b),
    price: (a, b) => byPrice(a, b) || byScore(a, b),
    lead: (a, b) => cmpNum(a.product.lead_time_days, b.product.lead_time_days, "asc") || byPrice(a, b),
  };
  return [...matches].sort(compare[lens]);
}

export function lineTotal(product: OfferProduct, quantity: number | null): number | null {
  return quantity == null ? null : Math.round(product.unit_price_usd * quantity * 100) / 100;
}

export const exceedsQuantity = (product: OfferProduct, quantity: number | null) =>
  quantity != null && product.moq > quantity;

// ---- by supplier ----------------------------------------------------------

export type SupplierGroup = {
  supplierId: string;
  supplier: OfferProduct["supplier"];
  items: { line: ListLine; product: OfferProduct }[];
};

/** Regroups the results by supplier. For each item a supplier covers, its best match
 *  for that line is used. Suppliers covering more of the list come first. */
export function groupBySupplier(results: LineResult[]): SupplierGroup[] {
  const groups = new Map<string, SupplierGroup>();
  for (const result of results) {
    const seen = new Set<string>();
    for (const m of rank(result.matches, "match")) {
      const id = m.product.supplier_id;
      if (seen.has(id)) continue;
      seen.add(id);
      let group = groups.get(id);
      if (!group) {
        group = { supplierId: id, supplier: m.product.supplier, items: [] };
        groups.set(id, group);
      }
      group.items.push({ line: result.line, product: m.product });
    }
  }
  return [...groups.values()].sort(
    (a, b) =>
      b.items.length - a.items.length ||
      cmpNum(a.supplier.score, b.supplier.score, "desc") ||
      a.supplier.name.localeCompare(b.supplier.name),
  );
}
