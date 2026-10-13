// Turns the free-text order list ("100 solar panels, 5 tipper trucks") into line items.
// Deliberately rule-based: no network call, no cost per search, easy to reason about.

export type ListLine = {
  /** What the buyer wrote for this item, without the quantity. */
  term: string;
  /** null when the buyer gave no quantity. */
  quantity: number | null;
};

export const MAX_LIST_LENGTH = 2000;
const MAX_LINES = 10;
const MAX_TERM_LENGTH = 80;

const UNIT_PREFIX = /^(?:units?|pcs|pieces?|sets?)\s+(?:of\s+)?/i;

function toQuantity(text: string): number | null {
  const n = Number(text);
  if (!Number.isFinite(n) || n <= 0 || n > 1_000_000_000) return null;
  return Math.round(n * 100) / 100;
}

function parseChunk(chunk: string): ListLine | null {
  let text = chunk.trim().replace(/^[-*•]\s*/, "");
  if (!text) return null;
  let quantity: number | null = null;

  // "100 solar panels", "100x solar panels", "100 × solar panels".
  // A number glued to letters ("12v battery", "5kw inverter") is part of the
  // product name, not a quantity, so the number must be followed by a space or a times sign.
  const lead = text.match(/^(\d+(?:\.\d+)?)(?:\s*×\s*|\s*[xX]\s+|\s+)(.+)$/);
  if (lead) {
    quantity = toQuantity(lead[1]);
    text = lead[2];
  } else {
    // "solar panels x100", "solar panels (100)", "solar panels qty 100"
    const trail = text.match(/^(.+?)(?:\s+[xX×]\s*|\s*\(\s*|\s+qty:?\s*)(\d+(?:\.\d+)?)\)?\s*$/);
    if (trail) {
      quantity = toQuantity(trail[2]);
      text = trail[1];
    }
  }

  text = text.replace(UNIT_PREFIX, "").replace(/\s+/g, " ").trim().slice(0, MAX_TERM_LENGTH);
  if (text.length < 2 || !/[a-z]/i.test(text)) return null;
  return { term: text, quantity };
}

/** One item per line, or separated by commas, semicolons or "and 5 ...". At most 10 items. */
export function parseList(input: string): ListLine[] {
  const normalised = input
    .slice(0, MAX_LIST_LENGTH)
    .replace(/(\d),(?=\d{3}(?!\d))/g, "$1") // 1,000 -> 1000
    .replace(/\s+and\s+(?=\d)/gi, "\n")
    .replace(/[;,\r\n]+/g, "\n");

  const lines: ListLine[] = [];
  for (const chunk of normalised.split("\n")) {
    const line = parseChunk(chunk);
    if (line) lines.push(line);
    if (lines.length === MAX_LINES) break;
  }
  return lines;
}
