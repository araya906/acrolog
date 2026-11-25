import { LANGS, makeT, detectLang } from "./i18n.js";
import { SEED, CATS, FLOW_TYPES, ROLES, STATUS, LEVELS, GUIDE_BASE, ACROPEDIA_BASE, ACROPEDIA_ALL } from "./catalog.js";
import { PHOTOS } from "./photos.js";
import { videoInfo, platformName, shrinkImage } from "./media.js";
import { all, put, remove, clearAll, exportAll, importAll, getSetting, setSetting } from "./store.js";
import { today, weekly, streakWeeks, totals, practice, statusOf, statusCounts, suggestions, findUrl, igInfo, tagUrl } from "./stats.js";
import { SNAP_KEY, encodeSnap, decodeSnap, snapFromText, buildSnap, validateSnap, together, compare, sameName } from "./social.js";
import { syncConfigured, pushSnap, pullSnaps, deleteSnap, newKey, sidFor } from "./sync.js";
import { toItem, itemId, fetchCommunity, publishFlow, unpublishFlow, reportFlow } from "./community.js";
import { cleanFlow } from "./flowcheck.js";
import { FIG_IDS } from "./catalog.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const TABS = ["figures", "flows", "log", "progress", "friends", "data"];
const LIB_PAGE = 40;
const SEED_BY_ID = new Map(SEED.map((i) => [i.id, i]));

const PLAY = `<svg class="ig-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z" fill="currentColor"/></svg>`;
const IG = `<svg class="ig-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>`;

const S = {
  lang: LANGS[getSetting("lang", "")] ? getSetting("lang", "") : detectLang(),
  roles: getSetting("roles", ["base", "flyer"]),
  items: new Map(),
  progress: new Map(),
  sessions: [],
  refs: [],
  photos: [], // your own photos: { id, target, blob, url (object URL), added }
  practice: new Map(),
  hidden: 0,
  fig: { q: "", cat: "all", status: "all" },
  flowType: "all",
  draft: { items: [], mood: 0, editing: null },
  sheet: null,
  install: null,
  friends: [], // snapshots friends shared with you: { id, name, at, p, x, rc, stats, alias, received }
  me: getSetting("me", null), // { id, name, note, key } (key: write key for the sync server, made when sync is turned on)
  sync: getSetting("sync", false),
  thumbs: getSetting("thumbs", false), // show YouTube video thumbnails (loaded from i.ytimg.com)
  AP: null, // Acropedia library, loaded on first use
  lib: { q: "", tag: "", n: LIB_PAGE },
  view: { figures: "list", flows: "list", ...getSetting("view", {}) } // list or grid, per tab
};
let t = makeT(S.lang);

// ---------- helpers ----------
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
// Text that may be translated ({ en, es, eu }) or plain.
const txt = (v) => (!v ? "" : typeof v === "string" ? v : v[S.lang] || v.en || "");
const nm = (it) => (!it ? "?" : typeof it.name === "string" ? it.name : it.name[S.lang] || it.name.en);
const figs = () => [...S.items.values()].filter((i) => i.kind === "fig");
// Community flows count as yours (lists, log, progress, stats) once you track them: a status, a goal or a session.
const tracked = (it) => !it.community || S.progress.has(it.id) || S.practice.has(it.id);
const flows = () => [...S.items.values()].filter((i) => i.kind === "flow" && tracked(i));
const communityFlows = () => [...S.items.values()].filter((i) => i.community);
const prog = (id) => ({ id, base: 0, flyer: 0, notes: "", fav: false, ...S.progress.get(id) });
const st = (id) => statusOf(S.progress.get(id), S.roles);
const sortItems = (list) => list.sort((a, b) => a.level - b.level || nm(a).localeCompare(nm(b), S.lang));
const stepsOf = (fl) => (fl.steps || []).filter((id) => S.items.has(id));
const tagOf = (it) => (it.tag || nm(it)).replace(/[^\p{L}\p{N}_]/gu, "").toLowerCase();
const statusName = (v) => t.list("status")[v] ?? "";
const pill = (v) => `<span class="st s${v}">${esc(statusName(v))}</span>`;
const dots = (l) => `<span class="lvl" aria-label="${esc(t.list("levels")[l])}">${"●".repeat(l)}<i>${"●".repeat(4 - l)}</i></span>`;
// Photos: your own first, then the bundled reference photos (Wikimedia Commons, credited).
const myPhotos = (id) => S.photos.filter((p) => p.target === id);
const refPhotos = (id) => PHOTOS[id] || [];
// Video thumbnails come from YouTube (i.ytimg.com) and only when the user turned them on in Settings.
const ytThumb = (url) => {
  const v = S.thumbs ? videoInfo(url) : null;
  return v?.kind === "youtube" ? `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg` : "";
};
const thumbOf = (id) => myPhotos(id)[0]?.url || refPhotos(id)[0]?.src || ytThumb(S.items.get(id)?.video) || "";
// Name of an entry that may only exist in a friend's app (their own figure, or a library pick).
const idName = (id, fr) => (S.items.has(id) ? nm(S.items.get(id)) : fr?.x?.[id] || S.AP?.find((a) => "ap-" + a[0] === id)?.[1] || id.replace(/^(u|ap)-/, ""));
const friendOf = (partner) => S.friends.find((f) => sameName(f.alias || f.name, partner));
const daysAgo = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso)) / 864e5));
const markChanged = () => {
  setSetting("changed", new Date().toISOString());
  schedulePush();
};
const link = (url, text) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>`;
const opt = (v, label, sel) => `<option value="${esc(v)}" ${String(v) === String(sel) ? "selected" : ""}>${esc(label)}</option>`;

function fmtDate(s, long = false) {
  if (!s) return "";
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const o = { weekday: "short", day: "numeric", month: "short" };
  if (long || y !== new Date().getFullYear()) o.year = "numeric";
  return date.toLocaleDateString(S.lang, o);
}

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast.h);
  toast.h = setTimeout(() => { el.hidden = true; }, 2600);
}

// ---------- data ----------
async function load() {
  const [items, progress, sessions, refs, photos, friends] = await Promise.all(["items", "progress", "sessions", "refs", "photos", "friends"].map(all));
  S.friends = friends.sort((a, b) => (b.at || "").localeCompare(a.at || ""));
  S.photos.forEach((p) => URL.revokeObjectURL(p.url));
  S.photos = photos.filter((p) => p.blob).map((p) => ({ ...p, url: URL.createObjectURL(p.blob) }))
    .sort((a, b) => (b.added || "").localeCompare(a.added || ""));
  S.items = new Map(SEED.map((i) => [i.id, i]));
  items.forEach((i) => S.items.set(i.id, i));
  for (const [id, i] of S.items) if (i.hidden) S.items.delete(id);
  S.hidden = items.filter((i) => i.hidden).length;
  S.progress = new Map(progress.map((p) => [p.id, p]));
  S.sessions = sessions;
  S.refs = refs;
  await loadCommunity();
  sortData();
}

// Downloaded community flows join the items, except your own published ones (you have the original) and
// flows you reported.
async function loadCommunity() {
  for (const [id, i] of S.items) if (i.community) S.items.delete(id);
  const mine = new Set([...S.items.values()].map((i) => i.pub).filter(Boolean));
  const reported = new Set(getSetting("reported", []));
  for (const c of await all("community")) {
    if (c?.community && c.cid && !mine.has(c.cid) && !reported.has(c.cid) && !S.items.has(c.id)) S.items.set(c.id, c);
  }
}

function sortData() {
  S.sessions.sort((a, b) => b.date.localeCompare(a.date) || (b.created || "").localeCompare(a.created || ""));
  S.refs.sort((a, b) => (b.added || "").localeCompare(a.added || ""));
  S.practice = practice(S.sessions);
}

async function saveProgress(p) {
  p.updated = new Date().toISOString();
  S.progress.set(p.id, p);
  markChanged();
  await put("progress", p);
}

// Instagram links are stored in canonical form, without the share-tracking parameters (?igsh=...).
const cleanUrl = (url) => igInfo(url)?.url || url;

async function addRef(rawUrl, target, note = "") {
  const url = cleanUrl(rawUrl);
  const dup = S.refs.find((r) => r.url === url);
  if (dup) {
    if (target && !S.items.has(dup.target)) {
      dup.target = target;
      await put("refs", dup);
    }
    return null;
  }
  const r = { id: uid(), url, target: target || null, note: note.slice(0, 140), added: new Date().toISOString() };
  S.refs.unshift(r);
  await put("refs", r);
  return r;
}

// ---------- static text ----------
function applyStatic() {
  document.documentElement.lang = S.lang;
  $$("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $$("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  $$("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
  $$("[data-i18n-list]").forEach((el) => { el.innerHTML = t.list(el.dataset.i18nList).map((x) => `<li>${esc(x)}</li>`).join(""); });
  $("#lang").innerHTML = Object.entries(LANGS).map(([k, v]) => opt(k, v, S.lang)).join("");
  const rv = S.roles.length === 2 ? "both" : S.roles[0];
  $$("[name=roles]").forEach((r) => { r.checked = r.value === rv; });
  $("#install").hidden = !S.install;
  $("#thumbs").checked = S.thumbs;
}

function renderAll() {
  applyStatic();
  refresh();
  renderSheet();
}

function refresh() {
  renderFigures();
  renderFlows();
  renderLog();
  renderProgress();
  renderFriends();
  renderData();
}

function goto(tab) {
  if (!TABS.includes(tab)) tab = "figures";
  $$(".tab").forEach((s) => { s.hidden = s.dataset.tab !== tab; });
  $$("#tabs button").forEach((b) => b.setAttribute("aria-current", b.dataset.goto === tab ? "page" : "false"));
  if (location.hash !== "#" + tab) history.replaceState(null, "", "#" + tab);
  window.scrollTo(0, 0);
  $("#fab").hidden = !["figures", "flows", "progress"].includes(tab);
  if (tab === "friends") pullFriends();
}

// ---------- lists ----------
const chip = (group, v, label, on, pre = "") =>
  `<button type="button" class="chip" data-act="filter" data-group="${group}" data-v="${esc(v)}" aria-pressed="${on}">${pre}${esc(label)}</button>`;

function itemCard(it) {
  const p = S.progress.get(it.id);
  const pr = S.practice.get(it.id);
  const nrefs = S.refs.filter((r) => r.target === it.id).length;
  const sub = [it.kind === "fig" ? t("cat_" + it.cat) : t("ft_" + it.type)];
  if (it.community) sub.push(t("comm_by", { x: it.by || "?" }));
  if (it.pub) sub.push(t("comm_shared"));
  if (nrefs) sub.push(t("n_refs", { n: nrefs }));
  if (pr) sub.push(t("n_practiced", { n: pr.count }));
  if (it.video) sub.push("▶ " + t("video"));
  const steps = it.kind === "flow" ? stepsOf(it) : [];
  const thumb = thumbOf(it.id);
  return `<button type="button" class="item s${st(it.id)}${thumb ? " has-thumb" : ""}" data-act="open" data-id="${esc(it.id)}">
    ${thumb ? `<img class="thumb" src="${esc(thumb)}" alt="" loading="lazy">` : ""}
    <span class="item-top"><b>${p?.fav ? '<span class="fav">★</span> ' : ""}${esc(nm(it))}</b>${dots(it.level)}</span>
    <span class="item-sub">${esc(sub.join(" · "))}</span>
    ${steps.length ? `<span class="steps">${steps.map((id) => esc(nm(S.items.get(id)))).join(" → ")}</span>` : ""}
    <span class="pills">${S.roles.map((r) => `<span class="role">${esc(t("role_" + r))}</span>${pill(p?.[r] ?? 0)}`).join("")}</span>
  </button>`;
}

function byLevel(list, view = "list") {
  return LEVELS.map((l) => {
    const xs = list.filter((i) => i.level === l);
    if (!xs.length) return "";
    const body = view === "grid" ? `<div class="grid">${xs.map(gridCard).join("")}</div>` : `<div class="items">${xs.map(itemCard).join("")}</div>`;
    return `<h3 class="lvl-h">${esc(t.list("levels")[l])} <span class="hint">${xs.length}</span></h3>${body}`;
  }).join("");
}

// Grid card: your photo, a reference photo or (if thumbnails are on) the YouTube frame; otherwise a generated icon:
// the item's initials on a colour of its category, over a faint figure/flow glyph.
const CAT_HUE = { lbase: 18, standing: 205, therapeutic: 150, trio: 275, transition: 38, flow: 225, washing: 190, pop: 335 };
const GLYPH = {
  fig: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4.5" r="2"/><path d="M12 7v7M7 10l5-1 5 1M9 21l3-7 3 7"/></svg>`,
  flow: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M7 6h10M18 8l-5 8M6 8l5 8"/></svg>`
};
const initials = (name) => (String(name).match(/[\p{L}\p{N}]+/gu) || ["?"]).slice(0, 2).map((w) => w[0].toLocaleUpperCase()).join("");
const hueOf = (it) => {
  let h = 0;
  for (const c of it.id) h = (h * 31 + c.charCodeAt(0)) % 997;
  return ((CAT_HUE[it.kind === "fig" ? it.cat : it.type] ?? 210) + (h % 24) - 12 + 360) % 360;
};

