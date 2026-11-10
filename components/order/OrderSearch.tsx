"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { btnPrimary } from "@/components/site/ui";
import type { CategoryGroup } from "@/lib/order/categories";
import type { View } from "@/lib/order/match";
import { CategoryMenu } from "./CategoryMenu";

const lower = (s: string) => s.toLowerCase();

/** The list box. A plain GET form: the search lives in the URL (?list=...&by=...), so it
 *  works without JavaScript and a result page can be bookmarked or shared. The optional
 *  category menu only edits the text in the box; it needs JavaScript and is simply absent
 *  without it. */
export function OrderSearch({
  action,
  list,
  placeholder,
  view,
  member,
  categories,
  availability,
}: {
  action: string;
  list: string;
  placeholder: string;
  view: View;
  member: boolean;
  categories?: CategoryGroup[];
  availability?: Record<string, number>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState(list);
  const [note, setNote] = useState("");

  // A line counts as picked when it contains the item, so "100 solar panels" still marks
  // "Solar panels" as picked.
  const isPicked = (item: string) => text.split(/\r?\n/).some((l) => lower(l).includes(lower(item)));

  function toggle(item: string) {
    if (pending) return;
    if (isPicked(item)) {
      setText((prev) => prev.split(/\r?\n/).filter((l) => !lower(l).includes(lower(item))).join("\n"));
      setNote(`Removed ${item} from your list.`);
    } else {
      setText((prev) => (prev.trim() ? `${prev.replace(/\s+$/, "")}\n${item}` : item));
      setNote(`Added ${item} to your list. Add a quantity in front if you like, for example 100 ${lower(item)}.`);
    }
  }

  // With JavaScript the search goes through the router so we can show that it is running
  // (and the page can announce when it is done). Without it, the plain GET form still works.
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const params = new URLSearchParams({ list: text });
    if (view !== "match") params.set("by", view);
    startTransition(() => router.push(`${action}?${params.toString()}`));
  }

  return (
    <form
      action={action}
      method="get"
      onSubmit={onSubmit}
      aria-busy={pending}
      className="relative overflow-hidden rounded-lg border-[1.5px] border-ink bg-card"
    >
      {pending && <div className="absolute inset-x-0 top-0 h-1 animate-pulse bg-brand" aria-hidden="true" />}
      <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-3.5">
        <label htmlFor="order-list" className="text-sm font-semibold">
          Your list
        </label>
        <span className="text-[13px] text-mute">One item per line, or separate with commas</span>
      </div>
      {categories && categories.length > 0 && (
        <CategoryMenu groups={categories} availability={availability} isPicked={isPicked} onToggle={toggle} note={note} />
      )}
      <textarea
        id="order-list"
        name="list"
        rows={6}
        maxLength={2000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        readOnly={pending}
        placeholder={placeholder}
        className="block min-h-44 w-full resize-y bg-transparent p-5 text-lg leading-relaxed placeholder:text-mute focus:outline-2 focus:-outline-offset-2 focus:outline-brand"
      />
      {view !== "match" && <input type="hidden" name="by" value={view} />}
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-t border-line px-5 py-3.5">
        <span className="text-sm text-mute" role="status">
          {pending ? "Searching approved suppliers…" : member ? "We match each line to approved suppliers." : "Free to search. Create an account to see every match."}
        </span>
        <button type="submit" disabled={pending} className={`${btnPrimary} min-h-11 text-base disabled:opacity-70`}>
          {pending ? "Searching…" : "Find suppliers"}
        </button>
      </div>
    </form>
  );
}
