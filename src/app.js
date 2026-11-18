import { LANGS, makeT } from "./i18n.js";
import { SEED, CATS, FLOW_TYPES, ROLES, STATUS, LEVELS, GUIDE_BASE, ACROPEDIA_BASE, ACROPEDIA_ALL } from "./catalog.js";
import { PHOTOS } from "./photos.js";
import { videoInfo, platformName, shrinkImage } from "./media.js";
import { all, put, remove, clearAll, exportAll, importAll, getSetting, setSetting } from "./store.js";
import { today, weekly, streakWeeks, totals, practice, statusOf, statusCounts, suggestions, findUrl, igInfo, tagUrl } from "./stats.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const TABS = ["figures", "flows", "log", "progress", "data"];
const SEED_BY_ID = new Map(SEED.map((i) => [i.id, i]));
const browserLang = (navigator.language || "en").slice(0, 2);
const PLAY = `<svg class="ig-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z" fill="currentColor"/></svg>`;
const IG = `<svg class="ig-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>`;

const S = {
  lang: getSetting("lang", LANGS[browserLang] ? browserLang : "en"),
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
  install: null
};
let t = makeT(S.lang);

// ---------- helpers ----------
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const nm = (it) => (!it ? "?" : typeof it.name === "string" ? it.name : it.name[S.lang] || it.name.en);
const figs = () => [...S.items.values()].filter((i) => i.kind === "fig");
const flows = () => [...S.items.values()].filter((i) => i.kind === "flow");
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
const thumbOf = (id) => myPhotos(id)[0]?.url || refPhotos(id)[0]?.src || "";
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
  const [items, progress, sessions, refs, photos] = await Promise.all(["items", "progress", "sessions", "refs", "photos"].map(all));
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
  sortData();
}

function sortData() {
  S.sessions.sort((a, b) => b.date.localeCompare(a.date) || (b.created || "").localeCompare(a.created || ""));
  S.refs.sort((a, b) => (b.added || "").localeCompare(a.added || ""));
  S.practice = practice(S.sessions);
}

async function saveProgress(p) {
  p.updated = new Date().toISOString();
  S.progress.set(p.id, p);
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
  $$("[data-i18n-list]").forEach((el) => { el.innerHTML = t.list(el.dataset.i18nList).map((x) => `<li>${esc(x)}</li>`).join(""); });
  $("#lang").innerHTML = Object.entries(LANGS).map(([k, v]) => opt(k, v, S.lang)).join("");
  const rv = S.roles.length === 2 ? "both" : S.roles[0];
  $$("[name=roles]").forEach((r) => { r.checked = r.value === rv; });
  $("#install").hidden = !S.install;
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
  renderData();
}

function goto(tab) {
  if (!TABS.includes(tab)) tab = "figures";
  $$(".tab").forEach((s) => { s.hidden = s.dataset.tab !== tab; });
  $$("#tabs button").forEach((b) => b.setAttribute("aria-current", b.dataset.goto === tab ? "page" : "false"));
  if (location.hash !== "#" + tab) history.replaceState(null, "", "#" + tab);
  window.scrollTo(0, 0);
}

// ---------- lists ----------
const chip = (group, v, label, on, pre = "") =>
  `<button type="button" class="chip" data-act="filter" data-group="${group}" data-v="${esc(v)}" aria-pressed="${on}">${pre}${esc(label)}</button>`;

