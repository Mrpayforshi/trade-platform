import type { Metadata } from "next";
import { Stepper } from "@/components/dashboard/Journey";
import { Card, EmptyNote, PageHeading, Pill } from "@/components/dashboard/ui";
import {
  formatDate,
  formatUsd,
  routeProgress,
  shortRef,
  stateLabel,
  stateTone,
  stepStatuses,
  journey,
} from "@/lib/dashboard/journey";
import { getBuyerContext, getShipments } from "@/lib/dashboard/queries";

export const metadata: Metadata = { title: "Shipments" };

export default async function ShipmentsPage() {
  const { db, buyer } = await getBuyerContext();
  if (!buyer) return null;
  const shipments = await getShipments(db);

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Move"
        title="Shipments"
        lede="Orders from supplier release to delivery in Zimbabwe. Status follows the order state we record. Delivery dates are estimates."
      />
      {shipments.length === 0 ? (
        <EmptyNote>No shipments yet. Orders appear here once the supplier is released to ship.</EmptyNote>
      ) : (
        <div className="flex flex-col gap-4">
          {shipments.map((t) => {
            const pct = Math.round(routeProgress(t.state, t.previous_state) * 100);
            const statuses = stepStatuses(t.state, t.previous_state);
            return (
              <Card key={t.id} className="flex flex-col gap-4 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="leading-tight">
                    <p className="text-xs font-semibold text-mute">{shortRef(t.id)}</p>
                    <h2 className="text-xl">{t.categories?.name ?? "Order"}</h2>
                    <p className="text-[13px] text-mute">
                      {t.suppliers?.name ?? "Supplier"} · {formatUsd(t.total_value_usd)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Pill tone={stateTone(t.state)}>{stateLabel[t.state]}</Pill>
                    <p className="text-xs text-mute">Est. delivery {formatDate(t.promised_delivery_date)}</p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-mute">
                    <span>China</span>
                    <span>Zimbabwe</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Progress along the route"
                    className="mt-1 h-2 overflow-hidden rounded-full bg-line"
                  >
                    <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <Stepper steps={journey.map((j, i) => ({ label: j.label, status: statuses[i] }))} />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
