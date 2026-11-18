// On-device storage only (IndexedDB, in-memory fallback). Nothing here touches the network.
const DB = "acro-log";
import { blobToDataUrl, dataUrlToBlob } from "./media.js";

const VER = 2; // 2: "photos" store (your own photos of a figure, as image blobs)
export const STORES = ["items", "progress", "sessions", "refs", "photos"];
let dbp = null;
const mem = Object.fromEntries(STORES.map((s) => [s, new Map()]));

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, VER);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbp;
}

function tx(db, store, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const out = fn(t.objectStore(store));
    t.oncomplete = () => resolve(out?.result ?? out);
    t.onerror = () => reject(t.error);
  });
}

export async function all(store) {
  const db = await open();
  if (!db) return [...mem[store].values()];
  return tx(db, store, "readonly", (s) => s.getAll());
}

export async function put(store, items) {
  const list = Array.isArray(items) ? items : [items];
  const db = await open();
  if (!db) {
    list.forEach((r) => mem[store].set(r.id, r));
    return;
  }
  await tx(db, store, "readwrite", (s) => list.forEach((r) => s.put(r)));
}

export async function remove(store, id) {
  const db = await open();
  if (!db) {
    mem[store].delete(id);
    return;
  }
  await tx(db, store, "readwrite", (s) => s.delete(id));
}

export async function clearAll() {
  const db = await open();
  for (const s of STORES) {
    mem[s].clear();
    if (db) await tx(db, s, "readwrite", (st) => st.clear());
  }
  try {
    Object.keys(localStorage).filter((k) => k.startsWith("al.")).forEach((k) => localStorage.removeItem(k));
  } catch {}
}

// Backup: one JSON file with every store (photos as data: URLs). Import merges (same id = replaced).
export async function exportAll() {
  const out = { app: "acro-log", version: 2, exported: new Date().toISOString() };
  for (const s of STORES) out[s] = await all(s);
  out.photos = await Promise.all(out.photos.map(async (p) => ({ ...p, blob: undefined, data: await blobToDataUrl(p.blob) })));
  return out;
}

export async function importAll(data) {
  if (!data || data.app !== "acro-log") throw new Error("bad_file");
  let n = 0;
  for (const s of STORES) {
    let list = Array.isArray(data[s]) ? data[s].filter((r) => r && typeof r.id === "string") : [];
    if (s === "photos") {
      list = await Promise.all(list.filter((p) => /^data:image\//.test(p.data || ""))
        .map(async ({ data: d, ...p }) => ({ ...p, blob: await dataUrlToBlob(d) })));
    }
    if (list.length) await put(s, list);
    n += list.length;
  }
  return n;
}

export function getSetting(key, fallback) {
  try {
    const v = localStorage.getItem("al." + key);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}

export function setSetting(key, value) {
  try {
    localStorage.setItem("al." + key, JSON.stringify(value));
  } catch {}
}
