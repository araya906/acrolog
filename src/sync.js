// Optional automatic sync with friends through the AcroLog sync Worker (server/worker.js).
// Off unless the user turns it on. When on, the app uploads your snapshot after changes and downloads your
// friends' latest snapshots when it opens, comes back online, or you open Friends. Nothing else is sent.
import { SYNC_URL } from "./config.js";

let override = "";
export const setSyncUrl = (url) => { override = url || ""; }; // tests
export const syncUrl = () => (override || SYNC_URL).replace(/\/+$/, "");
export const syncConfigured = () => /^https?:\/\//.test(syncUrl());

export function newKey() {
  const b = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function call(path, opts = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 12000);
  try {
    const res = await fetch(syncUrl() + path, { ...opts, signal: ctl.signal, cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(body.error || "http_" + res.status), { status: res.status });
    return body;
  } finally {
    clearTimeout(timer);
  }
}

export const pushSnap = (snap, key) => call(`/v1/snap/${encodeURIComponent(snap.id)}`, {
  method: "PUT", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(snap)
});

export async function pullSnaps(ids) {
  const out = {};
  for (let i = 0; i < ids.length; i += 100) {
    const part = ids.slice(i, i + 100).map(encodeURIComponent).join(",");
    Object.assign(out, (await call(`/v1/snaps?ids=${part}`)).snaps || {});
  }
  return out;
}

export const deleteSnap = (id, key) => call(`/v1/snap/${encodeURIComponent(id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${key}` } });
