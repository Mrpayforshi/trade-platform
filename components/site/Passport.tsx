"use client";
import { useState } from "react";
import { stages } from "@/lib/site-content";

const dot = { done: "border-brand bg-brand", now: "border-amber bg-amber", next: "border-mute" };

export function Passport() {
  const [open, setOpen] = useState(2);
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-card">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line px-4 py-3 text-[13px] text-mute">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex gap-1.5">{[0, 1, 2].map((k) => <i key={k} className="size-2.5 rounded-full bg-line" />)}</span>
          <b className="text-ink">Transaction passport</b> — sample order
        </span>
        <span>Illustrative</span>
      </div>
      {stages.map((s, k) => (
        <button key={s.title} type="button" aria-pressed={k === open} onClick={() => setOpen(k)}
          className="grid w-full grid-cols-[28px_1fr_auto] items-center gap-3 border-b border-line min-h-12 px-4 py-3 text-left last:border-b-0 hover:bg-paper aria-pressed:bg-paper">
          <span className={`size-3 rounded-full border-2 ${dot[s.state]}`} />
          <span>{s.title}</span>
          <span className="text-xs text-mute">{s.when}</span>
        </button>
      ))}
      <p className="min-h-19 border-t border-line bg-paper px-4 py-3.5 text-sm text-mute" aria-live="polite">{stages[open].detail}</p>
    </div>
  );
}
