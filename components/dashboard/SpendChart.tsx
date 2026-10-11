import { formatShort, formatUsd } from "@/lib/dashboard/journey";
import { EmptyNote } from "./ui";

export type SpendMonth = { label: string; value: number };

export function SpendChart({ months }: { months: SpendMonth[] }) {
  const max = Math.max(...months.map((m) => m.value), 0);
  if (max === 0) return <EmptyNote>No orders yet. Your monthly order value will appear here.</EmptyNote>;

  const summary = months.map((m) => `${m.label} ${formatUsd(m.value)}`).join(", ");
  return (
    <div>
      <div role="img" aria-label={`Order value by month: ${summary}`} className="flex h-44 items-end gap-3 border-b border-line pt-2">
        {months.map((m, i) => (
          <div key={m.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-xs font-semibold text-mute">{m.value > 0 ? formatShort(m.value) : ""}</span>
            <div
              className={`w-full rounded-t ${i === months.length - 1 ? "bg-ink" : "bg-mute/50"}`}
              style={{ height: `${Math.max(m.value > 0 ? 4 : 0, (m.value / max) * 82)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-3">
        {months.map((m) => (
          <span key={m.label} className="flex-1 text-center text-xs text-mute">
            {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}
