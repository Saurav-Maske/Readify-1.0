/**
 * Formats a count compactly for display: 999 -> "999", 27432 -> "27.4k",
 * 1234567 -> "1.2m". Always lowercase suffix, at most one decimal place,
 * and drops a trailing ".0" (1000 -> "1k", not "1.0k").
 */
export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const n = Math.max(0, value);

  if (n < 1000) return String(Math.round(n));

  const format = (v: number, suffix: string) => {
    const rounded = Math.round(v * 10) / 10;
    const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    return `${text}${suffix}`;
  };

  if (n < 1_000_000) return format(n / 1000, 'k');
  if (n < 1_000_000_000) return format(n / 1_000_000, 'm');
  return format(n / 1_000_000_000, 'b');
}