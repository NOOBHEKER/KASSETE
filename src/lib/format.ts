/** Small formatting helpers shared across the deck, rack and sheets. */

export function fmtTime(ms: number | null | undefined): string {
  if (!ms || ms < 0 || !Number.isFinite(ms)) return '0:00';
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function fmtCounter(progress: number): string {
  const value = Math.max(0, Math.min(999, Math.round(progress * 999)));
  return String(value).padStart(3, '0');
}

export function fmtRelative(ts: number | null | undefined): string {
  if (!ts) return 'never';
  const seconds = Math.max(0, Date.now() / 1000 - ts);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo ago`;
  return `${Math.floor(months / 12)} yr ago`;
}

export function plural(n: number, one: string, many?: string): string {
  return n === 1 ? one : many ?? `${one}s`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function initials(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

/** Split a raw duration list into a side split that keeps each side close to
 *  half the album — used when the scanner could not know track lengths. */
export function splitSides<T extends { duration_ms?: number }>(tracks: T[]): number {
  const total = tracks.reduce((sum, t) => sum + (t.duration_ms || 0), 0);
  if (!total) return Math.ceil(tracks.length / 2);
  let running = 0;
  for (let i = 0; i < tracks.length; i += 1) {
    running += tracks[i].duration_ms || 0;
    if (running >= total / 2) return i + 1;
  }
  return Math.ceil(tracks.length / 2);
}

export function timeAgoShort(ts: number | null | undefined): string {
  if (!ts) return '';
  const days = Math.floor((Date.now() / 1000 - ts) / 86400);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day';
  return `${days} days`;
}