function gridCard(it) {
  const p = S.progress.get(it.id);
  const thumb = thumbOf(it.id);
  // A YouTube frame (no photo of yours or reference photo) becomes a short flipbook of the video: see previewTick.
  const yt = thumb && thumb === ytThumb(it.video) ? videoInfo(it.video).id : "";
  const pic = thumb ? `<img class="pic" src="${esc(thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer"${yt ? ` data-yt="${esc(yt)}"` : ""}>`
    : `<span class="gen" style="--h:${hueOf(it)}" aria-hidden="true">${GLYPH[it.kind] || ""}<span>${esc(initials(nm(it)))}</span></span>`;
  const roles = S.roles.map((r) => `<span title="${esc(t("role_" + r))}">${esc(t("role_" + r)[0])} <span class="dot s${p?.[r] ?? 0}"></span></span>`).join("");
  return `<button type="button" class="card-g s${st(it.id)}" data-act="open" data-id="${esc(it.id)}">
    ${pic}${p?.fav ? `<span class="fav" aria-label="${esc(t("fav"))}">★</span>` : ""}${it.community ? `<span class="badge">${esc(t("community"))}</span>` : ""}
    <span class="meta"><b>${esc(nm(it))}</b>${pill(st(it.id))}<span class="rl">${dots(it.level)}${roles}</span></span>
  </button>`;
}

// Grid previews of flows with a YouTube video: cards on screen step through the frames YouTube itself publishes for
// every video (mq1-mq3, taken at about 1/4, 1/2 and 3/4 of it) next to the usual preview image, so a flow shows
// a few moments of its movement. Only with video thumbnails on (Settings), only cards on screen, never in a hidden
// tab or behind a sheet, and not at all with "reduce motion". Frames load from i.ytimg.com like the thumbnail;
// a missing frame is skipped. Nothing is copied or stored.
const FRAMES = ["mqdefault", "mq1", "mq2", "mq3"];
const badFrames = new Map(); // video id -> frames YouTube doesn't have
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
function previewTick() {
  if (!S.thumbs || reduceMotion.matches || document.hidden || S.sheet) return;
  const h = innerHeight;
  for (const img of $$(".tab:not([hidden]) img.pic[data-yt]")) {
    const r = img.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > h || !img.complete) continue;
    const id = img.dataset.yt, bad = badFrames.get(id) || new Set();
    const frames = FRAMES.filter((f) => !bad.has(f));
    if (frames.length < 2) continue;
    const next = frames[(frames.indexOf(img.dataset.f || "mqdefault") + 1) % frames.length];
    const pre = new Image();
    pre.referrerPolicy = "no-referrer";
    pre.onload = () => {
      // YouTube answers a missing frame with a 120x90 grey placeholder.
      if (pre.naturalWidth <= 120) return badFrames.set(id, bad.add(next));
      if (img.dataset.yt !== id) return;
      img.src = pre.src;
      img.dataset.f = next;
    };
    pre.onerror = () => badFrames.set(id, bad.add(next));
    pre.src = `https://i.ytimg.com/vi/${id}/${next}.jpg`;
  }
}
setInterval(previewTick, 1100);

