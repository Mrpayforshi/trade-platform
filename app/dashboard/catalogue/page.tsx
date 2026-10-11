import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/dashboard/ProductCard";
import { EmptyNote, PageHeading } from "@/components/dashboard/ui";
import { getBuyerContext, getCatalogue } from "@/lib/dashboard/queries";

export const metadata: Metadata = { title: "Catalogue" };

export default async function CataloguePage(props: PageProps<"/dashboard/catalogue">) {
  const sp = await props.searchParams;
  const slug = typeof sp.category === "string" ? sp.category : null;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase().slice(0, 80) : "";

  const { db, buyer } = await getBuyerContext();
  if (!buyer) return null;
  const { categories, products } = await getCatalogue(db);

  const filtered = products.filter(
    (p) =>
      (!slug || p.categories?.slug === slug) &&
      (!q || `${p.name} ${p.specification ?? ""} ${p.suppliers?.name ?? ""}`.toLowerCase().includes(q)),
  );
  const counts = new Map<string, number>();
  for (const p of products) if (p.categories) counts.set(p.categories.slug, (counts.get(p.categories.slug) ?? 0) + 1);

  const chip = (active: boolean) =>
    `shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-semibold ${active ? "border-ink bg-ink text-paper" : "border-line bg-card hover:border-ink"}`;
  const hrefFor = (s: string | null) => {
    const params = new URLSearchParams();
    if (s) params.set("category", s);
    if (q) params.set("q", q);
    const qs = params.toString();
    return qs ? `/dashboard/catalogue?${qs}` : "/dashboard/catalogue";
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Source"
        title="Catalogue"
        lede="Products from approved suppliers. Supplier prices are shown as listed; we come back with a landed-cost quote for Zimbabwe."
      />

      <form action="/dashboard/catalogue" className="flex flex-wrap gap-2">
        {slug && <input type="hidden" name="category" value={slug} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="Search products or suppliers"
          aria-label="Search the catalogue"
          className="min-h-11 min-w-0 flex-1 rounded-md border border-line bg-card px-3.5 py-2 text-sm"
        />
        <button type="submit" className="min-h-11 rounded-md border border-ink px-4 py-2 text-sm font-semibold">
          Search
        </button>
      </form>

      <nav aria-label="Categories" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
        <Link href={hrefFor(null)} className={chip(!slug)}>
          All ({products.length})
        </Link>
        {categories.map((c) => (
          <Link key={c.id} href={hrefFor(c.slug)} className={chip(slug === c.slug)}>
            {c.name} ({counts.get(c.slug) ?? 0})
          </Link>
        ))}
      </nav>

      {filtered.length === 0 ? (
        <EmptyNote>
          {products.length === 0
            ? "No products are published yet. Approved suppliers' listings will appear here."
            : "No products match your search."}
        </EmptyNote>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
