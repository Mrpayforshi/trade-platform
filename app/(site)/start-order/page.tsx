 import type { Metadata } from "next";
import { CategoryChips } from "@/components/order/CategoryChips";
import { OrderSearch } from "@/components/order/OrderSearch";
import { ResultsView } from "@/components/order/ResultsView";
import { RouteBand } from "@/components/order/RouteBand";
import { EmptyNote } from "@/components/dashboard/ui";
import { parseView } from "@/lib/order/match";
import { buildPlaceholder, loadOffers, readList, searchOffers } from "@/lib/order/search";
import { createServerSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Start order",
  description: "Write your whole import list in one search. Nexum matches each line to approved suppliers and compares them.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const steps = [
  { n: "01", title: "We read your list", text: "Each line becomes an item with a quantity. You can correct any line before we search." },
  { n: "02", title: "We match approved suppliers", text: "Only suppliers that have passed our admission checks appear. A curated panel, not an open marketplace." },
  { n: "03", title: "You compare and request quotes", text: "Supplier prices are shown as listed. Once you choose, we send a landed-cost estimate for Zimbabwe." },
];

export default async function StartOrderPage({ searchParams }: Props) {
  const sp = await searchParams;
  const list = readList(sp.list);
  const requested = parseView(sp.by);

  const db = await createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();

  // Signed-in buyers stay on this page and get the full results (real supplier names, quotes, by-supplier view).
  const member = !!user;

  // The by-supplier view is for accounts only; this is enforced here, not just hidden in the UI.
  const view = requested === "supplier" && !member ? "match" : requested;

  const { offers, failed } = await loadOffers(db);
  const results = list.trim() ? searchOffers(offers, list) : null;

  return (
    <>
      <section className="max-w-190 pb-8 pt-10 md:pb-10 md:pt-18">
        <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-brand">Start order</p>
        <h1 className="mt-3 text-[clamp(32px,5vw,52px)] tracking-tight">Your whole import list, in one search.</h1>
        <p className="mt-4 max-w-160 text-lg text-mute">
          Write what you need the way you would say it. We match every line to approved suppliers and set the options side
          by side, by quality, price and lead time.
        </p>
        <RouteBand className={results ? "mt-6 max-w-75" : "mt-8 max-w-130"} />
        <div className="mt-8">
          <OrderSearch action="/start-order" list={list} placeholder={buildPlaceholder(offers)} view={view} member={member} />
          {!results && <CategoryChips offers={offers} basePath="/start-order" />}
        </div>
      </section>

      {failed && (
        <div className="mb-10 max-w-190">
          <EmptyNote>Search is temporarily unavailable. Please try again in a moment.</EmptyNote>
        </div>
      )}

      {results && !failed && (
        <section className="border-t border-line pb-12 pt-8 md:pb-18 md:pt-10">
          {results.length === 0 ? (
            <EmptyNote>We could not find any items in that list. Try one item per line, for example a quantity and a product.</EmptyNote>
          ) : (
            <ResultsView results={results} view={view} list={list} member={member} basePath="/start-order" />
          )}
        </section>
      )}

      {!results && (
        <section className="border-t border-line pb-12 pt-8 md:pb-18 md:pt-10">
          <h2 className="mb-6 text-3xl">How your list becomes options</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="border-t-[3px] border-ink pt-4">
                <p className="font-serif text-xl font-bold text-brand">{s.n}</p>
                <h3 className="mb-2 mt-1.5 font-sans text-lg font-semibold">{s.title}</h3>
                <p className="text-base leading-relaxed text-mute">{s.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 max-w-190 border-l-[3px] border-amber bg-card px-4 py-2.5 text-sm text-mute">
            Supplier prices exclude freight, insurance, duty, clearing and delivery. Landed-cost figures are estimates, not
            official customs assessments.
          </p>
        </section>
      )}
    </>
  );
}
