import { btnPrimary } from "@/components/site/ui";
import type { View } from "@/lib/order/match";

/** The list box. A plain GET form: the search lives in the URL (?list=...&by=...), so it
 *  works without JavaScript and a result page can be bookmarked or shared. */
export function OrderSearch({
  action,
  list,
  placeholder,
  view,
  member,
}: {
  action: string;
  list: string;
  placeholder: string;
  view: View;
  member: boolean;
}) {
  return (
    <form action={action} method="get" className="overflow-hidden rounded-lg border-[1.5px] border-ink bg-card">
      <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-3.5">
        <label htmlFor="order-list" className="text-sm font-semibold">
          Your list
        </label>
        <span className="text-[13px] text-mute">One item per line, or separate with commas</span>
      </div>
      <textarea
        id="order-list"
        name="list"
        rows={6}
        maxLength={2000}
        defaultValue={list}
        placeholder={placeholder}
        className="block min-h-44 w-full resize-y bg-transparent p-5 text-lg leading-relaxed placeholder:text-mute focus:outline-2 focus:-outline-offset-2 focus:outline-brand"
      />
      {view !== "match" && <input type="hidden" name="by" value={view} />}
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-t border-line px-5 py-3.5">
        <span className="text-sm text-mute">
          {member ? "We match each line to approved suppliers." : "Free to search. Create an account to see every match."}
        </span>
        <button type="submit" className={`${btnPrimary} min-h-11 text-base`}>
          Find suppliers
        </button>
      </div>
    </form>
  );
}
