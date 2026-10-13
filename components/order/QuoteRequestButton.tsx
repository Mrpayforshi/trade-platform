"use client";

import { useState } from "react";
import { btnPrimary } from "@/components/site/ui";

export type QuoteRequest = {
  category_id: string;
  quantity: number | null;
  specification: string;
};

/** Files one request for quote per entry through the existing POST /api/rfqs route.
 *  Nexum then comes back with a landed-cost quote; no price is invented here. If some
 *  requests fail, retrying only sends the ones that have not gone through. */
export function QuoteRequestButton({ requests, label }: { requests: QuoteRequest[]; label: string }) {
  const [done, setDone] = useState<boolean[]>(() => requests.map(() => false));
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function send() {
    setState("sending");
    setMessage(null);
    const next = [...done];
    let failure: string | null = null;

    for (let i = 0; i < requests.length; i++) {
      if (next[i]) continue;
      try {
        const res = await fetch("/api/rfqs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requests[i]),
        });
        if (res.ok) {
          next[i] = true;
        } else {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          failure = body?.error ?? "Could not send your request. Try again.";
        }
      } catch {
        failure = "Could not reach Nexum. Check your connection and try again.";
      }
    }

    setDone(next);
    if (next.every(Boolean)) {
      setState("sent");
    } else {
      setMessage(failure);
      setState("error");
    }
  }

  const sentCount = done.filter(Boolean).length;
  const many = requests.length > 1;

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={send}
        disabled={state === "sending" || state === "sent"}
        className={`${btnPrimary} w-full text-center text-sm disabled:opacity-70`}
      >
        {state === "sending" ? "Sending…" : state === "sent" ? (many ? "Quotes requested" : "Quote requested") : label}
      </button>
      <p aria-live="polite" className="min-h-4 text-xs text-mute">
        {state === "sent" && "Request sent. We will come back with a landed-cost quote."}
        {state === "error" && (
          <span className="text-brick dark:text-amber">
            {many && sentCount > 0 ? `${sentCount} of ${requests.length} sent. ` : ""}
            {message}
          </span>
        )}
      </p>
    </div>
  );
}
