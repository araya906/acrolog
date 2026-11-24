// Community flows: the one validator shared by the app (src/community.js) and the sync Worker (server/worker.js,
// which bundles this file). Everything in a community flow was written by someone else: keep only well-formed,
// bounded values. Pure: no DOM, no storage, no network.
import { FIG_IDS, FLOW_TYPES, LEVELS } from "./catalog.js";

export const LIMITS = { body: 4096, name: 60, desc: 600, by: 40, tag: 40, steps: 30, video: 200 };
export const CID_RE = /^c[0-9a-f]{15}$/; // community flow id (made by the server)
const LANG_RE = /^(en|es|eu)$/;

// Control characters, bidi overrides and zero-width characters out; whitespace collapsed (newlines kept in desc).
const BAD = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f​-‏‪-‮⁠-⁩﻿]/g;
const line = (v, max) => (typeof v === "string" ? v.normalize("NFC").replace(BAD, "").replace(/\s+/g, " ").trim().slice(0, max) : "");
const para = (v, max) => (typeof v === "string"
  ? v.normalize("NFC").replace(/\r\n?/g, "\n").replace(BAD, "").replace(/[ \t\n]*\n[ \t\n]*\n[ \t\n]*/g, "\n\n").replace(/[ \t]+/g, " ").trim().slice(0, max)
  : "");

// Video links: https YouTube or Instagram only (the app can play those), no credentials, bounded length.
const VIDEO_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "instagram.com", "www.instagram.com"]);
export function cleanVideo(v) {
  if (typeof v !== "string" || !v.trim()) return "";
  const s = v.trim();
  if (s.length > LIMITS.video) throw new Error("bad_video");
  let u;
  try { u = new URL(s); } catch { throw new Error("bad_video"); }
  if (u.protocol !== "https:" || u.username || u.password || u.port || !VIDEO_HOSTS.has(u.hostname)) throw new Error("bad_video");
  return u.href;
}

// o: untrusted object. dropUnknown: true when reading flows from the server (an older app may not know a newer
// built-in figure yet: drop that step); false when publishing (the server rejects unknown figure ids).
export function cleanFlow(o, { dropUnknown = false } = {}) {
  if (!o || typeof o !== "object" || Array.isArray(o)) throw new Error("bad_flow");
  const name = line(o.name, LIMITS.name);
  if (name.length < 2) throw new Error("bad_name");
  const type = FLOW_TYPES.includes(o.type) ? o.type : "";
  if (!type) throw new Error("bad_type");
  const level = Number(o.level);
  if (!LEVELS.includes(level)) throw new Error("bad_level");
  if (o.steps !== undefined && !Array.isArray(o.steps)) throw new Error("bad_steps");
  const raw = (o.steps || []).slice(0, dropUnknown ? LIMITS.steps : undefined);
  if (raw.length > LIMITS.steps) throw new Error("bad_steps");
  const steps = [];
  for (const id of raw) {
    if (typeof id === "string" && FIG_IDS.has(id)) steps.push(id);
    else if (!dropUnknown) throw new Error("bad_steps");
  }
  const tag = line(o.tag, LIMITS.tag).replace(/^#/, "").replace(/[^\p{L}\p{N}_]/gu, "").toLowerCase();
  return {
    name, type, level, steps, tag,
    desc: para(o.desc, LIMITS.desc),
    video: cleanVideo(o.video),
    by: line(o.by, LIMITS.by),
    lang: LANG_RE.test(o.lang || "") ? o.lang : ""
  };
}

// Largest time a Date can hold (ms): above it, new Date(t).toISOString() throws.
const MAX_TIME = 8.64e15;
const okTime = (t) => Number.isFinite(t) && t > 0 && t <= MAX_TIME;

// A flow as the server lists it: { id, ...cleanFlow fields, created, updated } or a tombstone { id, gone: true, updated }.
export function cleanListed(o) {
  if (!o || !CID_RE.test(o.id || "")) return null;
  const updated = Number(o.updated);
  if (!okTime(updated)) return null;
  if (o.gone) return { id: o.id, gone: true, updated };
  const created = Number(o.created);
  try {
    return { id: o.id, ...cleanFlow(o, { dropUnknown: true }), created: okTime(created) ? created : updated, updated };
  } catch {
    return null;
  }
}
