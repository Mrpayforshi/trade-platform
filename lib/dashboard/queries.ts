import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import type { TransactionState } from "./journey";

// Every query below runs AS the signed-in buyer (createServerSupabase), so
// row level security decides what comes back. Nothing here uses the service
// role key. Rows the buyer cannot see simply do not appear.

type Db = Awaited<ReturnType<typeof createServerSupabase>>;

export type Buyer = {
  id: string;
  email: string | null;
  phone: string | null;
  business_name: string | null;
  kyc_status: string;
};

export type TxRow = {
  id: string;
  state: TransactionState;
  previous_state: TransactionState | null;
  funds_status: "unfunded" | "held" | "released" | "refunded";
  total_value_usd: number;
  compliance_required: boolean;
  created_at: string;
  state_changed_at: string;
  promised_delivery_date: string | null;
  customs_exception_at: string | null;
  customs_exception_resolved_at: string | null;
  suppliers: { name: string } | null;
  categories: { name: string } | null;
};

export type RfqRow = {
  id: string;
  status: "open" | "quoted" | "assigned" | "expired" | "cancelled";
  quantity: number | null;
  created_at: string;
  categories: { name: string } | null;
};

export type DocRow = { id: string; doc_type: string; created_at: string };

export type LandedRow = {
  product_cost: number;
  freight_cost: number;
  insurance_cost: number;
  duty_estimate: number;
  clearing_cost: number;
  delivery_cost: number;
  platform_fee: number;
};

export type ProductRow = {
  id: string;
  name: string;
  specification: string | null;
  unit: string;
  unit_price_usd: number;
  moq: number;
  lead_time_days: number | null;
  warranty_months: number | null;
  image_url: string | null;
  category_id: string;
  suppliers: { name: string; country_of_origin: string | null; performance_score: number | null } | null;
  categories: { name: string; slug: string } | null;
};

export type CategoryRow = { id: string; name: string; slug: string };

export type SupplierRow = {
  id: string;
  name: string;
  country_of_origin: string | null;
  performance_score: number | null;
  category_ids: string[];
};

export type DashboardData = {
  transactions: TxRow[];
  rfqs: RfqRow[];
  documents: DocRow[];
  products: ProductRow[];
  plannedTrips: number;
  landed: LandedRow | null;
};

const rows = <T>(result: { data: unknown }): T[] => (result.data as T[] | null) ?? [];

const PRODUCT_SELECT =
  "id, name, specification, unit, unit_price_usd, moq, lead_time_days, warranty_months, image_url, category_id, suppliers(name, country_of_origin, performance_score), categories(name, slug)";

const TX_SELECT =
  "id, state, previous_state, funds_status, total_value_usd, compliance_required, created_at, state_changed_at, promised_delivery_date, customs_exception_at, customs_exception_resolved_at, suppliers(name), categories(name)";

/** Signed-in user plus their buyer profile. Redirects to /login when there is
 *  no session. Memoised per request so layout and page share one lookup. */
export const getBuyerContext = cache(async () => {
  const db = await createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await db
    .from("users")
    .select("id, email, phone, business_name, kyc_status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return { db, user, buyer: (data as Buyer | null) ?? null };
});

export async function getDashboardData(db: Db, buyerId: string): Promise<DashboardData> {
  const [tx, rfq, docs, products, trips] = await Promise.all([
    db.from("transactions").select(TX_SELECT).order("created_at", { ascending: false }).limit(100),
    db
      .from("rfqs")
      .select("id, status, quantity, created_at, categories(name)")
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("documents")
      .select("id, doc_type, created_at")
      .eq("owner_type", "buyer")
      .eq("owner_id", buyerId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5),
    // Tolerates migration 0017 not being applied yet: an error just means no products.
    db.from("products").select(PRODUCT_SELECT).eq("is_published", true).order("created_at", { ascending: false }).limit(4),
    db.from("trade_visits").select("id", { count: "exact", head: true }).in("status", ["planned", "confirmed"]),
  ]);

  const transactions = rows<TxRow>(tx).map((t) => ({ ...t, total_value_usd: Number(t.total_value_usd) }));

  const finished = (s: TransactionState) => s === "delivered" || s === "closed" || s === "refunded";
  const featured = transactions.find((t) => !finished(t.state));

  let landed: LandedRow | null = null;
  if (featured) {
    const { data } = await db
      .from("landed_cost_estimates")
      .select("product_cost, freight_cost, insurance_cost, duty_estimate, clearing_cost, delivery_cost, platform_fee")
      .eq("transaction_id", featured.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      const d = data as Record<keyof LandedRow, number | string>;
      landed = {
        product_cost: Number(d.product_cost),
        freight_cost: Number(d.freight_cost),
        insurance_cost: Number(d.insurance_cost),
        duty_estimate: Number(d.duty_estimate),
        clearing_cost: Number(d.clearing_cost),
        delivery_cost: Number(d.delivery_cost),
        platform_fee: Number(d.platform_fee),
      };
    }
  }

  return {
    transactions,
    rfqs: rows<RfqRow>(rfq),
    documents: rows<DocRow>(docs),
    products: rows<ProductRow>(products).map(normalizeProduct),
    plannedTrips: trips.count ?? 0,
    landed,
  };
}

export function normalizeProduct(p: ProductRow): ProductRow {
  return { ...p, unit_price_usd: Number(p.unit_price_usd) };
}

export async function getCatalogue(db: Db) {
  const [cats, prods] = await Promise.all([
    db.from("categories").select("id, name, slug").eq("is_enabled", true).order("name"),
    db.from("products").select(PRODUCT_SELECT).eq("is_published", true).order("created_at", { ascending: false }).limit(120),
  ]);
  return {
    categories: rows<CategoryRow>(cats),
    products: rows<ProductRow>(prods).map(normalizeProduct),
  };
}

export async function getSuppliers(db: Db) {
  const [cats, sups] = await Promise.all([
    db.from("categories").select("id, name, slug").eq("is_enabled", true).order("name"),
    db
      .from("suppliers")
      .select("id, name, country_of_origin, performance_score, category_ids")
      .eq("admission_status", "active")
      .eq("subscription_status", "active")
      .order("performance_score", { ascending: false, nullsFirst: false })
      .limit(60),
  ]);
  return {
    categories: rows<CategoryRow>(cats),
    suppliers: rows<SupplierRow>(sups).map((s) => ({
      ...s,
      performance_score: s.performance_score == null ? null : Number(s.performance_score),
    })),
  };
}

export async function getShipments(db: Db) {
  const { data } = await db
    .from("transactions")
    .select(TX_SELECT)
    .in("state", ["released", "dispatched", "in_transit", "customs_clearance", "delivered"])
    .order("state_changed_at", { ascending: false })
    .limit(30);
  return rows<TxRow>({ data }).map((t) => ({ ...t, total_value_usd: Number(t.total_value_usd) }));
}

export async function getReadiness(db: Db, buyer: Buyer) {
  const { count } = await db.from("rfqs").select("id", { count: "exact", head: true });
  // kyc_status is free text in the schema ('not_started' by default). These
  // values are an assumption about what the ops KYC flow will write.
  const kycDone = ["verified", "approved", "complete", "completed"].includes(buyer.kyc_status);
  const steps = [
    { label: "Create your account", done: true },
    { label: "Add your business name", done: Boolean(buyer.business_name) },
    { label: "Add a phone number", done: Boolean(buyer.phone) },
    { label: "Verify your business", done: kycDone },
    { label: "Submit your first RFQ", done: (count ?? 0) > 0 },
  ];
  return { steps, done: steps.filter((s) => s.done).length, total: steps.length, kycDone };
}
