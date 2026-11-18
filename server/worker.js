// AcroLog sync: a tiny mailbox of progress snapshots, one per person. No accounts, no emails, no passwords.
//
//   PUT    /v1/snap/:sid  body = snapshot JSON, header Authorization: Bearer <key>
//   GET    /v1/snaps?ids=a,b,c   → { snaps: { sid: snapshot } } for the sync ids that exist (max 100)
//   DELETE /v1/snap/:sid  header Authorization: Bearer <key>  → removes it (turning sync off, "Delete all my data")
//   GET    /             → { ok: true } (the app's connection check)
//
// The sync id is derived from the secret key: sid = first 32 hex chars of sha256(key). The server checks that on
// every write, so nobody can write under a sid without its key (not even a friend who knows the sid from your link).
// A snapshot can be read only by someone who has the sid, which travels inside the friend link.
// The snapshot is the same data the share link already carries.

const ID_RE = /^[0-9a-f]{32}$/;
const MAX_BODY = 64 * 1024;
const MIN_INTERVAL_MS = 10 * 1000; // one upload per person every 10 s at most

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    try {
      const res = await route(req, env);
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      return res;
    } catch (e) {
      return json({ error: "server" }, 500, cors);
    }
  }
};

async function route(req, env) {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  if (!parts.length && req.method === "GET") return json({ ok: true, app: "acrolog-sync", v: 1 });

  if (parts[0] === "v1" && parts[1] === "snaps" && parts.length === 2 && req.method === "GET") {
    const ids = [...new Set((url.searchParams.get("ids") || "").split(",").filter((id) => ID_RE.test(id)))].slice(0, 100);
    if (!ids.length) return json({ snaps: {} });
    const { results } = await env.DB.prepare(`SELECT id, data FROM snaps WHERE id IN (${ids.map(() => "?").join(",")})`)
      .bind(...ids).all();
    const snaps = {};
    for (const r of results) snaps[r.id] = JSON.parse(r.data);
    return json({ snaps }, 200, { "Cache-Control": "no-store" });
  }

  if (parts[0] === "v1" && parts[1] === "snap" && parts.length === 3) {
    const id = parts[2];
    if (!ID_RE.test(id)) return json({ error: "bad_id" }, 400);
    const key = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (key.length < 20 || key.length > 200) return json({ error: "no_key" }, 401);
    const hash = await sha256(key);
    if (hash.slice(0, 32) !== id) return json({ error: "forbidden" }, 403);

    if (req.method === "PUT") {
      const len = Number(req.headers.get("Content-Length") || 0);
      if (len > MAX_BODY) return json({ error: "too_big" }, 413);
      const text = await req.text();
      if (text.length > MAX_BODY) return json({ error: "too_big" }, 413);
      let snap;
      try { snap = JSON.parse(text); } catch { return json({ error: "bad_json" }, 400); }
      if (!snap || snap.a !== "acrolog" || snap.v !== 1 || snap.sy !== id || isNaN(new Date(snap.at))) return json({ error: "bad_snap" }, 400);

      const row = await env.DB.prepare("SELECT key_hash, updated FROM snaps WHERE id = ?").bind(id).first();
      if (row && row.key_hash !== hash) return json({ error: "forbidden" }, 403);
      const now = Date.now();
      if (row && now - row.updated < MIN_INTERVAL_MS) return json({ error: "slow_down" }, 429);
      await env.DB.prepare(`INSERT INTO snaps (id, key_hash, data, at, updated) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET data = excluded.data, at = excluded.at, updated = excluded.updated
        WHERE snaps.key_hash = excluded.key_hash`).bind(id, hash, text, snap.at, now).run();
      return json({ ok: true, at: snap.at });
    }

    if (req.method === "DELETE") {
      const res = await env.DB.prepare("DELETE FROM snaps WHERE id = ? AND key_hash = ?").bind(id, hash).run();
      return json({ ok: true, deleted: res.meta?.changes || 0 });
    }
  }
  return json({ error: "not_found" }, 404);
}

function corsHeaders(req, env) {
  const allowed = (env.ALLOWED_ORIGINS || "*").split(",").map((s) => s.trim()).filter(Boolean);
  const origin = req.headers.get("Origin") || "";
  const allow = allowed.includes("*") ? "*" : allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

const json = (obj, status = 200, headers = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...headers } });

async function sha256(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
