import type { Metadata } from "next";
import { Card, EmptyNote, PageHeading, Pill } from "@/components/dashboard/ui";
import { getBuyerContext, getSuppliers } from "@/lib/dashboard/queries";

export const metadata: Metadata = { title: "Suppliers" };

export default async function SuppliersPage() {
  const { db, buyer } = await getBuyerContext();
  if (!buyer) return null;
  const { categories, suppliers } = await getSuppliers(db);
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Source"
        title="Suppliers"
        lede="Suppliers admitted to Nexum. The trust score reflects delivery and quality performance. It is never affected by what a supplier pays."
      />
      {suppliers.length === 0 ? (
        <EmptyNote>No suppliers are listed yet.</EmptyNote>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {suppliers.map((s) => (
            <Card key={s.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-line/70 font-serif text-lg font-semibold">
                  {s.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <h2 className="truncate text-lg">{s.name}</h2>
                  <p className="text-xs text-mute">{s.country_of_origin ?? "China"}</p>
                </div>
                <div className="text-right leading-tight">
                  <p className="font-serif text-xl font-semibold">
                    {s.performance_score == null ? "New" : Math.round(s.performance_score)}
                  </p>
                  <p className="text-[11px] text-mute">trust score</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(s.category_ids ?? []).map((id) => catName.get(id) && <Pill key={id}>{catName.get(id)}</Pill>)}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