function itemCard(it) {
  const p = S.progress.get(it.id);
  const pr = S.practice.get(it.id);
  const nrefs = S.refs.filter((r) => r.target === it.id).length;
  const sub = [it.kind === "fig" ? t("cat_" + it.cat) : t("ft_" + it.type)];
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

function byLevel(list) {
  return LEVELS.map((l) => {
    const xs = list.filter((i) => i.level === l);
    return xs.length ? `<h3 class="lvl-h">${esc(t.list("levels")[l])} <span class="hint">${xs.length}</span></h3><div class="items">${xs.map(itemCard).join("")}</div>` : "";
  }).join("");
}

function renderFigures() {
  const f = S.fig;
  $("#fig-cats").innerHTML = ["all", ...CATS].map((c) => chip("cat", c, c === "all" ? t("all") : t("cat_" + c), f.cat === c)).join("");
  $("#fig-status").innerHTML = ["all", ...STATUS].map((v) => chip("status", v, v === "all" ? t("any_status") : statusName(v),
    String(f.status) === String(v), v === "all" ? "" : `<span class="dot s${v}"></span>`)).join("");
  const q = f.q.trim().toLowerCase();
  const list = sortItems(figs().filter((it) => (f.cat === "all" || it.cat === f.cat)
    && (f.status === "all" || st(it.id) === Number(f.status))
    && (!q || nm(it).toLowerCase().includes(q) || (it.tag || "").includes(q))));
  $("#fig-list").innerHTML = list.length ? byLevel(list) : `<p class="hint">${esc(t("none_match"))}</p>`;
  renderInbox();
}

function renderFlows() {
  $("#flow-types").innerHTML = ["all", ...FLOW_TYPES].map((c) => chip("ftype", c, c === "all" ? t("all") : t("ft_" + c), S.flowType === c)).join("");
  const list = sortItems(flows().filter((it) => S.flowType === "all" || it.type === S.flowType));
  $("#flow-list").innerHTML = list.length ? byLevel(list) : `<p class="hint">${esc(t("none_match"))}</p>`;
}

function itemOptions(sel = "", kinds = ["fig", "flow"]) {
  const g = (kind, label) => `<optgroup label="${esc(label)}">${sortItems([...S.items.values()].filter((i) => i.kind === kind))
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
function openSheet(state) {
  S.sheet = state;
  renderSheet();
  $("#sheet").hidden = false;
  document.body.classList.add("locked");
  $("#sheet .sheet").scrollTop = 0;
}

function closeSheet() {
  S.sheet = null;
  $("#sheet").hidden = true;
  $("#sheet-body").innerHTML = "";
  document.body.classList.remove("locked");
}

function renderSheet() {
  if (!S.sheet) return;
  if (S.sheet.type === "item") {
    const it = S.items.get(S.sheet.id);
    if (!it) return closeSheet();
    $("#sheet-body").innerHTML = itemSheet(it);
  } else {
    $("#sheet-body").innerHTML = editorSheet(S.sheet.item);
  }
}

const sheetTop = (title) => `<div class="sheet-top"><h2>${esc(title)}</h2>
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
    ${it.desc ? `<p class="desc">${esc(it.desc)}</p>` : ""}
    ${it.kind === "flow" ? (steps.length ? `<ol class="steps-list">${steps.map((id) =>
      `<li><button type="button" class="link" data-act="open" data-id="${esc(id)}">${esc(nm(S.items.get(id)))}</button> ${pill(st(id))}</li>`).join("")}</ol>`
      : `<p class="alert warn">${esc(t("no_steps"))}</p>`) : ""}
    ${ROLES.map((r) => `<fieldset class="${S.roles.includes(r) ? "" : "muted"}"><legend>${esc(t("role_" + r))}</legend>
      <div class="status-seg">${STATUS.map((v) => `<button type="button" class="s${v}" data-act="status" data-id="${esc(it.id)}" data-role="${r}" data-v="${v}" aria-pressed="${p[r] === v}">${esc(statusName(v))}</button>`).join("")}</div></fieldset>`).join("")}
    <p class="hint">${esc(pr ? t("practiced_last", { n: pr.count, d: fmtDate(pr.last) }) : t("never_practiced"))}</p>
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
    <div class="row end">
      <button type="button" class="btn ghost small" data-act="edit" data-id="${esc(it.id)}">${esc(t("edit"))}</button>
      ${edited ? `<button type="button" class="btn ghost small" data-act="reset-item" data-id="${esc(it.id)}">${esc(t("reset"))}</button>` : ""}
      <button type="button" class="btn danger small" data-act="del-item" data-id="${esc(it.id)}">${esc(t(seed ? "hide" : "delete"))}</button>
    </div>`;
}

// Photo strip: your own photos (deletable) + credited reference photos + an "Add photo" tile.
function galleryHtml(it) {
  const mine = myPhotos(it.id).map((p) => `<figure class="mine"><img src="${esc(p.url)}" alt="${esc(nm(it))}" data-act="zoom">
      <figcaption>${esc(t("my_photo"))} · ${esc(fmtDate(p.added?.slice(0, 10)))}
      <button type="button" class="x" data-act="del-photo" data-photo="${esc(p.id)}" aria-label="${esc(t("delete"))}">×</button></figcaption></figure>`);
  const refs = refPhotos(it.id).map((p) => `<figure><img src="${esc(p.src)}" alt="${esc(nm(it))}" loading="lazy" data-act="zoom">
      <figcaption>${esc(t("photo_credit"))}: ${link(p.page, p.author || "Wikimedia Commons")}, ${link(p.licenseUrl, p.license)}</figcaption></figure>`);
  const add = `<label class="add-photo"><input type="file" accept="image/*" data-change="add-photo" data-id="${esc(it.id)}">
      <span>＋</span>${esc(t("add_photo"))}</label>`;
  return `<div class="photos">${[...mine, ...refs].join("")}${add}</div>`;
}

// Video: tap-to-load player (nothing is fetched from YouTube/Instagram until Play), plus source links.
function videoHtml(it) {
  const v = videoInfo(it.video);
  const links = [];
  if (it.video) links.push(link(v?.url || it.video, t("watch_on", { x: platformName(it.video) })));
  if (it.ap) links.push(link(ACROPEDIA_BASE + encodeURIComponent(it.ap) + "/", t("acropedia_page")));
  if (it.guide) links.push(link(GUIDE_BASE + it.guide, t("tutorial")));
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
    <label><span>${esc(t("description"))}</span><textarea id="e-desc" rows="2">${esc(e.desc || "")}</textarea></label>
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
  if (e.kind === "flow") Object.assign(rec, { type: e.type, steps: e.steps });
  else rec.cat = e.cat;
  await put("items", rec);
  S.items.set(rec.id, rec);
  refresh();
  openSheet({ type: "item", id: rec.id });
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
  $("#s-title").textContent = t(d.editing ? "edit_session" : "new_session");
  const partners = [...new Set(S.sessions.flatMap((s) => s.partners || []))].sort();
  $("#partners-dl").innerHTML = partners.map((p) => `<option value="${esc(p)}">`).join("");
  $("#sessions").innerHTML = S.sessions.slice(0, 60).map(sessionCard).join("") || `<p class="hint">${esc(t("no_sessions"))}</p>`;
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
  $("#partners").innerHTML = top.length ? `<table class="sum">${top.map(([p, n]) => `<tr><td>${esc(p)}</td><td class="n">${esc(t(n === 1 ? "n_session" : "n_sessions", { n }))}</td></tr>`).join("")}</table>`
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
      if (!confirm(t(SEED_BY_ID.has(id) ? "hide_confirm" : "delete_confirm", { x: nm(it) }))) return;
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
      S.sessions = S.sessions.filter((s) => s.id !== id);
      sortData();
      if (S.draft.editing === id) resetDraft();
      return refresh();
    }
    case "export": {
      const data = await exportAll();
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
      await clearAll();
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
  if (el.id === "lang") {
    S.lang = el.value;
    setSetting("lang", S.lang);
    t = makeT(S.lang);
    return renderAll();
  }
  if (el.name === "roles") {
    S.roles = el.value === "both" ? ["base", "flyer"] : [el.value];
    setSetting("roles", S.roles);
    return refresh();
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
      const n = await importAll(JSON.parse(await el.files[0].text()));
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
  const url = findUrl(raw);
  if (!url) return;
  const note = (q.get("title") || "").trim();
  toast(t((await addRef(url, null, note && !note.startsWith("http") ? note : "")) ? "ref_shared" : "ref_dup"));
}

async function init() {
  await load();
  await handleShare();
  renderAll();
  goto(location.hash.slice(1) || "figures");
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
  window.addEventListener("hashchange", () => goto(location.hash.slice(1)));
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
