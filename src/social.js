// Sharing progress with friends without a server.
// Your progress travels as a snapshot inside a link: <app>/#add=<data>. The part after "#" is never sent to the
// web server, so the snapshot goes only where you send the link (WhatsApp, Signal, email…).
// A newer snapshot from the same person replaces the older one, so "sharing again" is how friends get your updates.
// Pure helpers (no DOM, no storage) except the encoding, which uses the browser's CompressionStream when present.

const ID_RE = /^[\w-]{1,80}$/;
const MAX_ITEMS = 3000;
export const SNAP_KEY = "add=";

const b64u = (bytes) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const unb64u = (s) => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};
const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());

// "z" + deflate-raw + base64url, or "j" + base64url of plain JSON when the browser cannot compress.
export async function encodeSnap(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  if (typeof CompressionStream === "function") return "z" + b64u(await pipe(bytes, new CompressionStream("deflate-raw")));
  return "j" + b64u(bytes);
}

export async function decodeSnap(code) {
  const kind = code[0], body = code.slice(1);
  if (kind !== "z" && kind !== "j") throw new Error("bad_link");
  let bytes = unb64u(body);
  if (kind === "z") {
    if (typeof DecompressionStream !== "function") throw new Error("no_decompress");
    bytes = await pipe(bytes, new DecompressionStream("deflate-raw"));
  }
  if (bytes.length > 400000) throw new Error("bad_link");
  return validateSnap(JSON.parse(new TextDecoder().decode(bytes)));
}

// The snapshot code from a pasted link, a shared text or a hash ("#add=...").
export function snapFromText(text) {
  const m = String(text || "").match(/[#&]add=([zj][\w-]+)/);
  return m ? m[1] : null;
}

const str = (v, max) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max) : "");
const num = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
const status = (v) => num(v, 4);

// Everything in a snapshot comes from someone else's link: keep only well-formed, bounded values.
export function validateSnap(o) {
  if (!o || o.a !== "acrolog" || o.v !== 1 || !ID_RE.test(o.id || "")) throw new Error("bad_link");
  const at = new Date(o.at);
  if (isNaN(at) || at.getTime() > Date.now() + 864e5) throw new Error("bad_link");
  const p = {};
  for (const part of String(o.p || "").split(",").slice(0, MAX_ITEMS)) {
    const m = part.match(/^([\w-]{1,80}):([0-4])([0-4])(\*?)$/);
    if (m) p[m[1]] = [status(m[2]), status(m[3]), m[4] === "*"];
  }
  const x = {};
  for (const [k, v] of Object.entries(o.x && typeof o.x === "object" ? o.x : {}).slice(0, MAX_ITEMS)) {
    if (ID_RE.test(k) && str(v, 80)) x[k] = str(v, 80);
  }
  const rc = (Array.isArray(o.rc) ? o.rc : []).slice(0, 20)
    .filter((s) => Array.isArray(s) && /^\d{4}-\d{2}-\d{2}$/.test(s[0]))
    .map((s) => [s[0], num(s[1], 1440), (Array.isArray(s[2]) ? s[2] : []).filter((id) => ID_RE.test(id)).slice(0, 40)]);
  const roles = ["base", "flyer"].filter((r, i) => String(o.r || "bf").includes("bf"[i]));
  return {
    id: o.id,
    name: str(o.n, 40) || "?",
    note: str(o.b, 120),
    roles: roles.length ? roles : ["base", "flyer"],
    at: at.toISOString(),
    stats: { sessions: num(o.s?.c, 1e6), minutes: num(o.s?.m, 1e8), streak: num(o.s?.w, 1e4) },
    p, x, rc
  };
}

// Your snapshot. names: id → display name for entries the other app may not know (your own figures, library picks).
export function buildSnap({ me, roles, progress, sessions, stats, names, includeSessions }) {
  const p = [];
  for (const pr of progress.values()) {
    if (!ID_RE.test(pr.id)) continue;
    const b = status(pr.base), f = status(pr.flyer);
    if (b || f || pr.fav) p.push(`${pr.id}:${b}${f}${pr.fav ? "*" : ""}`);
  }
  const snap = {
    a: "acrolog", v: 1, id: me.id, n: str(me.name, 40), b: str(me.note, 120) || undefined,
    r: (roles.includes("base") ? "b" : "") + (roles.includes("flyer") ? "f" : ""),
    at: new Date().toISOString(),
    s: { c: stats.sessions, m: stats.minutes, w: stats.streak },
    p: p.join(",")
  };
  const x = {};
  for (const [id, name] of names) if (p.some((e) => e.startsWith(id + ":"))) x[id] = str(name, 80);
  if (Object.keys(x).length) snap.x = x;
  if (includeSessions) snap.rc = sessions.slice(0, 10).map((s) => [s.date, Number(s.minutes) || 0, (s.items || []).slice(0, 40)]);
  return snap;
}

export const sameName = (a, b) => String(a || "").trim().toLocaleLowerCase() === String(b || "").trim().toLocaleLowerCase();

// Sessions in your log with this partner (matched by the name you write in "Partners").
export function together(sessions, name) {
  const list = sessions.filter((s) => (s.partners || []).some((p) => sameName(p, name)));
  const counts = new Map();
  list.forEach((s) => (s.items || []).forEach((id) => counts.set(id, (counts.get(id) || 0) + 1)));
  return {
    sessions: list,
    minutes: list.reduce((a, s) => a + (Number(s.minutes) || 0), 0),
    last: list[0]?.date || "",
    top: [...counts].sort((a, b) => b[1] - a[1]).slice(0, 8)
  };
}

// Compare your progress with a friend's snapshot.
//  pair: things you could train together now (one of you bases, the other flies, both at least "With spotter").
//  learn: they are solid (in any role) and you have not got it yet → ask them.
//  teach: you are solid and they have not → offer to help.
export function compare(mine, friend, myRoles) {
  const ids = new Set([...mine.keys(), ...Object.keys(friend.p)]);
  const pair = [], learn = [], teach = [];
  for (const id of ids) {
    const m = mine.get(id) || {};
    const mb = m.base || 0, mf = m.flyer || 0;
    const [fb, ff] = friend.p[id] || [0, 0];
    const meBase = myRoles.includes("base") && friend.roles.includes("flyer") ? Math.min(mb, ff) : 0;
    const meFly = myRoles.includes("flyer") && friend.roles.includes("base") ? Math.min(mf, fb) : 0;
    const best = Math.max(meBase, meFly);
    if (best >= 2) pair.push({ id, score: best, how: meBase >= meFly ? "you_base" : "you_fly" });
    const mineBest = Math.max(mb, mf), theirs = Math.max(fb, ff);
    if (theirs >= 3 && mineBest < 3) learn.push({ id, score: theirs * 10 + mineBest });
    if (mineBest >= 3 && theirs < 3) teach.push({ id, score: mineBest * 10 + theirs });
  }
  const sort = (xs) => xs.sort((a, b) => b.score - a.score).slice(0, 10);
  return { pair: sort(pair), learn: sort(learn), teach: sort(teach) };
}
