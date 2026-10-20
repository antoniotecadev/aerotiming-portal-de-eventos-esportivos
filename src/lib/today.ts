/** Data de hoje em Luanda (WAT, UTC+1), no formato YYYY-MM-DD. */
export function today(now: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Luanda", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