const LIST_ICO =`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>`;
const GRID_ICO = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`;
function renderViewToggles() {
  $$(".viewtog").forEach((el) => {
    const tab = el.dataset.view, v = S.view[tab];
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", t("view_label"));
    el.innerHTML = `<button type="button" data-act="view" data-tab="${tab}" data-v="list" aria-pressed="${v !== "grid"}" aria-label="${esc(t("view_list"))}" title="${esc(t("view_list"))}">${LIST_ICO}</button>
      <button type="button" data-act="view" data-tab="${tab}" data-v="grid" aria-pressed="${v === "grid"}" aria-label="${esc(t("view_grid"))}" title="${esc(t("view_grid"))}">${GRID_ICO}</button>`;
  });
}

const noMatch = (act) => `<div class="empty"><p>${esc(t("none_match"))}</p><button type="button" class="btn" data-act="${act}">${esc(t("filters_clear"))}</button></div>`;

function renderFigures() {
  const f = S.fig;
  $("#fig-cats").innerHTML = ["all", ...CATS].map((c) => chip("cat", c, c === "all" ? t("all") : t("cat_" + c), f.cat === c)).join("");
  $("#fig-status").innerHTML = ["all", ...STATUS].map((v) => chip("status", v, v === "all" ? t("any_status") : statusName(v),
    String(f.status) === String(v), v === "all" ? "" : `<span class="dot s${v}"></span>`)).join("");
  const q = f.q.trim().toLowerCase();
  const list = sortItems(figs().filter((it) => (f.cat === "all" || it.cat === f.cat)
    && (f.status === "all" || st(it.id) === Number(f.status))
    && (!q || nm(it).toLowerCase().includes(q) || (it.tag || "").includes(q))));
  $("#fig-list").innerHTML = list.length ? byLevel(list, S.view.figures) : noMatch("fig-clear");
  $("#fig-count").textContent = t("n_shown", { n: list.length });
  renderViewToggles();
  renderInbox();
}

function renderFlows() {
  $("#flow-types").innerHTML = ["all", ...FLOW_TYPES, "community"].map((c) => chip("ftype", c,
    c === "all" ? t("all") : c === "community" ? t("community") : t("ft_" + c), S.flowType === c)).join("");
  renderViewToggles();
  if (S.flowType === "community") return renderCommunity();
  const list = sortItems(flows().filter((it) => S.flowType === "all" || it.type === S.flowType));
  $("#flow-list").innerHTML = list.length ? byLevel(list, S.view.flows) : noMatch("flow-clear");
  $("#flow-count").textContent = t("n_shown", { n: list.length });
}

// ---------- community flows (optional; server/flows.js) ----------
let commBusy = false;

function renderCommunity() {
  const list = sortItems(communityFlows());
  const checked = getSetting("commChecked", "");
  $("#flow-count").textContent = list.length ? t("n_shown", { n: list.length }) : "";
  const head = `<div class="card">
    <h2>${esc(t("comm_title"))}</h2>
    <p class="hint">${esc(t("comm_intro"))}</p>
    ${syncConfigured() ? `<button type="button" class="btn primary wide" data-act="comm-get" ${commBusy ? "disabled aria-busy=\"true\"" : ""}>${esc(t(commBusy ? "comm_checking" : checked ? "comm_refresh" : "comm_get"))}</button>
      <p class="hint" aria-live="polite">${esc(checked ? t("comm_checked", { d: new Date(checked).toLocaleString(S.lang, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) }) : t("comm_never"))}</p>
      ${checked ? `<label class="check"><input type="checkbox" id="comm-auto" ${getSetting("commAuto", false) ? "checked" : ""}><span>${esc(t("comm_auto"))}</span></label>` : ""}`
    : `<p class="alert warn">${esc(t("comm_unavailable"))}</p>`}
  </div>`;
  const empty = `<div class="empty"><p>${esc(t(checked ? "comm_empty" : "comm_empty_new"))}</p>
    <button type="button" class="btn" data-act="new-flow">${esc(t("new_flow"))}</button></div>`;
  $("#flow-list").innerHTML = head + (list.length ? byLevel(list, S.view.flows) : empty);
}

async function pullCommunity(force = false) {
  if (!syncConfigured() || commBusy) return;
  if (!navigator.onLine) return force ? toast(t("comm_offline")) : undefined;
  commBusy = true;
  if (S.flowType === "community") renderFlows();
  try {
    const before = new Set(communityFlows().map((i) => i.id));
    const { live, gone, cursor } = await fetchCommunity(getSetting("commCursor", null));
    if (live.length) await put("community", live.map(toItem));
    for (const cid of gone) await remove("community", itemId(cid));
    setSetting("commCursor", cursor);
    setSetting("commChecked", new Date().toISOString());
    if (force && !getSetting("commAutoSet", false)) {
      setSetting("commAuto", true); // first explicit check turns on "check when the app opens" (can be turned off)
      setSetting("commAutoSet", true);
    }
    await loadCommunity();
    const added = communityFlows().filter((i) => !before.has(i.id)).length;
    if (force || added) toast(added ? t("comm_new", { n: added }) : live.length || gone.length ? t("comm_updated") : t("comm_nothing"));
  } catch {
    if (force) toast(t("comm_err"));
  } finally {
    commBusy = false;
    refresh();
    renderSheet();
  }
}

// The sync key identifies you as the author of what you publish (same key as automatic sync).
async function ensureKey() {
  if (S.me?.key && S.me?.sid) return;
  const key = S.me?.key || newKey();
  S.me = { ...S.me, id: S.me?.id || uid(), key, sid: await sidFor(key) };
  setSetting("me", S.me);
}

const commError = (e) => t({ slow_down: "comm_slow", too_many: "comm_too_many", hidden: "comm_hidden", bad_steps: "comm_bad", bad_name: "comm_bad", bad_video: "comm_bad_video" }[e?.message] || (e?.status ? "comm_err_server" : "comm_err"));

async function publishItem(id) {
  const it = S.items.get(id);
  if (!it || it.community || it.kind !== "flow") return;
  if (!syncConfigured()) return toast(t("comm_unavailable"));
  if (!S.me?.name) {
    closeSheet();
    goto("friends");
    return toast(t("comm_need_name"));
  }
  const unknown = (it.steps || []).filter((s) => !FIG_IDS.has(s));
  if (unknown.length && !confirm(t("comm_own_steps", { x: unknown.map((s) => nm(S.items.get(s))).join(", ") }))) return;
  let flow;
  try {
    flow = cleanFlow({ name: nm(it), desc: txt(it.desc), type: it.type, level: it.level, steps: (it.steps || []).filter((s) => FIG_IDS.has(s)),
      video: it.video || "", tag: it.tag || "", by: S.me.name, lang: S.lang });
  } catch (e) {
    return toast(commError(e));
  }
  if (!it.pub && !confirm(t("comm_publish_confirm", { x: flow.name, by: flow.by }))) return;
  try {
    await ensureKey();
    const res = await publishFlow(flow, S.me.key, it.pub || "");
    const rec = { ...it, pub: res.id || it.pub, pubAt: new Date().toISOString() };
    await put("items", rec);
    S.items.set(rec.id, rec);
    toast(t(it.pub ? "comm_updated_mine" : "comm_published"));
  } catch (e) {
    toast(commError(e));
  }
  refresh();
  renderSheet();
}

async function unpublishItem(id, ask = true) {
  const it = S.items.get(id);
  if (!it?.pub) return true;
  if (ask && !confirm(t("comm_unpublish_confirm", { x: nm(it) }))) return false;
  try {
    await ensureKey();
    await unpublishFlow(it.pub, S.me.key);
  } catch (e) {
    if (e?.status !== 404) {
      toast(commError(e));
      return false;
    }
  }
  const rec = { ...it };
  delete rec.pub;
  delete rec.pubAt;
  await put("items", rec);
  S.items.set(rec.id, rec);
  if (ask) toast(t("comm_unpublished"));
  refresh();
  renderSheet();
  return true;
}

async function reportItem(id) {
  const it = S.items.get(id);
  if (!it?.community) return;
  const reason = prompt(t("comm_report_prompt", { x: nm(it) }), "");
  if (reason === null) return;
  try {
    await ensureKey();
    await reportFlow(it.cid, S.me.key, reason);
  } catch (e) {
    if (e?.status !== 404) return toast(commError(e));
  }
  setSetting("reported", [...new Set([...getSetting("reported", []), it.cid])].slice(-500));
  S.items.delete(id);
  closeSheet();
  refresh();
  toast(t("comm_reported"));
}

// A community flow copied into your own flows, to edit it your way.
async function copyItem(id) {
  const it = S.items.get(id);
  if (!it) return;
  const rec = { id: "u-" + uid(), kind: "flow", name: nm(it), type: it.type, level: it.level, steps: [...(it.steps || [])], tag: it.tag || "",
    desc: txt(it.desc), updated: new Date().toISOString(), ...(it.video && { video: it.video }) };
  await put("items", rec);
  S.items.set(rec.id, rec);
  refresh();
  openSheet({ type: "item", id: rec.id });
  toast(t("comm_copied"));
}

function communityBox(it) {
  if (it.community) {
    return `<div class="sync-box"><p class="hint">${esc(t("comm_by_long", { x: it.by || "?", d: fmtDate(new Date(it.updated).toISOString().slice(0, 10)) }))}</p>
      <p class="hint">${esc(t("comm_check_steps"))}</p>
      <div class="row"><button type="button" class="btn small" data-act="comm-copy" data-id="${esc(it.id)}">${esc(t("comm_copy"))}</button>
      <button type="button" class="btn small danger" data-act="comm-report" data-id="${esc(it.id)}">${esc(t("comm_report"))}</button></div></div>`;
  }
  if (it.kind !== "flow" || !it.id.startsWith("u-") || !syncConfigured()) return "";
  if (!it.pub) {
    return `<div class="sync-box"><h3>${esc(t("comm_title"))}</h3><p class="hint">${esc(t("comm_share_hint"))}</p>
      <button type="button" class="btn small" data-act="comm-publish" data-id="${esc(it.id)}">${esc(t("comm_share"))}</button></div>`;
  }
  const stale = (it.updated || "") > (it.pubAt || "");
  return `<div class="sync-box"><h3>${esc(t("comm_title"))}</h3>
    <p class="hint">${esc(t("comm_shared_on", { d: fmtDate(it.pubAt.slice(0, 10)) }))}</p>
    ${stale ? `<p class="alert warn">${esc(t("comm_stale"))}</p>` : ""}
    <div class="row">${stale ? `<button type="button" class="btn small primary" data-act="comm-publish" data-id="${esc(it.id)}">${esc(t("comm_update"))}</button>` : ""}
    <button type="button" class="btn small ghost" data-act="comm-unpublish" data-id="${esc(it.id)}">${esc(t("comm_unpublish"))}</button></div></div>`;
}

function itemOptions(sel = "", kinds = ["fig", "flow"]) {
  const g = (kind, label) => `<optgroup label="${esc(label)}">${sortItems(kind === "fig" ? figs() : flows())
    .map((i) => opt(i.id, nm(i), sel)).join("")}</optgroup>`;
  return kinds.map((k) => g(k, t(k === "fig" ? "tab_figures" : "tab_flows"))).join("");
}

function refHtml(r, preview) {
  const ig = igInfo(r.url);
  const v = videoInfo(r.url);
  const label = r.note || (ig ? t(ig.kind === "reel" ? "ig_reel" : "ig_post") : v ? `${platformName(r.url)} video` : platformName(r.url));
  return `<div class="ref" data-refbox="${esc(r.id)}">
    <div class="ref-top"><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${ig ? IG : v ? PLAY : ""}<span>${esc(label)}</span></a>
      ${preview && v ? `<button type="button" class="btn small ghost" data-act="preview" data-ref="${esc(r.id)}">${esc(t("preview"))}</button>` : ""}
      <button type="button" class="x" data-act="del-ref" data-ref="${esc(r.id)}" aria-label="${esc(t("delete"))}">×</button></div>
    <div class="embed" hidden></div></div>`;
}

function renderInbox() {
  const inbox = S.refs.filter((r) => !r.target || !S.items.has(r.target));
  const el = $("#inbox");
  el.hidden = !inbox.length;
  if (!inbox.length) return;
  el.innerHTML = `<h2>${esc(t("inbox_title", { n: inbox.length }))}</h2><p class="hint">${esc(t("inbox_hint"))}</p>` +
    inbox.map((r) => `${refHtml(r, false)}<select class="attach" data-change="attach" data-ref="${esc(r.id)}">
      <option value="">${esc(t("attach_to"))}</option>${itemOptions()}</select>`).join("");
}

// ---------- detail / editor sheet ----------
let sheetOpener = null;
function openSheet(state) {
  if ($("#sheet").hidden) sheetOpener = document.activeElement;
  S.sheet = state;
  renderSheet();
  $("#sheet").hidden = false;
  document.body.classList.add("locked");
  $("#sheet .sheet").scrollTop = 0;
  $("#sheet-title")?.focus({ preventScroll: true });
}

function closeSheet() {
  if (S.sheet?.type === "welcome") setSetting("onboarded", true);
  S.sheet = null;
  $("#sheet").hidden = true;
  $("#sheet-body").innerHTML = "";
  document.body.classList.remove("locked");
  // Back to what opened the sheet (or the same card, if the list was re-rendered meanwhile).
  const back = sheetOpener?.isConnected ? sheetOpener
    : sheetOpener?.dataset?.id ? $$(`[data-act="${sheetOpener.dataset.act}"]`).find((el) => el.dataset.id === sheetOpener.dataset.id && el.offsetParent) : null;
  back?.focus({ preventScroll: true });
  sheetOpener = null;
}

function renderSheet() {
  if (!S.sheet) return;
  const type = S.sheet.type;
  if (type === "item") {
    const it = S.items.get(S.sheet.id);
    if (!it) return closeSheet();
    $("#sheet-body").innerHTML = itemSheet(it);
  } else if (type === "edit") {
    $("#sheet-body").innerHTML = editorSheet(S.sheet.item);
  } else if (type === "library") {
    $("#sheet-body").innerHTML = librarySheet();
  } else if (type === "friend") {
    const fr = S.friends.find((f) => f.id === S.sheet.id);
    if (!fr) return closeSheet();
    $("#sheet-body").innerHTML = friendSheet(fr);
  } else if (type === "partner") {
    $("#sheet-body").innerHTML = partnerSheet(S.sheet.name);
  } else if (type === "incoming") {
    $("#sheet-body").innerHTML = incomingSheet(S.sheet.snap);
  } else if (type === "welcome") {
    $("#sheet-body").innerHTML = welcomeSheet();
  } else if (type === "link") {
    $("#sheet-body").innerHTML = sheetTop(t("share_title")) + `<p class="hint">${esc(t("link_manual"))}</p>
      <textarea readonly rows="5" class="mono" data-act-select>${esc(S.sheet.url)}</textarea>`;
  }
}

const sheetTop = (title) => `<div class="sheet-top"><h2 id="sheet-title" tabindex="-1">${esc(title)}</h2>
  <button type="button" class="x big" data-act="close" aria-label="${esc(t("close"))}">×</button></div>`;

function itemSheet(it) {
  const p = prog(it.id);
  const pr = S.practice.get(it.id);
  const refs = S.refs.filter((r) => r.target === it.id);
  const usedIn = it.kind === "fig" ? flows().filter((fl) => stepsOf(fl).includes(it.id)) : [];
  const seed = SEED_BY_ID.has(it.id);
  const edited = seed && SEED_BY_ID.get(it.id) !== it;
  const steps = it.kind === "flow" ? stepsOf(it) : [];
  return sheetTop(nm(it)) + `
    <p class="hint">${esc(it.kind === "fig" ? t("cat_" + it.cat) : t("ft_" + it.type))} · ${esc(t.list("levels")[it.level])} ${dots(it.level)}</p>
    ${it.kind === "flow" ? videoHtml(it) + galleryHtml(it) : galleryHtml(it) + videoHtml(it)}
    ${it.type === "pop" ? `<p class="alert warn" role="note"><b>⚠ ${esc(t("pop_safety_title"))}</b> ${esc(t("pop_safety"))}${it.safety ? " " + esc(txt(it.safety)) : ""}</p>` : ""}
    ${it.desc ? `<p class="desc">${esc(txt(it.desc))}</p>` : ""}
    ${it.kind === "flow" ? (steps.length ? `<ol class="steps-list">${steps.map((id) =>
      `<li><button type="button" class="link" data-act="open" data-id="${esc(id)}">${esc(nm(S.items.get(id)))}</button> ${pill(st(id))}</li>`).join("")}</ol>`
      : `<p class="alert warn">${esc(t("no_steps"))}</p>`) : ""}
    <p class="hint">${esc(t("status_hint"))}</p>
    ${ROLES.map((r) => `<fieldset class="${S.roles.includes(r) ? "" : "muted"}"><legend>${esc(t("role_" + r))}</legend>
      <div class="status-seg">${STATUS.map((v) => `<button type="button" class="s${v}" data-act="status" data-id="${esc(it.id)}" data-role="${r}" data-v="${v}" aria-pressed="${p[r] === v}">${esc(statusName(v))}</button>`).join("")}</div></fieldset>`).join("")}
    <p class="hint">${esc(pr ? t("practiced_last", { n: pr.count, d: fmtDate(pr.last) }) : t("never_practiced"))}</p>
    ${friendsOnItem(it.id)}
    <div class="row">
      <button type="button" class="btn primary" data-act="log-today" data-id="${esc(it.id)}">${esc(t("log_today"))}</button>
      <button type="button" class="btn ghost" data-act="fav" data-id="${esc(it.id)}" aria-pressed="${p.fav}">${p.fav ? "★" : "☆"} ${esc(t("fav"))}</button>
    </div>
    <label class="mt"><span>${esc(t("notes"))}</span><textarea id="item-notes" data-id="${esc(it.id)}" rows="3" placeholder="${esc(t("notes_ph"))}">${esc(p.notes)}</textarea></label>
    <h3>${IG} Instagram</h3>
    <a class="btn ig" href="${esc(tagUrl(tagOf(it)))}" target="_blank" rel="noopener noreferrer">${esc(t("search_ig"))} #${esc(tagOf(it))}</a>
    <div class="refs">${refs.map((r) => refHtml(r, true)).join("") || `<p class="hint">${esc(t("no_refs"))}</p>`}</div>
    <div class="inline"><input id="ref-url" type="url" inputmode="url" autocomplete="off" placeholder="${esc(t("ref_ph"))}">
      <button type="button" class="btn small" data-act="add-ref" data-id="${esc(it.id)}">${esc(t("add"))}</button></div>
    <p class="hint">${esc(t("ref_hint"))}</p>
    ${usedIn.length ? `<h3>${esc(t("used_in"))}</h3><div class="row">${usedIn.map((fl) =>
      `<button type="button" class="chip" data-act="open" data-id="${esc(fl.id)}">${esc(nm(fl))}</button>`).join("")}</div>` : ""}
    ${communityBox(it)}
    ${it.community ? "" : `<div class="row end">
      <button type="button" class="btn ghost small" data-act="edit" data-id="${esc(it.id)}">${esc(t("edit"))}</button>
      ${edited ? `<button type="button" class="btn ghost small" data-act="reset-item" data-id="${esc(it.id)}">${esc(t("reset"))}</button>` : ""}
      <button type="button" class="btn danger small" data-act="del-item" data-id="${esc(it.id)}">${esc(t(seed ? "hide" : "delete"))}</button>
    </div>`}`;
}

// Photo strip: your own photos (deletable) + credited reference photos + an "Add photo" tile.
function galleryHtml(it) {
  const mine = myPhotos(it.id).map((p) => `<figure class="mine"><img src="${esc(p.url)}" alt="${esc(nm(it))}" data-act="zoom">
      <figcaption>${esc(t("my_photo"))} · ${esc(fmtDate(p.added?.slice(0, 10)))}
      <button type="button" class="x" data-act="del-photo" data-photo="${esc(p.id)}" aria-label="${esc(t("delete"))}">×</button></figcaption></figure>`);
  const refs = refPhotos(it.id).map((p) => `<figure><img src="${esc(p.src)}" alt="${esc(nm(it))}" loading="lazy" data-act="zoom">
      <figcaption>${esc(t("photo_credit"))}: ${link(p.page, p.author || "Wikimedia Commons")}, ${link(p.licenseUrl, p.license)}</figcaption></figure>`);
  const yt = ytThumb(it.video);
  const frame = yt ? [`<figure><img src="${esc(yt)}" alt="${esc(nm(it))}" loading="lazy" data-act="zoom" referrerpolicy="no-referrer">
      <figcaption>${esc(t("thumb_credit"))}${it.ap ? ` · ${link(ACROPEDIA_BASE + encodeURIComponent(it.ap) + "/", "Acropedia")}` : ""}</figcaption></figure>`] : [];
  const add = `<label class="add-photo"><input type="file" accept="image/*" data-change="add-photo" data-id="${esc(it.id)}">
      <span>＋</span>${esc(t("add_photo"))}</label>`;
  return `<div class="photos">${[...mine, ...refs, ...frame].join("")}${add}</div>`;
}

// Friends' status on one figure or flow ("who can help me with this?").
function friendsOnItem(id) {
  const xs = S.friends.filter((f) => f.p?.[id] && (f.p[id][0] || f.p[id][1]));
  if (!xs.length) return "";
  const role = (f, i, r) => (f.roles.includes(r) && f.p[id][i] ? `${t("role_" + r)[0]} ${statusName(f.p[id][i])}` : "");
  return `<div class="friends-on"><span class="hint">${esc(t("friends_on_item"))}</span>${xs.map((f) =>
    `<button type="button" class="chip" data-act="friend" data-id="${esc(f.id)}"><span class="dot s${Math.max(f.p[id][0], f.p[id][1])}"></span>${esc(f.name)}
      <small>${esc([role(f, 0, "base"), role(f, 1, "flyer")].filter(Boolean).join(" · "))}</small></button>`).join("")}</div>`;
}

// ---------- Acropedia library ----------
const AP_TAGS = ["spin / roll", "star", "whip / pop", "reverse", "throne", "mermaid", "bird", "high / standing", "group (3+)", "shoulder", "bicep", "hand-to-hand", "foot-to-hand"];

async function loadAP() {
  if (!S.AP) S.AP = (await import("./acropedia.js")).AP;
  return S.AP;
}

function apVideo(code) {
  if (!code) return "";
  if (code.startsWith("y:")) return `https://www.youtube.com/watch?v=${code.slice(2)}`;
  if (code.startsWith("i:")) return `https://www.instagram.com/${code.slice(2)}/`;
  return code;
}

