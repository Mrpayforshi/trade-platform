"use client";

import { useState } from "react";
import { btnPrimary } from "@/components/site/ui";

type Props = {
  categoryId: string;
  productName: string;
  supplierName: string;
  moq: number;
  unit: string;
};

/** Files a request for quote through the existing POST /api/rfqs route.
 *  Nexum then comes back with a landed-cost quote; no price is invented here. */
export function RequestQuoteButton({ categoryId, productName, supplierName, moq, unit }: Props) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function request() {
    setState("sending");
    setMessage(null);
    try {
      const res = await fetch("/api/rfqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: categoryId,
          quantity: moq,
          specification: `${productName} from ${supplierName}. Quantity set to the supplier minimum order of ${moq} ${unit}.`,
        }),
      });
      if (res.ok) {
        setState("sent");
        return;
      }
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setMessage(body?.error ?? "Could not send your request. Try again.");
      setState("error");
    } catch {
      setMessage("Could not reach Nexum. Check your connection and try again.");
      setState("error");
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={request}
        disabled={state === "sending" || state === "sent"}
        className={`${btnPrimary} w-full text-center text-sm disabled:opacity-70`}
      >
        {state === "sending" ? "Sending…" : state === "sent" ? "Quote requested" : "Request landed quote"}
      </button>
      <p aria-live="polite" className="min-h-4 text-xs text-mute">
        {state === "sent" && "Request sent. We will come back with a landed-cost quote."}
        {state === "error" && <span className="text-brick dark:text-amber">{message}</span>}
      </p>
    </div>
  );
}
