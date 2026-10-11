import Link from "next/link";
import type { ReactNode } from "react";
import type { Tone } from "@/lib/dashboard/journey";

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`rounded-xl border border-line bg-card ${className}`}>{children}</section>;
}

export function CardHeader({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-xl">{title}</h2>
      {href && linkLabel && (
        <Link href={href} className="text-[13px] font-semibold underline underline-offset-2">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-mute">{children}</p>;
}

const tones: Record<Tone, string> = {
  ok: "bg-brand/15 text-brand",
  wait: "bg-amber/25 text-ink",
  bad: "bg-brick/15 text-brick dark:text-ink",
  idle: "bg-line/70 text-ink",
};

export function Pill({ tone = "idle", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-mute">{children}</p>;
}

export function PageHeading({
  eyebrow,
  title,
  lede,
  action,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-1.5 text-4xl">{title}</h1>
        {lede && <p className="mt-2 max-w-2xl text-mute">{lede}</p>}
      </div>
      {action}
    </div>
  );
}
