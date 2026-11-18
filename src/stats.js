// Pure helpers (no DOM, no storage) so they are easy to test.

export const pad = (n) => String(n).padStart(2, "0");
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => ymd(new Date());
const parse = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// Monday of the week, as YYYY-MM-DD.
export function weekKey(dateStr) {
  const d = parse(dateStr);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return ymd(d);
}

export function weekly(sessions, n = 12, now = today()) {
  const out = [];
  const start = parse(weekKey(now));
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(start);
    d.setDate(d.getDate() - 7 * i);
    out.push({ week: ymd(d), count: 0, minutes: 0 });
  }
  const idx = new Map(out.map((w, i) => [w.week, i]));
  for (const s of sessions) {
    const i = idx.get(weekKey(s.date));
    if (i === undefined) continue;
    out[i].count++;
    out[i].minutes += Number(s.minutes) || 0;
  }
  return out;
}

// Consecutive weeks with at least one session. The current week counts if it has one,
// otherwise the streak is still alive from last week.
export function streakWeeks(sessions, now = today()) {
  const weeks = new Set(sessions.map((s) => weekKey(s.date)));
  const d = parse(weekKey(now));
  if (!weeks.has(ymd(d))) d.setDate(d.getDate() - 7);
  let n = 0;
  while (weeks.has(ymd(d))) {
    n++;
    d.setDate(d.getDate() - 7);
  }
  return n;
}

export function totals(sessions) {
  return { count: sessions.length, minutes: sessions.reduce((a, s) => a + (Number(s.minutes) || 0), 0) };
}

// How often and when each figure/flow was last practised.
export function practice(sessions) {
  const m = new Map();
  for (const s of sessions) for (const id of s.items || []) {
    const p = m.get(id) || { count: 0, last: "" };
    p.count++;
    if (s.date > p.last) p.last = s.date;
    m.set(id, p);
  }
  return m;
}

// Best status across the roles the user trains.
export const statusOf = (prog, roles) => Math.max(0, ...roles.map((r) => prog?.[r] ?? 0));

export function statusCounts(items, progress, roles) {
  const c = [0, 0, 0, 0, 0];
  for (const it of items) c[statusOf(progress.get(it.id), roles)]++;
  return c;
}

// What to work on next: things already in progress first (closest to solid first),
// then not-started figures up to one level above the highest level you have solid.
export function suggestions(items, progress, roles, n = 5) {
  const st = (it) => statusOf(progress.get(it.id), roles);
  const solidMax = Math.max(1, ...items.filter((it) => st(it) >= 3).map((it) => it.level));
  // In progress in any trained role (e.g. solid as base but still learning as flyer).
  const learning = (it) => Math.max(0, ...roles.map((r) => progress.get(it.id)?.[r] ?? 0).filter((v) => v === 1 || v === 2));
  const going = items.filter((it) => learning(it) > 0)
    .sort((a, b) => learning(b) - learning(a) || a.level - b.level)
    .map((it) => ({ it, why: "going" }));
  const next = items.filter((it) => st(it) === 0 && it.level <= solidMax + 1)
    .sort((a, b) => a.level - b.level || (progress.get(b.id)?.fav ? 1 : 0) - (progress.get(a.id)?.fav ? 1 : 0))
    .map((it) => ({ it, why: "next" }));
  return [...going, ...next].slice(0, n);
}

// First http(s) link in a piece of text (Instagram's share sheet puts it in "text").
export function findUrl(text) {
  const m = String(text || "").match(/https?:\/\/[^\s<>"']+/);
  return m ? m[0].replace(/[).,]+$/, "") : null;
}

export function igInfo(url) {
  const m = String(url || "").match(/^https?:\/\/(?:www\.|m\.)?instagram\.com\/(?:[\w.]+\/)?(p|reels?|tv)\/([\w-]+)/i);
  if (!m) return null;
  const kind = m[1].toLowerCase().startsWith("reel") ? "reel" : "p";
  return { kind, code: m[2], url: `https://www.instagram.com/${kind}/${m[2]}/`, embed: `https://www.instagram.com/${kind}/${m[2]}/embed/` };
}

export const tagUrl = (tag) => `https://www.instagram.com/explore/tags/${encodeURIComponent(String(tag).replace(/^#/, "").replace(/\s+/g, ""))}/`;
