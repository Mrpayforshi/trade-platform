import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Visual } from "@/components/site/Visuals";
import { pages } from "@/lib/site-content";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return pages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = pages.find((x) => x.slug === slug);
  return p ? { title: p.title, description: p.lede } : {};
}

export default async function InnerPage({ params }: Props) {
  const { slug } = await params;
  const p = pages.find((x) => x.slug === slug);
  if (!p) notFound();
  return (
    <>
      <section className="max-w-190 pb-8 pt-10 md:pb-10 md:pt-18">
        <h1 className="text-[clamp(32px,5vw,52px)] tracking-tight">{p.title}</h1>
        <p className="mt-3 text-lg text-mute">{p.lede}</p>
      </section>
      {p.visual && (
        <div className="mb-10 max-w-130 overflow-hidden rounded-lg border border-line bg-card"><Visual name={p.visual} /></div>
      )}
      <section className="border-t border-line pb-12 pt-8 md:pb-18 md:pt-10">
        <div className={`grid gap-4 ${p.cols.length > 1 ? "md:grid-cols-2" : "max-w-190"}`}>
          {p.cols.map((c, i) => (
            <div key={i} className="rounded-lg border border-line bg-card p-5.5">
              {c.title && <h3 className="mb-2 text-xl">{c.title}</h3>}
              <ul>
                {c.items.map((t) => (
                  <li key={t} className="relative border-b border-line py-2.5 pl-5.5 text-[15px] last:border-b-0">
                    <span className="absolute left-0.5 top-4.5 size-2 rounded-full bg-brand" />{t}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {p.note && <p className="mt-5 max-w-190 border-l-[3px] border-amber bg-card px-4 py-2.5 text-sm text-mute">{p.note}</p>}
      </section>
    </>
  );
}
