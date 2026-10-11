import type { StepStatus } from "@/lib/dashboard/journey";

type Step = { label: string; note?: string; status: StepStatus };

const circle: Record<StepStatus, string> = {
  done: "border-brand bg-brand text-paper",
  now: "border-amber bg-card text-ink",
  todo: "border-line bg-paper text-mute",
};

const statusText: Record<StepStatus, string> = { done: "Done", now: "In progress", todo: "Not started" };

/** Horizontal order journey. Scrolls sideways on narrow screens. */
export function Stepper({ steps }: { steps: Step[] }) {
  return (
    <div className="overflow-x-auto">
      <ol className="flex min-w-190">
        {steps.map((s, i) => (
          <li key={s.label} aria-current={s.status === "now" ? "step" : undefined} className="flex min-w-24 flex-1 flex-col gap-2.5">
            <div className="flex items-center">
              <span className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${circle[s.status]}`}>
                {s.status === "done" ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12l5 5 9-10" />
                  </svg>
                ) : s.status === "now" ? (
                  <span className="size-2.5 rounded-full bg-amber" />
                ) : (
                  i + 1
                )}
              </span>
              {i < steps.length - 1 && (
                <span className={`mx-1.5 h-0.5 flex-1 ${s.status === "done" ? "bg-brand" : "bg-line"}`} />
              )}
            </div>
            <div className="pr-2">
              <p className="text-[13px] font-semibold">
                {s.label}
                <span className="sr-only"> — {statusText[s.status]}</span>
              </p>
              {s.note && <p className="text-xs text-mute">{s.note}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

type LaneNode = { title: string; sub: string; meta: string; status: StepStatus; icon: string };

/** Dotted "trade lane" canvas: the same order as connected stops. */
export function TradeLane({ nodes }: { nodes: LaneNode[] }) {
  const ring: Record<StepStatus, string> = {
    done: "bg-brand/15 text-brand",
    now: "bg-amber/25 text-ink",
    todo: "bg-line/70 text-mute",
  };
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-card [background-image:radial-gradient(var(--line)_1px,transparent_1px)] [background-size:16px_16px]">
      <ol className="flex min-w-190 items-center p-5">
        {nodes.map((n, i) => (
          <li key={n.title} className="flex flex-1 items-center">
            <div className="w-48 shrink-0 rounded-xl border border-line bg-card p-3.5">
              <div className="flex items-center gap-2.5">
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${ring[n.status]}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={n.icon} />
                  </svg>
                </span>
                <div className="min-w-0 leading-tight">
                  <p className="font-bold">{n.title}</p>
                  <p className="truncate text-xs text-mute">{n.sub}</p>
                </div>
              </div>
              <p className="mt-2.5 border-t border-line pt-2 text-xs font-semibold text-mute">
                {n.meta}
                <span className="sr-only"> — {statusText[n.status]}</span>
              </p>
            </div>
            {i < nodes.length - 1 && <span aria-hidden="true" className="mx-1 min-w-5 flex-1 border-t-2 border-dashed border-mute/60" />}
          </li>
        ))}
      </ol>
    </div>
  );
}
