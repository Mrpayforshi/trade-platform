import { createServerSupabase } from "@/lib/supabase/server";
import { matchLine, type LineResult, type OfferProduct } from "./match";
import { MAX_LIST_LENGTH, parseList } from "./parse-list";

// Server-side only. Reads run AS the caller through createServerSupabase, so row level
// security decides which products come back (published, category enabled, supplier
// active with a live subscription). The service role key is not used here.

type Db = Awaited<ReturnType<typeof createServerSupabase>>;

const SELECT =
  "id, name, specification, unit, unit_price_usd, moq, lead_time_days, warranty_months, category_id, supplier_id, suppliers(name, country_of_origin, performance_score), categories(name, slug)";

type Row = {
  id: string;
  name: string;
  specification: string | null;
  unit: string;
  unit_price_usd: number | string;
  moq: number;
  lead_time_days: number | null;
  warranty_months: number | null;
  category_id: string;
  supplier_id: string;
  suppliers: { name: string; country_of_origin: string | null; performance_score: number | string | null } | null;
  categories: { name: string; slug: string } | null;
};

export async function loadOffers(db: Db): Promise<{ offers: OfferProduct[]; failed: boolean }> {
  const { data, error } = await db.from("products").select(SELECT).eq("is_published", true).limit(500);
  if (error || !data) return { offers: [], failed: true };

  const offers: OfferProduct[] = [];
  for (const r of data as unknown as Row[]) {
    if (!r.suppliers) continue;
    offers.push({
      id: r.id,
      name: r.name,
      specification: r.specification,
      unit: r.unit,
      unit_price_usd: Number(r.unit_price_usd),
      moq: r.moq,
      lead_time_days: r.lead_time_days,
      warranty_months: r.warranty_months,
      category_id: r.category_id,
      supplier_id: r.supplier_id,
      supplier: {
        name: r.suppliers.name,
        country: r.suppliers.country_of_origin,
        score: r.suppliers.performance_score == null ? null : Number(r.suppliers.performance_score),
      },
      category: r.categories,
    });
  }
  return { offers, failed: false };
}

export function searchOffers(offers: OfferProduct[], list: string): LineResult[] {
  return parseList(list).map((line) => matchLine(line, offers));
}

/** Reads the ?list= parameter, bounded in length. */
export function readList(value: string | string[] | undefined): string {
  const v = Array.isArray(value) ? value[0] : value;
  return typeof v === "string" ? v.slice(0, MAX_LIST_LENGTH) : "";
}

const FALLBACK_EXAMPLES = ["100 solar panels", "5 tipper trucks", "3 irrigation systems"];
const EXAMPLE_QUANTITIES = [100, 5, 3];

/** The faint example lines in the search box. Built from products that are actually
 *  published, so the examples never promise something the search cannot return. Falls back
 *  to fixed examples while the catalogue is empty. */
export function buildPlaceholder(offers: OfferProduct[]): string {
  const byCategory = new Map<string, { name: string; count: number }>();
  for (const o of offers) {
    const entry = byCategory.get(o.category_id);
    if (entry) entry.count += 1;
    else byCategory.set(o.category_id, { name: o.name, count: 1 });
  }
  const picked = [...byCategory.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 3)
    .map((e, i) => `${EXAMPLE_QUANTITIES[i]} ${e.name.toLowerCase().slice(0, 36)}`);

  const examples = picked.length > 0 ? picked : FALLBACK_EXAMPLES;
  return [...examples, "", "Write what you need, one item per line. Quantities help us size the options."].join("\n");
}
