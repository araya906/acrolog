// Community flows: flows other AcroLog users published, served by the sync Worker (server/flows.js).
// Downloading sends nothing about you. Publishing sends only the flow (name, description, type, level, steps, video
// link, hashtag) and your profile name, signed with your sync key so only you can change or remove it.
// Everything received goes through cleanListed (src/flowcheck.js) and is escaped when rendered.
import { call } from "./sync.js";
import { cleanFlow, cleanListed, CID_RE } from "./flowcheck.js";

export const ITEM_PREFIX = "c-";
export const itemId = (cid) => ITEM_PREFIX + cid;

// A listed flow → an item the app can show and track (kind "flow", community: true).
export function toItem(f) {
  return {
    id: itemId(f.id), cid: f.id, kind: "flow", community: true,
    name: f.name, desc: f.desc, type: f.type, level: f.level, steps: f.steps, tag: f.tag, by: f.by, lang: f.lang,
    ...(f.video && { video: f.video }), created: f.created, updated: f.updated
  };
}

// New and changed flows since the cursor ({ since, after } from the last call, or null for everything).
// Returns { live: [flow], gone: [id], cursor }.
export async function fetchCommunity(cursor) {
  let cur = cursor && Number.isFinite(cursor.since) ? { since: cursor.since, after: CID_RE.test(cursor.after || "") ? cursor.after : "" } : { since: 0, after: "" };
  const live = new Map(), gone = new Set();
  for (let page = 0; page < 25; page++) {
    const q = `?since=${cur.since}${cur.after ? `&after=${encodeURIComponent(cur.after)}` : ""}`;
    const res = await call("/v1/flows" + q);
    const list = Array.isArray(res.flows) ? res.flows : [];
    for (const raw of list) {
      const f = cleanListed(raw);
      if (!f) continue;
      if (f.gone) {
        live.delete(f.id);
        gone.add(f.id);
      } else {
        gone.delete(f.id);
        live.set(f.id, f);
      }
    }
    const last = list[list.length - 1];
    if (last && Number.isFinite(Number(last.updated)) && CID_RE.test(last.id || "")) cur = { since: Number(last.updated), after: last.id };
    if (!res.next || !list.length) break;
  }
  return { live: [...live.values()], gone: [...gone], cursor: cur };
}

// Publish (cid empty) or update (cid = your published copy). flow: fields as in cleanFlow. Returns { id, updated }.
export function publishFlow(flow, key, cid = "") {
  const body = JSON.stringify(cleanFlow(flow));
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  return cid && CID_RE.test(cid)
    ? call(`/v1/flows/${cid}`, { method: "PUT", headers, body })
    : call("/v1/flows", { method: "POST", headers, body });
}

export const unpublishFlow = (cid, key) => call(`/v1/flows/${encodeURIComponent(cid)}`, { method: "DELETE", headers: { Authorization: `Bearer ${key}` } });

export const reportFlow = (cid, key, reason = "") => call(`/v1/flows/${encodeURIComponent(cid)}/report`, {
  method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ reason: String(reason).slice(0, 200) })
});
