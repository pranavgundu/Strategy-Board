/** Build-time commit stamp rendered in the home footer. */
export const buildCommit = __BUILD_COMMIT__;

const INTERVALS: ReadonlyArray<readonly [unit: string, seconds: number]> = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

/** Coarse relative time, matching the footer wording used before the rewrite. */
export function timeAgo(date: Date, now: Date = new Date()): string {
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  for (const [unit, secondsInUnit] of INTERVALS) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) return `${interval} ${unit}${interval > 1 ? "s" : ""} ago`;
  }
  return "just now";
}
