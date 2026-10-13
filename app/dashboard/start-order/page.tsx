import type { Metadata } from "next";
import { EmptyNote, PageHeading } from "@/components/dashboard/ui";
import { CategoryChips } from "@/components/order/CategoryChips";
import { OrderSearch } from "@/components/order/OrderSearch";
import { ResultsView } from "@/components/order/ResultsView";
import { RouteBand } from "@/components/order/RouteBand";
import { getBuyerContext } from "@/lib/dashboard/queries";
import { parseView } from "@/lib/order/match";
import { buildPlaceholder, loadOffers, readList, searchOffers } from "@/lib/order/search";

export const metadata: Metadata = { title: "Start order" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function StartOrderPage({ searchParams }: Props) {
  const sp = await searchParams;
  const list = readList(sp.list);
  const view = parseView(sp.by);

  const { db, buyer } = await getBuyerContext();
  if (!buyer) return null;

  const { offers, failed } = await loadOffers(db);
  const results = list.trim() ? searchOffers(offers, list) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Source"
        title="Start order"
        lede="Write your whole list in one go. We match every line to approved suppliers and compare them by quality, price and lead time."
      />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <OrderSearch action="/dashboard/start-order" list={list} placeholder={buildPlaceholder(offers)} view={view} member />
          {!results && <CategoryChips offers={offers} basePath="/dashboard/start-order" />}
        </div>
        <RouteBand className="max-w-75 shrink-0 self-center lg:w-72" />
      </div>

      {failed && <EmptyNote>Search is temporarily unavailable. Please try again in a moment.</EmptyNote>}

      {results && !failed &&
        (results.length === 0 ? (
          <EmptyNote>We could not find any items in that list. Try one item per line, for example a quantity and a product.</EmptyNote>
        ) : (
          <ResultsView results={results} view={view} list={list} member basePath="/dashboard/start-order" />
        ))}
    </div>
  );
}
