// Maps the transaction_state enum (migration 0001) onto the buyer-facing
// journey, plus the formatters the dashboard shares.

export type TransactionState =
  | "quote_accepted"
  | "kyc_pending"
  | "funded"
  | "compliance_pending"
  | "compliance_cleared"
  | "released"
  | "dispatched"
  | "in_transit"
  | "customs_clearance"
  | "delivered"
  | "closed"
  | "disputed"
  | "refunded";

export type StepStatus = "done" | "now" | "todo";

export const journey: { key: string; label: string; states: TransactionState[] }[] = [
  { key: "quote", label: "Quote accepted", states: ["quote_accepted"] },
  { key: "kyc", label: "Buyer verified", states: ["kyc_pending"] },
  { key: "funds", label: "Funds protected", states: ["funded"] },
  { key: "compliance", label: "Compliance", states: ["compliance_pending", "compliance_cleared"] },
  { key: "release", label: "Supplier release", states: ["released"] },
  { key: "freight", label: "Freight", states: ["dispatched", "in_transit"] },
  { key: "customs", label: "Customs", states: ["customs_clearance"] },
  { key: "delivery", label: "Delivered", states: ["delivered", "closed"] },
];

const stepIndexOf = (state: TransactionState) =>
  journey.findIndex((s) => s.states.includes(state));

export const isFinished = (state: TransactionState) =>
  state === "delivered" || state === "closed" || state === "refunded";

/** Index of the journey step a transaction is on. Disputed and refunded
 *  orders keep the position they were in before the exception. */
export function currentStep(state: TransactionState, previous: TransactionState | null): number {
  const effective = state === "disputed" || state === "refunded" ? previous ?? "quote_accepted" : state;
  const i = stepIndexOf(effective);
  return i === -1 ? 0 : i;
}

export function stepStatuses(state: TransactionState, previous: TransactionState | null): StepStatus[] {
  const cur = currentStep(state, previous);
  const finished = state === "delivered" || state === "closed";
  return journey.map((_, i) =>
    i < cur ? "done" : i === cur ? (finished ? "done" : "now") : "todo"
  );
}

export const stateLabel: Record<TransactionState, string> = {
  quote_accepted: "Quote accepted",
  kyc_pending: "Verification pending",
  funded: "Funds protected",
  compliance_pending: "Compliance pending",
  compliance_cleared: "Compliance cleared",
  released: "Released to supplier",
  dispatched: "Dispatched",
  in_transit: "In transit",
  customs_clearance: "At customs",
  delivered: "Delivered",
  closed: "Closed",
  disputed: "In dispute",
  refunded: "Refunded",
};

export type Tone = "ok" | "wait" | "bad" | "idle";

export function stateTone(state: TransactionState): Tone {
  switch (state) {
    case "funded":
    case "compliance_cleared":
    case "released":
    case "delivered":
    case "closed":
      return "ok";
    case "kyc_pending":
    case "compliance_pending":
    case "customs_clearance":
      return "wait";
    case "disputed":
    case "refunded":
      return "bad";
    default:
      return "idle";
  }
}

/** 0..1 progress along the China to Zimbabwe route, for the shipment map. */
export function routeProgress(state: TransactionState, previous: TransactionState | null): number {
  const effective = state === "disputed" || state === "refunded" ? previous ?? "released" : state;
  switch (effective) {
    case "released": return 0.04;
    case "dispatched": return 0.16;
    case "in_transit": return 0.5;
    case "customs_clearance": return 0.82;
    case "delivered":
    case "closed": return 1;
    default: return 0;
  }
}

export const isShipmentState = (state: TransactionState) =>
  ["released", "dispatched", "in_transit", "customs_clearance", "delivered"].includes(state);

// ---- formatters ------------------------------------------------------------

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const formatUsd = (n: number) => usd.format(n);

export const formatUsdPrecise = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);

export function formatShort(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.round(n));
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", timeZone: "Africa/Harare" }).format(new Date(iso));
}

export const shortRef = (id: string) => `TX-${id.slice(0, 4).toUpperCase()}`;

export function greeting(now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Harare" }).format(now)
  );
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export const warrantyLabel = (months: number | null) =>
  months == null ? null : months % 12 === 0 ? `${months / 12} yr warranty` : `${months} mo warranty`;
