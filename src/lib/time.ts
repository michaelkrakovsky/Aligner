const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "3 days ago", "just now": how long before `now` an ISO time was. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const seconds = (now.getTime() - Date.parse(iso)) / 1000;
  if (!Number.isFinite(seconds)) return "";
  const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return format.format(-Math.round(seconds / size), unit);
  }
  return "just now";
}