const trackedFlow = (apId) => flows().find((f) => f.ap === apId);

function librarySheet() {
  const n = S.AP?.length || 0;
  return sheetTop(t("lib_title")) + `
    <p class="hint">${esc(t("lib_sheet_hint", { n: n.toLocaleString(S.lang) }))}</p>
    <input id="lib-q" type="search" autocomplete="off" value="${esc(S.lib.q)}" placeholder="${esc(t("lib_search"))}">
    <div class="filters mt">${["", ...AP_TAGS].map((g) => `<button type="button" class="chip" data-act="lib-tag" data-v="${esc(g)}" aria-pressed="${S.lib.tag === g}">${esc(g || t("all"))}</button>`).join("")}</div>
    <label class="check"><input type="checkbox" id="lib-thumbs" ${S.thumbs ? "checked" : ""}><span>${esc(t("thumbs_label"))}</span></label>
    <div id="lib-list">${libList()}</div>
    <p class="hint">${esc(t("lib_credit"))} ${link(ACROPEDIA_ALL, "Acropedia · AcroLove")}</p>`;
}

function libList() {
  if (!S.AP) return `<p class="hint">…</p>`;
  const q = S.lib.q.trim().toLowerCase();
  const xs = S.AP.filter(([, name, fam, tags]) => (!S.lib.tag || tags.split("|").includes(S.lib.tag))
    && (!q || name.toLowerCase().includes(q) || fam.includes(q)));
  const rows = xs.slice(0, S.lib.n).map(([id, name, fam, tags, code]) => {
    const url = apVideo(code);
    const v = videoInfo(url);
    const mine = trackedFlow(id);
    const thumb = ytThumb(url);
    const sub = [fam && fam !== name.toLowerCase() ? `${t("lib_family")}: ${fam}` : "", tags.split("|").filter(Boolean).join(", "), url ? platformName(url) : ""].filter(Boolean);
    return `<div class="lib-row${thumb ? " has-thumb" : ""}">
      ${thumb ? `<img class="thumb" src="${esc(thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}
      <b>${esc(name)}</b><span class="hint">${esc(sub.join(" · "))}</span>
      <div class="row">
        ${v ? `<button type="button" class="btn small ghost" data-act="lib-play" data-ap="${esc(id)}">▶ ${esc(t("play_video"))}</button>` : url ? link(url, t("watch_on", { x: platformName(url) })) : ""}
        ${link(ACROPEDIA_BASE + encodeURIComponent(id) + "/", "Acropedia")}
        ${mine ? `<button type="button" class="btn small" data-act="open" data-id="${esc(mine.id)}">✓ ${esc(t("lib_in_flows"))}</button>`
          : `<button type="button" class="btn small" data-act="lib-track" data-ap="${esc(id)}">＋ ${esc(t("lib_track"))}</button>`}
      </div>
      <div class="embed" hidden></div>
    </div>`;
  }).join("");
  const more = xs.length > S.lib.n ? `<button type="button" class="btn wide" data-act="lib-more">${esc(t("lib_more", { n: xs.length - S.lib.n }))}</button>` : "";
  return `<p class="hint">${esc(t("lib_count", { n: xs.length }))}</p>${rows || `<p class="hint">${esc(t("none_match"))}</p>`}${more}`;
}

async function trackAP(apId) {
  const a = (await loadAP()).find((x) => x[0] === apId);
  if (!a) return null;
  const have = trackedFlow(apId);
  if (have) return have;
  const rec = { id: "ap-" + apId, kind: "flow", type: "washing", level: 3, name: a[1], steps: [], tag: "acroyogawashingmachine",
    ap: apId, updated: new Date().toISOString(), ...(a[4] && { video: apVideo(a[4]) }) };
  await put("items", rec);
  S.items.set(rec.id, rec);
  return rec;
}

// ---------- friends (no server: progress travels inside a link) ----------
function myNames() {
  const out = [];
  for (const it of S.items.values()) if (!SEED_BY_ID.has(it.id)) out.push([it.id, nm(it)]);
  return out;
}

const mySnap = () => buildSnap({
  me: { ...S.me, sync: syncOn() }, roles: S.roles, progress: S.progress, sessions: S.sessions, names: myNames(),
  stats: { sessions: S.sessions.length, minutes: totals(S.sessions).minutes, streak: streakWeeks(S.sessions) },
  includeSessions: getSetting("shareSessions", true)
});

const myLink = async () => `${location.origin}${location.pathname}#${SNAP_KEY}${await encodeSnap(mySnap())}`;

// ---------- automatic sync (optional; server/worker.js) ----------
// Upload: a few seconds after a change, and when the app goes to the background. Download: when the app
// opens, comes back online, or you open Friends (at most every 2 minutes unless you tap Refresh).
const syncOn = () => !!(S.sync && syncConfigured() && S.me?.id && S.me?.key && S.me?.sid);
const SYNC_DELAY = 8000;
let pushTimer = null, lastPull = 0, syncing = false;

function schedulePush() {
  if (!syncOn()) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushMine, SYNC_DELAY);
}

async function pushMine() {
  clearTimeout(pushTimer);
  pushTimer = null;
  if (!syncOn() || !S.me.name || !navigator.onLine) return;
  try {
    await pushSnap(mySnap(), S.me.key);
    setSetting("lastPush", new Date().toISOString());
    setSetting("syncErr", "");
  } catch (e) {
    if (e.status === 429) return schedulePush();
    setSetting("syncErr", String(e.message || e));
  }
  renderFriends();
}

async function pullFriends(force = false) {
  // Only friends whose last link carried a sync id (they had sync on) can be fetched.
  const syncing_ = S.friends.filter((f) => f.sy);
  if (!syncOn() || !syncing_.length || syncing || !navigator.onLine) {
    if (force && syncOn() && !syncing_.length) toast(t("sync_no_friends"));
    return;
  }
  if (!force && Date.now() - lastPull < 120000) return;
  syncing = true;
  lastPull = Date.now();
  try {
    const got = await pullSnaps(syncing_.map((f) => f.sy));
    const updated = [];
    for (const [sid, raw] of Object.entries(got)) {
      let snap;
      try { snap = validateSnap(raw); } catch { continue; }
      const old = S.friends.find((f) => f.sy === sid);
      // The snapshot must belong to the same person (profile id) and be newer.
      if (!old || snap.id !== old.id || snap.at <= old.at) continue;
      const rec = { ...snap, sy: snap.sy || sid, alias: old.alias, received: new Date().toISOString() };
      await put("friends", rec);
      S.friends = [rec, ...S.friends.filter((f) => f.id !== old.id)];
      updated.push(snap.name);
    }
    S.friends.sort((a, b) => (b.at || "").localeCompare(a.at || ""));
    setSetting("lastPull", new Date().toISOString());
    setSetting("syncErr", "");
    if (updated.length) {
      refresh();
      renderSheet();
      toast(t("sync_updated", { x: updated.join(", ") }));
    } else if (force) toast(t("sync_nothing"));
  } catch (e) {
    setSetting("syncErr", String(e.message || e));
    if (force) toast(t("sync_err"));
  } finally {
    syncing = false;
    renderFriends();
  }
}

async function setSync(on) {
  if (on) {
    if (!S.me?.name) return toast(t("me_needed"));
    const key = S.me.key || newKey();
    S.me = { ...S.me, key, sid: await sidFor(key) };
    setSetting("me", S.me);
    S.sync = true;
    setSetting("sync", true);
    await pushMine();
    await pullFriends(true);
  } else {
    S.sync = false;
    setSetting("sync", false);
    clearTimeout(pushTimer);
    try {
      if (S.me?.sid && syncConfigured()) await deleteSnap(S.me.sid, S.me.key);
      toast(t("sync_off_done"));
    } catch {
      toast(t("sync_off_offline"));
    }
    renderFriends();
  }
}

function syncHtml() {
  if (!syncConfigured()) return "";
  const err = getSetting("syncErr", "");
  const push = getSetting("lastPush", ""), pull = getSetting("lastPull", "");
  const when = (iso) => (iso ? new Date(iso).toLocaleString(S.lang, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "–");
  return `<div class="sync-box">
    <label class="check"><input type="checkbox" id="sync-on" ${S.sync ? "checked" : ""}><span><b>${esc(t("sync_label"))}</b></span></label>
    <p class="hint">${esc(t("sync_hint"))}</p>
    ${S.sync ? `<p class="${err ? "alert err" : "hint"}">${esc(err ? t("sync_err") : t("sync_status", { a: when(push), b: when(pull) }))}</p>
      <button type="button" class="btn small" data-act="sync-now">${esc(t("sync_refresh"))}</button>` : ""}
  </div>`;
}

async function shareMine() {
  if (!S.me?.name) return toast(t("me_needed"));
  const url = await myLink();
  const text = t("share_text", { name: S.me.name });
  try {
    if (navigator.share) {
      await navigator.share({ title: "AcroLog", text, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast(t("link_copied"));
    }
  } catch (e) {
    if (e?.name === "AbortError") return;
    openSheet({ type: "link", url });
  }
  setSetting("lastShared", new Date().toISOString());
  renderFriends();
}

async function copyMine() {
  if (!S.me?.name) return toast(t("me_needed"));
  const url = await myLink();
  try {
    await navigator.clipboard.writeText(url);
    toast(t("link_copied"));
  } catch {
    openSheet({ type: "link", url });
  }
  setSetting("lastShared", new Date().toISOString());
  renderFriends();
}

// A link someone sent you (opened, shared to AcroLog or pasted).
async function receiveSnap(code) {
  goto("friends");
  let snap;
  try {
    snap = await decodeSnap(code);
  } catch {
    return toast(t("friend_bad"));
  }
  if (snap.id === S.me?.id) return toast(t("friend_self"));
  const old = S.friends.find((f) => f.id === snap.id);
  if (old && old.at >= snap.at) {
    goto("friends");
    openSheet({ type: "friend", id: old.id });
    return toast(t("friend_same"));
  }
  if (old) {
    await saveFriend({ ...snap, alias: old.alias });
    goto("friends");
    openSheet({ type: "friend", id: snap.id });
    return toast(t("friend_updated", { x: snap.name, d: fmtDate(snap.at.slice(0, 10)) }));
  }
  goto("friends");
  openSheet({ type: "incoming", snap });
}

async function saveFriend(fr) {
  const rec = { ...fr, received: new Date().toISOString() };
  await put("friends", rec);
  S.friends = [rec, ...S.friends.filter((f) => f.id !== rec.id)].sort((a, b) => (b.at || "").localeCompare(a.at || ""));
  refresh();
}

const solidCount = (fr) => Object.values(fr.p || {}).filter((v) => Math.max(v[0], v[1]) >= 3).length;

function kpiRow(xs) {
  return `<div class="kpis">${xs.map(([v, l]) => `<div class="kpi"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join("")}</div>`;
}

function friendKpis(fr) {
  return kpiRow([
    [fr.stats.sessions, t("kpi_sessions")],
    [(fr.stats.minutes / 60).toFixed(fr.stats.minutes >= 600 ? 0 : 1), t("kpi_hours")],
    [fr.stats.streak, t("kpi_streak")],
    [solidCount(fr), t("kpi_solid_any")]
  ]);
}

function renderFriends() {
  const me = S.me;
  const changed = getSetting("changed", "");
  const shared = getSetting("lastShared", "");
  const stale = shared && changed > shared;
  $("#me-card").innerHTML = !me?.name || S.editingMe ? `
    <h2>${esc(t("me_title"))}</h2>
    <p class="hint">${esc(t("me_intro"))}</p>
    <label><span>${esc(t("me_name"))}</span><input id="me-name" value="${esc(me?.name || "")}" maxlength="40" autocomplete="nickname"></label>
    <label><span>${esc(t("me_note"))}</span><input id="me-note" value="${esc(me?.note || "")}" maxlength="120" placeholder="${esc(t("me_note_ph"))}"></label>
    <button type="button" class="btn primary wide" data-act="me-save">${esc(t("save"))}</button>`
    : `<div class="sess-top"><h2>${esc(me.name)}</h2><button type="button" class="btn small ghost" data-act="me-edit">${esc(t("edit"))}</button></div>
    ${me.note ? `<p class="hint">${esc(me.note)}</p>` : ""}
    ${syncHtml()}
    ${stale && !syncOn() ? `<p class="alert warn">${esc(t("share_stale", { d: fmtDate(shared.slice(0, 10)) }))}</p>`
      : `<p class="hint">${esc(shared ? t("share_last", { d: fmtDate(shared.slice(0, 10)) }) : t("share_never"))}</p>`}
    <div class="row">
      <button type="button" class="btn primary" data-act="share-me">${esc(t(shared ? "share_update" : "share_btn"))}</button>
      <button type="button" class="btn ghost" data-act="copy-me">${esc(t("copy_link"))}</button>
    </div>
    <label class="check mt"><input type="checkbox" id="share-sessions" ${getSetting("shareSessions", true) ? "checked" : ""}><span>${esc(t("share_sessions"))}</span></label>
    <p class="hint">${esc(t("share_what"))}</p>`;

  $("#friends").innerHTML = S.friends.map((fr) => {
    const tg = together(S.sessions, fr.alias || fr.name);
    const sub = [t("as_of", { d: fmtDate(fr.at.slice(0, 10)) }), tg.sessions.length ? t("n_together", { n: tg.sessions.length }) : ""].filter(Boolean);
    const old = daysAgo(fr.at) > 30;
    return `<button type="button" class="item${old ? "" : " s3"}" data-act="friend" data-id="${esc(fr.id)}">
      <span class="item-top"><b>${esc(fr.name)}</b><span class="hint">${esc(fr.roles.map((r) => t("role_" + r)).join(" + "))}</span></span>
      <span class="item-sub">${esc(sub.join(" · "))}</span>
      <span class="item-sub">${esc(t("friend_line", { s: solidCount(fr), n: fr.stats.sessions }))}</span></button>`;
  }).join("") || `<p class="hint">${esc(t("friends_none"))}</p>`;

  const counts = new Map();
  S.sessions.forEach((s) => (s.partners || []).forEach((p) => {
    const k = p.trim();
    if (!k || friendOf(k)) return;
    const c = counts.get(k.toLocaleLowerCase()) || { name: k, n: 0, last: "" };
    c.n++;
    if (s.date > c.last) c.last = s.date;
    counts.set(k.toLocaleLowerCase(), c);
  }));
  const ps = [...counts.values()].sort((a, b) => b.n - a.n);
  $("#log-partners").innerHTML = ps.map((p) => `<button type="button" class="item" data-act="partner" data-name="${esc(p.name)}">
      <span class="item-top"><b>${esc(p.name)}</b><span class="hint">${esc(t(p.n === 1 ? "n_session" : "n_sessions", { n: p.n }))}</span></span>
      <span class="item-sub">${esc(t("last_on", { d: fmtDate(p.last) }))}</span></button>`).join("")
    || `<p class="hint">${esc(t("no_partners"))}</p>`;
}

// Chips for a list of ids; entries you don't have yet (a friend's library pick) can be added with one tap.
function idChips(list, fr, extra = () => "") {
  return `<div class="row">${list.map((x) => {
    const id = x.id || x[0];
    const dot = S.items.has(id) ? `<span class="dot s${st(id)}"></span>` : "";
    const act = S.items.has(id) ? `data-act="open" data-id="${esc(id)}"` : id.startsWith("ap-") ? `data-act="lib-track" data-ap="${esc(id.slice(3))}"` : "disabled";
    return `<button type="button" class="chip" ${act}>${dot}${S.items.has(id) || !id.startsWith("ap-") ? "" : "＋ "}${esc(idName(id, fr))}${extra(x)}</button>`;
  }).join("")}</div>`;
}

function togetherHtml(name, fr) {
  const tg = together(S.sessions, name);
  if (!tg.sessions.length) return `<p class="hint">${esc(t("together_none", { x: name }))}</p>`;
  return `<p>${esc(t("together_line", { s: t(tg.sessions.length === 1 ? "n_session" : "n_sessions", { n: tg.sessions.length }), h: (tg.minutes / 60).toFixed(1), d: fmtDate(tg.last) }))}</p>
    ${tg.top.length ? `<p class="hint">${esc(t("together_top"))}</p>${idChips(tg.top, fr, (x) => ` <small>×${x[1]}</small>`)}` : ""}
    <div class="row mt">${tg.sessions.slice(0, 8).map((s) => `<span class="tag">${esc(fmtDate(s.date))}</span>`).join("")}</div>`;
}

function friendSheet(fr) {
  const cmp = compare(S.progress, fr, S.roles);
  const how = (x) => ` <small>${esc(t(x.how))}</small>`;
  return sheetTop(fr.name) + `
    ${fr.note ? `<p class="desc">${esc(fr.note)}</p>` : ""}
    <p class="${daysAgo(fr.at) > 30 ? "alert warn" : "hint"}">${esc(t("as_of_long", { d: fmtDate(fr.at.slice(0, 10), true), n: daysAgo(fr.at) }))}</p>
    ${friendKpis(fr)}
    <label class="mt"><span>${esc(t("alias"))}</span><input id="friend-alias" data-id="${esc(fr.id)}" value="${esc(fr.alias || fr.name)}" maxlength="40"></label>
    <p class="hint">${esc(t("alias_hint"))}</p>
    <h3>${esc(t("together_title"))}</h3>${togetherHtml(fr.alias || fr.name, fr)}
    <h3>${esc(t("pair_title"))}</h3>${cmp.pair.length ? idChips(cmp.pair, fr, how) : `<p class="hint">${esc(t("pair_none"))}</p>`}
    <h3>${esc(t("learn_title", { x: fr.name }))}</h3>${cmp.learn.length ? idChips(cmp.learn, fr) : `<p class="hint">${esc(t("cmp_none"))}</p>`}
    <h3>${esc(t("teach_title", { x: fr.name }))}</h3>${cmp.teach.length ? idChips(cmp.teach, fr) : `<p class="hint">${esc(t("cmp_none"))}</p>`}
    ${fr.rc?.length ? `<h3>${esc(t("their_sessions"))}</h3>${fr.rc.map(([d, m, ids]) => `<div class="card session"><b>${esc(fmtDate(d))}</b>
      <span class="hint">${m ? esc(m + " min") : ""}</span>${ids.length ? idChips(ids.map((id) => [id]), fr) : ""}</div>`).join("")}` : ""}
    <div class="row mt"><button type="button" class="btn primary" data-act="share-me">${esc(t("send_mine"))}</button></div>
    <p class="hint">${esc(t("update_how", { x: fr.name }))}</p>
    <div class="row end"><button type="button" class="btn danger small" data-act="friend-del" data-id="${esc(fr.id)}">${esc(t("delete"))}</button></div>`;
}

function partnerSheet(name) {
  return sheetTop(name) + `<h3>${esc(t("together_title"))}</h3>${togetherHtml(name, null)}
    <p class="alert warn mt">${esc(t("partner_invite", { x: name }))}</p>
    <button type="button" class="btn primary wide" data-act="share-me">${esc(t("send_mine"))}</button>`;
}

function incomingSheet(snap) {
  const match = [...new Set(S.sessions.flatMap((s) => s.partners || []))].find((p) => sameName(p, snap.name));
  return sheetTop(t("incoming_title", { x: snap.name })) + `
    ${snap.note ? `<p class="desc">${esc(snap.note)}</p>` : ""}
    <p class="hint">${esc(t("as_of_long", { d: fmtDate(snap.at.slice(0, 10), true), n: daysAgo(snap.at) }))}</p>
    ${friendKpis(snap)}
    <label><span>${esc(t("alias"))}</span><input id="incoming-alias" value="${esc(match || snap.name)}" maxlength="40"></label>
    <p class="hint">${esc(t("incoming_hint"))}</p>
    <button type="button" class="btn primary wide" data-act="friend-add">${esc(t("friend_add"))}</button>`;
}

// Video: tap-to-load player (nothing is fetched from YouTube/Instagram until Play), plus source links.
function videoHtml(it) {
  const v = videoInfo(it.video);
  const links = [];
  if (it.video) links.push(link(v?.url || it.video, t("watch_on", { x: platformName(it.video) })));
  if (it.ap) links.push(link(ACROPEDIA_BASE + encodeURIComponent(it.ap) + "/", t("acropedia_page")));
  if (it.guide) links.push(link(GUIDE_BASE + it.guide, t("tutorial")));
  if (Array.isArray(it.ext) && /^https:\/\//.test(it.ext[0])) links.push(link(it.ext[0], t("tutorial_ext", { x: it.ext[1] || platformName(it.ext[0]) })));
  if (!links.length) return "";
  return `<div class="video-box">
    ${v ? `<button type="button" class="player" data-act="play" data-id="${esc(it.id)}">${PLAY}<span>${esc(t("play_video"))}</span>
      <small>${esc(t("play_hint", { x: platformName(it.video) }))}</small></button>` : ""}
    <p class="links">${links.join(" · ")}</p>
    ${it.ap ? `<p class="hint">${esc(t("video_credit"))}</p>` : ""}
  </div>`;
}

function editorSheet(e) {
  const flow = e.kind === "flow";
  return sheetTop(t(e.isNew ? (flow ? "new_flow" : "new_fig") : "edit")) + `
    <label><span>${esc(t("name"))}</span><input id="e-name" value="${esc(e.name ? nm(e) : "")}" autocomplete="off"></label>
    ${flow ? `<label><span>${esc(t("type"))}</span><select id="e-type">${FLOW_TYPES.map((x) => opt(x, t("ft_" + x), e.type)).join("")}</select></label>`
      : `<label><span>${esc(t("category"))}</span><select id="e-cat">${CATS.map((x) => opt(x, t("cat_" + x), e.cat)).join("")}</select></label>`}
    <label><span>${esc(t("level"))}</span><select id="e-level">${LEVELS.map((l) => opt(l, t.list("levels")[l], e.level)).join("")}</select></label>
    <label><span>${esc(t("hashtag"))}</span><input id="e-tag" value="${esc(e.tag || "")}" placeholder="acroyoga" autocomplete="off"></label>
    <label><span>${esc(t("video_link"))}</span><input id="e-video" type="url" inputmode="url" value="${esc(e.video || "")}" placeholder="https://youtu.be/…" autocomplete="off"></label>
    <label><span>${esc(t("description"))}</span><textarea id="e-desc" rows="2">${esc(txt(e.desc))}</textarea></label>
    ${flow ? `<fieldset><legend>${esc(t("steps"))}</legend>
      <ol class="edit-steps">${e.steps.map((id, i) => `<li><span>${esc(nm(S.items.get(id)))}</span>
        <button type="button" class="x" data-act="step-move" data-i="${i}" data-d="-1" aria-label="↑" ${i ? "" : "disabled"}>↑</button>
        <button type="button" class="x" data-act="step-move" data-i="${i}" data-d="1" aria-label="↓" ${i < e.steps.length - 1 ? "" : "disabled"}>↓</button>
        <button type="button" class="x" data-act="step-del" data-i="${i}" aria-label="${esc(t("delete"))}">×</button></li>`).join("")}</ol>
      <div class="inline"><select id="e-add">${itemOptions("", ["fig"])}</select>
        <button type="button" class="btn small" data-act="step-add">${esc(t("add"))}</button></div></fieldset>` : ""}
    <p class="alert err" id="e-err" hidden></p>
    <button type="button" class="btn primary wide" data-act="save-item">${esc(t("save"))}</button>`;
}

function readEditor() {
  const e = S.sheet.item;
  const name = $("#e-name").value.trim();
  if (!(typeof e.name === "object" && name === nm(e))) e.name = name;
  if (e.kind === "flow") e.type = $("#e-type").value;
  else e.cat = $("#e-cat").value;
  e.level = Number($("#e-level").value);
  e.tag = $("#e-tag").value.trim().replace(/^#/, "");
  e.desc = $("#e-desc").value.trim();
  const v = $("#e-video").value.trim();
  e.video = v ? findUrl(v) || "" : "";
  return e;
}

async function saveItem() {
  const e = readEditor();
  if (!nm(e).trim() || nm(e) === "?") {
    const err = $("#e-err");
    err.textContent = t("name_needed");
    err.hidden = false;
    return;
  }
  const rec = { id: e.id, kind: e.kind, name: e.name, level: e.level, tag: e.tag, desc: e.desc, updated: new Date().toISOString() };
  if (e.video) rec.video = e.video;
  if (e.ap) rec.ap = e.ap;
  if (e.guide) rec.guide = e.guide;
  if (e.ext) rec.ext = e.ext;
  if (e.safety) rec.safety = e.safety;
  if (e.pub) Object.assign(rec, { pub: e.pub, pubAt: e.pubAt });
  if (e.kind === "flow") Object.assign(rec, { type: e.type, steps: e.steps });
  else rec.cat = e.cat;
  await put("items", rec);
  S.items.set(rec.id, rec);
  refresh();
  openSheet({ type: "item", id: rec.id });
}

// ---------- first run ----------
function welcomeSheet() {
  const rv = S.roles.length === 2 ? "both" : S.roles[0];
  return sheetTop(t("ob_title")) + `
    <p>${esc(t("ob_intro"))}</p>
    <label><span>${esc(t("ob_lang"))}</span><select id="ob-lang">${Object.entries(LANGS).map(([k, v]) => opt(k, v, S.lang)).join("")}</select></label>
    <fieldset><legend>${esc(t("roles_title"))}</legend><div class="choices">
      ${[["both", "roles_both"], ["base", "role_base"], ["flyer", "role_flyer"]].map(([v, k]) =>
        `<label><input type="radio" name="ob-roles" value="${v}" ${rv === v ? "checked" : ""}><span>${esc(t(k))}</span></label>`).join("")}</div></fieldset>
    <h3>${esc(t("ob_how"))}</h3>
    <ol class="ob-steps">${t.list("ob_steps").map((x, i) => `<li><span class="n">${i + 1}</span><span>${esc(x)}</span></li>`).join("")}</ol>
    <div class="ob-legend">${STATUS.map((v) => pill(v)).join("")}</div>
    <p class="hint">${esc(t("ob_private"))}</p>
    <button type="button" class="btn primary wide" data-act="ob-done" data-v="figures">${esc(t("cta_mark"))}</button>
    <button type="button" class="btn ghost wide mt" data-act="ob-done" data-v="log">${esc(t("cta_log"))}</button>`;
}

// ---------- log ----------
function renderLog() {
  const d = S.draft;
  if (!$("#s-date").value) $("#s-date").value = today();
  $("#s-items").innerHTML = d.items.length ? d.items.map((id) => `<span class="tag">${esc(nm(S.items.get(id)))}
    <button type="button" data-act="s-del" data-id="${esc(id)}" aria-label="${esc(t("delete"))}">×</button></span>`).join("")
    : `<span class="hint">${esc(t("nothing_yet"))}</span>`;
  $("#s-pick").innerHTML = itemOptions($("#s-pick").value);
  const quick = [...S.items.values()].filter((i) => [1, 2].includes(st(i.id)) && !d.items.includes(i.id))
    .sort((a, b) => (S.practice.get(b.id)?.last || "").localeCompare(S.practice.get(a.id)?.last || "")).slice(0, 10);
  $("#s-suggest").innerHTML = quick.map((i) => `<button type="button" class="chip" data-act="s-quick" data-id="${esc(i.id)}"><span class="dot s${st(i.id)}"></span>+ ${esc(nm(i))}</button>`).join("")
    || `<span class="hint">${esc(t("quick_none"))}</span>`;
  $("#s-mood").innerHTML = [1, 2, 3, 4, 5].map((v) => `<button type="button" data-act="mood" data-v="${v}" aria-pressed="${d.mood === v}">${esc(t.list("moods")[v])}</button>`).join("");
  $("#s-cancel").hidden = !d.editing;
  $("#s-repeat").hidden = !!d.editing || !S.sessions.length;
  const min = Number($("#s-min").value) || 0;
  $("#s-mins").innerHTML = [30, 60, 90, 120, 180].map((m) => `<button type="button" class="chip" data-act="s-min" data-v="${m}" aria-pressed="${min === m}">${m} min</button>`).join("");
  $("#s-title").textContent = t(d.editing ? "edit_session" : "new_session");
  const partners = [...new Set([...S.sessions.flatMap((s) => s.partners || []), ...S.friends.map((f) => f.alias || f.name)])].sort();
  $("#partners-dl").innerHTML = partners.map((p) => `<option value="${esc(p)}">`).join("");
  $("#sessions").innerHTML = S.sessions.slice(0, 60).map(sessionCard).join("")
    || `<div class="empty"><p>${esc(t("no_sessions_cta"))}</p><button type="button" class="btn" data-act="s-focus">${esc(t("cta_log"))}</button></div>`;
}

function sessionCard(s) {
  const items = (s.items || []).filter((id) => S.items.has(id));
  return `<article class="card session">
    <div class="sess-top"><b>${esc(fmtDate(s.date))}</b>
      <span class="hint">${[s.minutes ? s.minutes + " min" : "", s.mood ? t.list("moods")[s.mood] : ""].filter(Boolean).map(esc).join(" · ")}</span>
      <button type="button" class="btn small ghost" data-act="s-edit" data-id="${esc(s.id)}">${esc(t("edit"))}</button>
      <button type="button" class="x" data-act="s-remove" data-id="${esc(s.id)}" aria-label="${esc(t("delete"))}">×</button></div>
    ${s.partners?.length ? `<p class="hint">${esc(t("with"))} ${esc(s.partners.join(", "))}</p>` : ""}
    ${items.length ? `<div class="row">${items.map((id) => `<button type="button" class="chip" data-act="open" data-id="${esc(id)}"><span class="dot s${st(id)}"></span>${esc(nm(S.items.get(id)))}</button>`).join("")}</div>` : ""}
    ${s.notes ? `<p class="notes">${esc(s.notes)}</p>` : ""}
  </article>`;
}

function resetDraft() {
  S.draft = { items: [], mood: 0, editing: null };
  $("#session-form").reset();
  $("#s-date").value = today();
}

async function saveSession(ev) {
  ev.preventDefault();
  const d = S.draft;
  const old = d.editing ? S.sessions.find((s) => s.id === d.editing) : null;
  const s = {
    id: old?.id || uid(),
    created: old?.created || new Date().toISOString(),
    date: $("#s-date").value || today(),
    minutes: Math.max(0, Math.round(Number($("#s-min").value) || 0)),
    partners: $("#s-partners").value.split(",").map((x) => x.trim()).filter(Boolean),
    items: [...d.items],
    mood: d.mood,
    notes: $("#s-notes").value.trim()
  };
  if (!s.items.length && !s.minutes && !s.notes) return toast(t("session_empty"));
  await put("sessions", s);
  markChanged();
  S.sessions = [s, ...S.sessions.filter((x) => x.id !== s.id)];
  sortData();
  resetDraft();
  refresh();
  toast(t("session_saved"));
}

function editSession(id) {
  const s = S.sessions.find((x) => x.id === id);
  if (!s) return;
  S.draft = { items: [...(s.items || [])], mood: s.mood || 0, editing: s.id };
  $("#s-date").value = s.date;
  $("#s-min").value = s.minutes || "";
  $("#s-partners").value = (s.partners || []).join(", ");
  $("#s-notes").value = s.notes || "";
  renderLog();
  $("#session-form").scrollIntoView({ block: "start" });
}

async function logToday(id) {
  const d = today();
  let s = S.sessions.find((x) => x.date === d);
  if (s) {
    if (!s.items.includes(id)) s.items.push(id);
  } else {
    s = { id: uid(), created: new Date().toISOString(), date: d, minutes: 0, partners: [], items: [id], mood: 0, notes: "" };
    S.sessions.unshift(s);
  }
  await put("sessions", s);
  markChanged();
  sortData();
  refresh();
  renderSheet();
  toast(t("logged_today"));
}

// ---------- progress ----------
function weeklyChart(weeks) {
  const W = 360, H = 130, pad = 18, bw = (W - 8) / weeks.length;
  const max = Math.max(1, ...weeks.map((w) => w.count));
  const bars = weeks.map((w, i) => {
    const h = Math.round((H - pad * 2) * (w.count / max));
    const x = 4 + i * bw + 3, y = H - pad - h;
    return `<rect x="${x}" y="${y}" width="${bw - 6}" height="${Math.max(h, 1)}" rx="3" class="${w.count ? "bar" : "bar0"}"><title>${esc(fmtDate(w.week))}: ${w.count}</title></rect>`
      + (w.count ? `<text x="${x + (bw - 6) / 2}" y="${y - 4}" text-anchor="middle">${w.count}</text>` : "");
  }).join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t("weekly_title"))}">${bars}
    <text x="4" y="${H - 3}" class="axis">${esc(fmtDate(weeks[0].week))}</text>
    <text x="${W - 4}" y="${H - 3}" class="axis" text-anchor="end">${esc(t("this_week"))}</text></svg>`;
}

function distBar(counts) {
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  return `<div class="dist">${counts.map((c, v) => c ? `<span class="s${v}" style="flex:${c}" title="${esc(statusName(v))}: ${c}">${c}</span>` : "").join("")}</div>`;
}

function renderProgress() {
  const tot = totals(S.sessions);
  const F = figs(), FL = flows();
  const solid = F.filter((i) => st(i.id) >= 3).length;
  $("#kpis").innerHTML = [
    [tot.count, t("kpi_sessions")],
    [(tot.minutes / 60).toFixed(tot.minutes >= 600 ? 0 : 1), t("kpi_hours")],
    [streakWeeks(S.sessions), t("kpi_streak")],
    [`${solid}/${F.length}`, t("kpi_solid")]
  ].map(([v, l]) => `<div class="kpi"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join("");
  $("#weekly").innerHTML = weeklyChart(weekly(S.sessions, 12));
  const legend = `<div class="legend">${STATUS.map((v) => `<span><span class="dot s${v}"></span>${esc(statusName(v))}</span>`).join("")}</div>`;
  $("#dist").innerHTML = S.roles.map((r) => `<h3>${esc(t("role_" + r))}</h3>
    <p class="hint">${esc(t("tab_figures"))}</p>${distBar(statusCounts(F, S.progress, [r]))}
    <p class="hint">${esc(t("tab_flows"))}</p>${distBar(statusCounts(FL, S.progress, [r]))}`).join("") + legend;
  $("#levels").innerHTML = LEVELS.map((l) => {
    const xs = F.filter((i) => i.level === l);
    const done = xs.filter((i) => st(i.id) >= 3).length;
    const pct = xs.length ? Math.round((100 * done) / xs.length) : 0;
    return `<div class="lvl-row"><span>${esc(t.list("levels")[l])}</span><div class="meter"><span style="width:${pct}%"></span></div><span class="n">${done}/${xs.length}</span></div>`;
  }).join("");
  const sug = suggestions([...F, ...FL], S.progress, S.roles);
  const learningIn = (id) => S.roles.filter((r) => [1, 2].includes(prog(id)[r]))
    .map((r) => `${t("role_" + r)}: ${statusName(prog(id)[r])}`).join(" · ");
  $("#next").innerHTML = sug.length ? sug.map(({ it, why }) => `<button type="button" class="item s${why === "going" ? 1 : 0}" data-act="open" data-id="${esc(it.id)}">
      <span class="item-top"><b>${esc(nm(it))}</b>${dots(it.level)}</span>
      <span class="item-sub">${esc(why === "going" ? `${t("why_going")} · ${learningIn(it.id)}` : t("why_next"))}</span></button>`).join("")
    : `<p class="hint">${esc(t("next_none"))}</p>`;
  const pc = new Map();
  S.sessions.forEach((s) => (s.partners || []).forEach((p) => pc.set(p, (pc.get(p) || 0) + 1)));
  const top = [...pc].sort((a, b) => b[1] - a[1]).slice(0, 6);
  $("#partners").innerHTML = top.length ? `<table class="sum">${top.map(([p, n]) => `<tr><td><button type="button" class="link" data-act="partner" data-name="${esc(p)}">${esc(p)}</button></td><td class="n">${esc(t(n === 1 ? "n_session" : "n_sessions", { n }))}</td></tr>`).join("")}</table>`
    : `<p class="hint">${esc(t("no_partners"))}</p>`;
  $("#progress-empty").hidden = !!(tot.count || S.progress.size);
}

function renderData() {
  $("#restore-hidden").hidden = !S.hidden;
  $("#restore-hidden").textContent = t("restore_hidden", { n: S.hidden });
}

// ---------- actions ----------
const playerFrame = (v) => v.kind === "youtube"
  ? `<iframe class="yt" src="${esc(v.embed)}&autoplay=1" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="YouTube"></iframe>`
  : `<iframe src="${esc(v.embed)}" loading="lazy" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups" title="Instagram"></iframe>`;

async function addPhoto(input) {
  const file = input.files?.[0];
  const target = input.dataset.id;
  input.value = "";
  if (!file || !S.items.has(target)) return;
  try {
    const blob = await shrinkImage(file);
    const p = { id: uid(), target, blob, added: new Date().toISOString() };
    await put("photos", p);
    S.photos.unshift({ ...p, url: URL.createObjectURL(blob) });
    refresh();
    renderSheet();
    toast(t("photo_saved"));
  } catch {
    toast(t("photo_bad"));
  }
}

async function onClick(e) {
  const b = e.target.closest("[data-act]");
  if (!b) {
    if (e.target.id === "sheet") closeSheet();
    const g = e.target.closest("[data-goto]");
    if (g) goto(g.dataset.goto);
    return;
  }
  e.preventDefault();
  const { act, id } = b.dataset;
  switch (act) {
    case "filter": {
      const g = b.dataset.group, v = b.dataset.v;
      if (g === "cat") S.fig.cat = v;
      if (g === "status") S.fig.status = v;
      if (g === "ftype") S.flowType = v;
      return g === "ftype" ? renderFlows() : renderFigures();
    }
    case "open": return openSheet({ type: "item", id });
    case "close": return closeSheet();
    case "library": {
      openSheet({ type: "library" });
      await loadAP();
      if (S.sheet?.type === "library") renderSheet();
      return;
    }
    case "lib-tag":
      S.lib.tag = b.dataset.v;
      S.lib.n = LIB_PAGE;
      $$("[data-act=lib-tag]").forEach((x) => x.setAttribute("aria-pressed", x === b));
      $("#lib-list").innerHTML = libList();
      return;
    case "lib-more":
      S.lib.n += LIB_PAGE;
      $("#lib-list").innerHTML = libList();
      return;
    case "lib-play": {
      const a = (await loadAP()).find((x) => x[0] === b.dataset.ap);
      const v = videoInfo(apVideo(a?.[4]));
      const box = b.closest(".lib-row")?.querySelector(".embed");
      if (!v || !box) return;
      box.innerHTML = playerFrame(v);
      box.hidden = false;
      return b.remove();
    }
    case "lib-track": {
      const rec = await trackAP(b.dataset.ap);
      if (!rec) return;
      toast(t("lib_tracked", { x: nm(rec) }));
      refresh();
      if (S.sheet?.type === "library") $("#lib-list").innerHTML = libList();
      else renderSheet();
      return;
    }
    case "me-edit":
      S.editingMe = true;
      return renderFriends();
    case "me-save": {
      const name = $("#me-name").value.trim().slice(0, 40);
      if (!name) return toast(t("me_needed"));
      S.me = { ...S.me, id: S.me?.id || uid(), name, note: $("#me-note").value.trim().slice(0, 120) };
      setSetting("me", S.me);
      S.editingMe = false;
      schedulePush();
      return renderFriends();
    }
    case "sync-now":
      await pushMine();
      return pullFriends(true);
    case "share-me": return shareMine();
    case "copy-me": return copyMine();
    case "friend": return openSheet({ type: "friend", id });
    case "partner": {
      const fr = friendOf(b.dataset.name);
      return openSheet(fr ? { type: "friend", id: fr.id } : { type: "partner", name: b.dataset.name });
    }
    case "friend-paste": {
      const code = snapFromText($("#friend-link").value);
      if (!code) return toast(t("friend_bad"));
      $("#friend-link").value = "";
      return receiveSnap(code);
    }
    case "friend-add": {
      const snap = S.sheet?.snap;
      if (!snap) return;
      await saveFriend({ ...snap, alias: $("#incoming-alias").value.trim().slice(0, 40) || snap.name });
      toast(t("friend_added", { x: snap.name }));
      return openSheet({ type: "friend", id: snap.id });
    }
    case "friend-del": {
      const fr = S.friends.find((f) => f.id === id);
      if (!fr || !confirm(t("friend_del_confirm", { x: fr.name }))) return;
      await remove("friends", id);
      S.friends = S.friends.filter((f) => f.id !== id);
      closeSheet();
      return refresh();
    }
    case "status": {
      const p = prog(id);
      p[b.dataset.role] = Number(b.dataset.v);
      await saveProgress(p);
      $$(`[data-act=status][data-role=${b.dataset.role}]`, b.parentElement).forEach((x) => x.setAttribute("aria-pressed", x === b));
      return refresh();
    }
    case "fav": {
      const p = prog(id);
      p.fav = !p.fav;
      await saveProgress(p);
      b.setAttribute("aria-pressed", p.fav);
      b.textContent = `${p.fav ? "★" : "☆"} ${t("fav")}`;
      return refresh();
    }
    case "log-today": return logToday(id);
    case "view": {
      S.view = { ...S.view, [b.dataset.tab]: b.dataset.v === "grid" ? "grid" : "list" };
      setSetting("view", S.view);
      return b.dataset.tab === "flows" ? renderFlows() : renderFigures();
    }
    case "fig-clear":
      S.fig = { q: "", cat: "all", status: "all" };
      $("#fig-q").value = "";
      return renderFigures();
    case "flow-clear":
      S.flowType = "all";
      return renderFlows();
    case "welcome": return openSheet({ type: "welcome" });
    case "ob-done":
      setSetting("onboarded", true);
      closeSheet();
      goto(b.dataset.v);
      if (b.dataset.v === "log") $("#s-min").focus();
      return;
    case "s-min":
      $("#s-min").value = b.dataset.v;
      return renderLog();
    case "s-focus":
      window.scrollTo(0, 0);
      return $("#s-min").focus();
    case "s-repeat": {
      const last = S.sessions[0];
      if (!last) return;
      S.draft.items = [...new Set([...S.draft.items, ...(last.items || []).filter((x) => S.items.has(x))])];
      if (!$("#s-min").value && last.minutes) $("#s-min").value = last.minutes;
      if (!$("#s-partners").value && last.partners?.length) $("#s-partners").value = last.partners.join(", ");
      renderLog();
      return toast(t("repeat_done"));
    }
    case "comm-get": return pullCommunity(true);
    case "comm-publish": return publishItem(id);
    case "comm-unpublish": return unpublishItem(id);
    case "comm-report": return reportItem(id);
    case "comm-copy": return copyItem(id);
    case "add-ref": {
      const inp = $("#ref-url");
      const url = findUrl(inp.value);
      if (!url) return toast(t("ref_bad"));
      if (!(await addRef(url, id))) toast(t("ref_dup"));
      refresh();
      return renderSheet();
    }
    case "del-ref": {
      await remove("refs", b.dataset.ref);
      S.refs = S.refs.filter((r) => r.id !== b.dataset.ref);
      refresh();
      return renderSheet();
    }
    case "preview": {
      const r = S.refs.find((x) => x.id === b.dataset.ref);
      const v = videoInfo(r?.url);
      const box = b.closest(".ref")?.querySelector(".embed");
      if (!v || !box) return;
      box.innerHTML = playerFrame(v);
      box.hidden = false;
      return b.remove();
    }
    case "play": {
      const v = videoInfo(S.items.get(id)?.video);
      if (!v) return;
      const wrap = document.createElement("div");
      wrap.className = "embed";
      wrap.innerHTML = playerFrame(v);
      return b.replaceWith(wrap);
    }
    case "zoom": {
      $("#zoom img").src = b.src;
      $("#zoom").hidden = false;
      return;
    }
    case "zoom-close":
      $("#zoom").hidden = true;
      return;
    case "del-photo": {
      if (!confirm(t("photo_del_confirm"))) return;
      const p = S.photos.find((x) => x.id === b.dataset.photo);
      await remove("photos", b.dataset.photo);
      if (p) URL.revokeObjectURL(p.url);
      S.photos = S.photos.filter((x) => x !== p);
      refresh();
      return renderSheet();
    }
    case "new-fig":
    case "new-flow": {
      const flow = act === "new-flow";
      return openSheet({ type: "edit", item: { id: "u-" + uid(), kind: flow ? "flow" : "fig", isNew: true, name: "", level: 1, cat: "lbase", type: "flow", steps: [], tag: "" } });
    }
    case "edit": {
      const it = S.items.get(id);
      return openSheet({ type: "edit", item: { ...it, steps: [...(it.steps || [])] } });
    }
    case "save-item": return saveItem();
    case "step-add": {
      const e2 = readEditor();
      e2.steps.push($("#e-add").value);
      const keep = $("#e-add").value;
      renderSheet();
      $("#e-add").value = keep;
      return;
    }
    case "step-move": {
      const e2 = readEditor(), i = Number(b.dataset.i), j = i + Number(b.dataset.d);
      [e2.steps[i], e2.steps[j]] = [e2.steps[j], e2.steps[i]];
      return renderSheet();
    }
    case "step-del": {
      readEditor().steps.splice(Number(b.dataset.i), 1);
      return renderSheet();
    }
    case "reset-item": {
      await remove("items", id);
      S.items.set(id, SEED_BY_ID.get(id));
      refresh();
      return renderSheet();
    }
    case "del-item": {
      const it = S.items.get(id);
      if (!it || it.community) return;
      if (!confirm(t(SEED_BY_ID.has(id) ? "hide_confirm" : it.pub ? "delete_pub_confirm" : "delete_confirm", { x: nm(it) }))) return;
      if (it.pub && !(await unpublishItem(id, false))) return;
      if (SEED_BY_ID.has(id)) {
        await put("items", { id, hidden: true });
        S.hidden++;
      } else {
        await remove("items", id);
        await remove("progress", id);
        S.progress.delete(id);
        for (const p of myPhotos(id)) await remove("photos", p.id);
        S.photos = S.photos.filter((p) => p.target !== id);
      }
      S.items.delete(id);
      closeSheet();
      return refresh();
    }
    case "s-add": {
      const v = $("#s-pick").value;
      if (v && !S.draft.items.includes(v)) S.draft.items.push(v);
      return renderLog();
    }
    case "s-quick":
      if (!S.draft.items.includes(id)) S.draft.items.push(id);
      return renderLog();
    case "s-del":
      S.draft.items = S.draft.items.filter((x) => x !== id);
      return renderLog();
    case "mood":
      S.draft.mood = S.draft.mood === Number(b.dataset.v) ? 0 : Number(b.dataset.v);
      return renderLog();
    case "s-edit": return editSession(id);
    case "s-cancel":
      resetDraft();
      return renderLog();
    case "s-remove": {
      if (!confirm(t("session_del_confirm"))) return;
      await remove("sessions", id);
      markChanged();
      S.sessions = S.sessions.filter((s) => s.id !== id);
      sortData();
      if (S.draft.editing === id) resetDraft();
      return refresh();
    }
    case "export": {
      const data = await exportAll();
      // Your profile (and sync key) moves with the backup, so a new phone keeps the same identity for friends.
      if (S.me) Object.assign(data, { me: S.me, sync: S.sync });
      const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `acrolog-${today()}.json`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      return;
    }
    case "restore-hidden": {
      const hidden = (await all("items")).filter((i) => i.hidden);
      for (const h of hidden) await remove("items", h.id);
      await load();
      refresh();
      return toast(t("restored"));
    }
    case "delete-all": {
      if (!confirm(t("delete_all_confirm"))) return;
      if (S.me?.sid && syncConfigured()) {
        clearTimeout(pushTimer);
        try { await deleteSnap(S.me.sid, S.me.key); } catch { toast(t("sync_off_offline")); }
      }
      // Your published community flows are removed from the server too.
      for (const it of [...S.items.values()].filter((i) => i.pub)) await unpublishItem(it.id, false).catch(() => {});
      await clearAll();
      S.me = null;
      S.thumbs = false;
      S.sync = false;
      await load();
      resetDraft();
      renderAll();
      return toast(t("deleted_all"));
    }
    case "check-update": {
      // The only request the app makes on its own initiative, and only on this tap: fetch sw.js and compare.
      const reg = await navigator.serviceWorker?.getRegistration();
      if (!reg) return toast(t("update_none"));
      try {
        await reg.update();
      } catch {
        return toast(t("update_offline"));
      }
      if (reg.installing || reg.waiting) {
        toast(t("update_found"));
        navigator.serviceWorker.addEventListener("controllerchange", () => location.reload(), { once: true });
      } else toast(t("update_latest"));
      return;
    }
    case "install": {
      if (!S.install) return;
      S.install.prompt();
      S.install = null;
      return applyStatic();
    }
  }
}

async function onChange(e) {
  const el = e.target;
  if (el.id === "lang" || el.id === "ob-lang") {
    S.lang = el.value;
    setSetting("lang", S.lang);
    t = makeT(S.lang);
    return renderAll();
  }
  if (el.name === "roles" || el.name === "ob-roles") {
    S.roles = el.value === "both" ? ["base", "flyer"] : [el.value];
    setSetting("roles", S.roles);
    $$("[name=roles]").forEach((r) => { r.checked = r.value === el.value; });
    return refresh();
  }
  if (el.id === "thumbs" || el.id === "lib-thumbs") {
    S.thumbs = el.checked;
    setSetting("thumbs", S.thumbs);
    if (el.id === "lib-thumbs") $("#lib-list").innerHTML = libList();
    return refresh();
  }
  if (el.id === "share-sessions") {
    setSetting("shareSessions", el.checked);
    return schedulePush();
  }
  if (el.id === "sync-on") return setSync(el.checked);
  if (el.id === "comm-auto") return setSetting("commAuto", el.checked);
  if (el.id === "friend-alias") {
    const fr = S.friends.find((f) => f.id === el.dataset.id);
    if (!fr) return;
    fr.alias = el.value.trim().slice(0, 40) || fr.name;
    await put("friends", fr);
    refresh();
    return renderSheet();
  }
  if (el.id === "item-notes") {
    const p = prog(el.dataset.id);
    p.notes = el.value.trim();
    return saveProgress(p);
  }
  if (el.dataset.change === "add-photo") return addPhoto(el);
  if (el.dataset.change === "attach" && el.value) {
    const r = S.refs.find((x) => x.id === el.dataset.ref);
    if (!r) return;
    r.target = el.value;
    await put("refs", r);
    toast(t("ref_attached", { x: nm(S.items.get(r.target)) }));
    return refresh();
  }
  if (el.id === "import" && el.files?.[0]) {
    try {
      const data = JSON.parse(await el.files[0].text());
      const n = await importAll(data);
      const me = data.me;
      if (me && typeof me.id === "string" && typeof me.name === "string") {
        S.me = { id: me.id.slice(0, 80), name: me.name.slice(0, 40), note: String(me.note || "").slice(0, 120), ...(typeof me.key === "string" && { key: me.key }), ...(/^[0-9a-f]{32}$/.test(me.sid || "") && { sid: me.sid }) };
        setSetting("me", S.me);
        S.sync = !!data.sync && !!S.me.key && !!S.me.sid;
        setSetting("sync", S.sync);
      }
      await load();
      renderAll();
      toast(t("imported", { n }));
    } catch {
      toast(t("import_bad"));
    }
    el.value = "";
  }
}

// Web Share Target: Instagram → Share → AcroLog opens ./?text=...&url=... (see manifest.webmanifest).
async function handleShare() {
  const q = new URLSearchParams(location.search);
  if (![...q.keys()].length) return;
  const raw = [q.get("url"), q.get("text"), q.get("title")].filter(Boolean).join(" ");
  history.replaceState(null, "", location.pathname + "#figures");
  const code = snapFromText(raw);
  if (code) return receiveSnap(code);
  const url = findUrl(raw);
  if (!url) return;
  const note = (q.get("title") || "").trim();
  toast(t((await addRef(url, null, note && !note.startsWith("http") ? note : "")) ? "ref_shared" : "ref_dup"));
}

// A friend's link opens the app at ./#add=<snapshot>.
function onHash() {
  const code = snapFromText(location.hash);
  if (!code) return goto(location.hash.slice(1));
  receiveSnap(code); // goes to the Friends tab (and replaces the long hash)
}

async function init() {
  await load();
  renderAll();
  const incoming = snapFromText(location.hash);
  goto(incoming ? "friends" : location.hash.slice(1) || "figures");
  await handleShare();
  if (incoming) receiveSnap(incoming);
  else if (!getSetting("onboarded", false) && !S.sessions.length && !S.progress.size) openSheet({ type: "welcome" });
  else setSetting("onboarded", true);
  document.addEventListener("click", onClick);
  document.addEventListener("change", onChange);
  $("#fig-q").addEventListener("input", (e) => { S.fig.q = e.target.value; renderFigures(); });
  $("#session-form").addEventListener("submit", saveSession);
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!$("#zoom").hidden) $("#zoom").hidden = true;
    else if (S.sheet) closeSheet();
  });
  $("#acropedia-all").href = ACROPEDIA_ALL;
  window.addEventListener("hashchange", onHash);
  document.addEventListener("input", (e) => {
    if (e.target.id !== "lib-q") return;
    S.lib.q = e.target.value;
    S.lib.n = LIB_PAGE;
    $("#lib-list").innerHTML = libList();
  });
  // Sync (only when turned on): catch up on open and when back online; flush pending uploads when leaving.
  // Community flows: checked when the app opens only after you asked for them once (Flows → Community).
  if (getSetting("commAuto", false)) pullCommunity();
  if (syncOn()) {
    if (getSetting("changed", "") > getSetting("lastPush", "")) pushMine();
    pullFriends();
  }
  window.addEventListener("online", () => { if (syncOn()) { pushMine(); lastPull = 0; pullFriends(); } });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && pushTimer) pushMine();
    if (document.visibilityState === "visible") pullFriends();
  });
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    S.install = e;
    applyStatic();
  });
  if ("serviceWorker" in navigator && window.isSecureContext) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

init();
