import Link from "next/link";
import { Passport } from "@/components/site/Passport";
import { Corridor, Visual, type VisualKey } from "@/components/site/Visuals";
import { btnGhost, btnPrimary } from "@/components/site/ui";

const problems = [
  ["Supplier trust", "Many suppliers, unclear quality", "Curated panel with business and factory checks"],
  ["True cost", "Product price mistaken for total cost", "Landed-cost estimate before you buy"],
  ["Permits", "Requirements found late", "Regulatory pathway identified before supplier release"],
  ["Payment risk", "Buyer pays supplier directly", "Licensed payment partner with release conditions"],
  ["Logistics", "Separate freight, clearing and trucking contacts", "One coordinated transaction"],
];

const features: { title: string; text: string; visual: VisualKey; wide?: boolean }[] = [
  { title: "Curated suppliers", text: "Capacity-limited panels per category, so quality is a condition of entry.", visual: "suppliers", wide: true },
  { title: "Landed cost", text: "Product, freight, insurance, duties, clearing and delivery in one estimate.", visual: "cost", wide: true },
  { title: "Compliance gate", text: "Permits and documents checked before goods leave China.", visual: "compliance" },
  { title: "Protected payment", text: "Funds held with a licensed partner until conditions are met.", visual: "payment" },
  { title: "Freight and customs", text: "Coordinated through vetted partners and registered clearing agents.", visual: "freight" },
  { title: "Delivery record", text: "Every order adds to a permanent supplier performance record.", visual: "record" },
];

const H2 = ({ a, b }: { a: string; b: string }) => (
  <h2 className="mb-3 text-[clamp(28px,4vw,40px)] tracking-tight">{a}<br /><span className="text-mute">{b}</span></h2>
);

export default function Home() {
  return (
    <>
      <div className="grid items-end gap-8 pb-10 pt-10 md:gap-12 md:pb-12 md:pt-18 md:grid-cols-[1.15fr_1fr]">
        <h1 className="text-[clamp(36px,6vw,68px)] tracking-tight">Buy from China.<br /><span className="text-mute">Receive in Zimbabwe.</span></h1>
        <div>
          <p className="max-w-[46ch] text-lg text-mute">One managed transaction from supplier check to your doorstep: landed cost, permits, payment, freight, customs and delivery.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/how-it-works" className={btnPrimary}>See how it works</Link>
            <Link href="/suppliers" className={btnGhost}>For suppliers</Link>
          </div>
        </div>
      </div>
      <Corridor />
      <div className="mb-6"><Passport /></div>

      <section className="border-t border-line py-12 md:py-18">
        <H2 a="Importing is fragmented." b="Nexum makes it one transaction." />
        <table className="hidden w-full border-collapse text-[15px] md:table">
          <thead><tr className="text-left text-sm text-mute"><th className="p-3">Problem</th><th className="p-3">Today</th><th className="p-3">With Nexum</th></tr></thead>
          <tbody>
            {problems.map(([a, b, c]) => (
              <tr key={a} className="border-t border-line align-top"><td className="w-[28%] p-3 font-semibold">{a}</td><td className="p-3 text-mute">{b}</td><td className="p-3">{c}</td></tr>
            ))}
          </tbody>
        </table>
        <ul className="mt-6 grid gap-3 md:hidden">
          {problems.map(([a, b, c]) => (
            <li key={a} className="rounded-lg border border-line bg-card p-4">
              <h3 className="mb-3 text-lg">{a}</h3>
              <p className="text-sm text-mute"><span className="mb-0.5 block text-xs font-semibold uppercase tracking-wide">Today</span>{b}</p>
              <p className="mt-3 text-[15px]"><span className="mb-0.5 block text-xs font-semibold uppercase tracking-wide text-brand">With Nexum</span>{c}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-line py-12 md:py-18">
        <H2 a="Everything between supplier" b="and doorstep, in one place." />
        <div className="mt-7 grid gap-4 md:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className={`flex flex-col overflow-hidden rounded-lg border border-line bg-card ${f.wide ? "md:col-span-2" : ""}`}>
              <div className="p-5.5 pb-4"><h3 className="mb-2 text-xl">{f.title}</h3><p className="text-[15px] text-mute">{f.text}</p></div>
              <div className="mt-auto"><Visual name={f.visual} /></div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line py-12 md:py-18">
        <H2 a="Two ways to buy." b="Same infrastructure." />
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {[
            ["Digital Trade", "Compare specifications, see the full cost, complete compliance and pay online. For time-pressed businesses.", "/digital-trade"],
            ["Trade Visit", "Travel to China with arranged factory meetings, interpreters and independent inspection. Repeat orders can then move online.", "/trade-visit"],
          ].map(([t, p, href]) => (
            <div key={t} className="rounded-lg border border-line bg-card p-5.5">
              <h3 className="mb-2 text-xl">{t}</h3><p className="text-[15px] text-mute">{p}</p>
              <Link href={href} className="mt-3.5 inline-block font-semibold">Explore {t}</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="pb-12 md:pb-18">
        <div className="rounded-xl bg-[#14213d] p-7 sm:p-10 text-[#f7f5f0] [background-image:radial-gradient(circle_at_85%_15%,rgba(20,122,67,.75),transparent_55%)] md:p-14">
          <h2 className="text-[clamp(28px,4vw,40px)]">One transaction.<br /><span className="text-[#9aa3b5]">One record. One team to call.</span></h2>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/how-it-works" className="inline-block rounded-md bg-amber px-4.5 py-2.5 font-semibold text-[#14213d]">See how it works</Link>
            <Link href="/about" className="inline-block rounded-md border border-[#f7f5f0] px-4.5 py-2.5 font-semibold">Meet the team</Link>
          </div>
        </div>
      </section>
    </>
  );
}
