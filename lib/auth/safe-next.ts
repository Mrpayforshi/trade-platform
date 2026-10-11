/**
 * Validates a post-login redirect target. Only same-site relative paths are
 * allowed, so a crafted ?next= link can never send someone to another site.
 * Whitespace and control characters are rejected because browsers strip
 * tabs and newlines from URLs ("/\t/evil.com" would become "//evil.com").
 */
export function safeNext(
  value: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("\\")) return fallback;
  if (/[\u0000-\u001f\u007f\s]/.test(value)) return fallback;
  return value;
}
