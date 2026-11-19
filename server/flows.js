// AcroLog community flows: flows people publish so that anyone can get them. Routed from worker.js.
//
//   GET    /v1/flows?since=<ms>&after=<id>  → { flows: [...], next: { since, after } | null }
//          Changed flows in update order, 200 per page. Hidden/deleted flows come as { id, gone: true, updated }
//          so apps can drop them (only when since > 0: a first download gets live flows only).
//   POST   /v1/flows                 Bearer <key>, body = flow  → { id, updated }   publish
//   PUT    /v1/flows/:id             Bearer <key>, body = flow  → { id, updated }   update (author only)
//   DELETE /v1/flows/:id             Bearer <key>                → { ok }           unpublish (author only)
//   POST   /v1/flows/:id/report      Bearer <key>, body = { reason } → { ok, hidden }
//   GET    /v1/mod/flows?state=hidden   Bearer <MOD_KEY>   → { flows } with reports (moderation queue)
//   POST   /v1/mod/flows/:id         Bearer <MOD_KEY>, body = { action: "hide" | "show" | "delete" }
//
// Authors are identified by the same secret key as sync: author = first 32 hex chars of sha256(key). Only that key
// can update or delete a flow. The author id is never returned. A flow is validated by src/flowcheck.js (the same
// code the app uses), so its steps can only be built-in figure ids.
// A flow is hidden automatically once REPORT_LIMIT (default 3) different networks have reported it; the moderator
// (MOD_KEY, a Worker secret) can show it again, hide or delete it.
import { cleanFlow, CID_RE, LIMITS } from "../src/flowcheck.js";

const PAGE = 200;
const MAX_LIVE_PER_AUTHOR = 50;
const MIN_WRITE_MS = 15 * 1000;   // one publish/update per author every 15 s (env.MIN_WRITE_MS overrides it, for local tests)
const WRITES_PER_DAY = 60;        // per author and per network
const REPORTS_PER_DAY = 20;       // per reporter and per network

export async function flowsRoute(req, env, url, parts, { json, sha256 }) {
  const m = req.method;
  if (parts[1] === "mod") return modRoute(req, env, url, parts, { json, sha256 });
  // parts: ["v1", "flows", id?, "report"?]
  if (parts.length === 2 && m === "GET") return list(env, url, json);

  const key = bearer(req);
  if (key.length < 20 || key.length > 200) return json({ error: "no_key" }, 401);
  const author = (await sha256(key)).slice(0, 32);
  const ip = "ip:" + (await sha256(day() + ":" + (req.headers.get("CF-Connecting-IP") || "local"))).slice(0, 32);

  if (parts.length === 2 && m === "POST") return save(req, env, null, author, ip, json);
  const id = parts[2];
  if (!CID_RE.test(id || "")) return json({ error: "bad_id" }, 400);
  if (parts.length === 3 && m === "PUT") return save(req, env, id, author, ip, json);
  if (parts.length === 3 && m === "DELETE") {
    const row = await env.DB.prepare("SELECT author, state FROM flows WHERE id = ?").bind(id).first();
    if (!row) return json({ error: "not_found" }, 404);
    if (row.author !== author) return json({ error: "forbidden" }, 403);
    if (row.state !== "deleted") await env.DB.prepare("UPDATE flows SET state = 'deleted', data = '{}', updated = ? WHERE id = ?").bind(Date.now(), id).run();
    return json({ ok: true });
  }
  if (parts.length === 4 && parts[3] === "report" && m === "POST") return report(req, env, id, author, ip, json);
  return json({ error: "not_found" }, 404);
}

const bearer = (req) => (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
const day = () => new Date().toISOString().slice(0, 10);

async function list(env, url, json) {
  const since = Math.max(0, Math.floor(Number(url.searchParams.get("since")) || 0));
  const after = url.searchParams.get("after") || "";
  if (after && !CID_RE.test(after)) return json({ error: "bad_after" }, 400);
  const { results } = await env.DB.prepare(
    `SELECT id, data, state, created, updated FROM flows
     WHERE (updated > ?1 OR (updated = ?1 AND id > ?2)) AND (?1 > 0 OR state = 'live')
     ORDER BY updated, id LIMIT ${PAGE}`).bind(since, after).all();
  const flows = results.map((r) => (r.state === "live"
    ? { id: r.id, ...JSON.parse(r.data), created: r.created, updated: r.updated }
    : { id: r.id, gone: true, updated: r.updated }));
  const last = results[results.length - 1];
  return json({ flows, next: results.length === PAGE ? { since: last.updated, after: last.id } : null, now: Date.now() },
    200, { "Cache-Control": "no-store" });
}

async function readBody(req, max, json) {
  const len = Number(req.headers.get("Content-Length") || 0);
  if (len > max) return { error: json({ error: "too_big" }, 413) };
  const text = await req.text();
  if (text.length > max) return { error: json({ error: "too_big" }, 413) };
  try {
    return { body: JSON.parse(text) };
  } catch {
    return { error: json({ error: "bad_json" }, 400) };
  }
}

// Counts one action against a daily budget; refuses when over it (or too soon after the last one, if minMs).
async function spend(env, who, kind, perDay, minMs = 0) {
  const now = Date.now(), d = day();
  const row = await env.DB.prepare("SELECT day, n, last FROM limits WHERE who = ? AND kind = ?").bind(who, kind).first();
  const n = row && row.day === d ? row.n : 0;
  if (n >= perDay) return false;
  if (minMs && row && now - row.last < minMs) return false;
  await env.DB.prepare(`INSERT INTO limits (who, kind, day, n, last) VALUES (?1, ?2, ?3, 1, ?4)
    ON CONFLICT(who, kind) DO UPDATE SET n = CASE WHEN limits.day = ?3 THEN limits.n + 1 ELSE 1 END, day = ?3, last = ?4`)
    .bind(who, kind, d, now).run();
  return true;
}

async function save(req, env, id, author, ip, json) {
  const { body, error } = await readBody(req, LIMITS.body, json);
  if (error) return error;
  let flow;
  try {
    flow = cleanFlow(body);
  } catch (e) {
    return json({ error: e.message || "bad_flow" }, 400);
  }
  let row = null;
  if (id) {
    row = await env.DB.prepare("SELECT author, state, created FROM flows WHERE id = ?").bind(id).first();
    if (!row || row.state === "deleted") return json({ error: "not_found" }, 404);
    if (row.author !== author) return json({ error: "forbidden" }, 403);
    if (row.state === "hidden") return json({ error: "hidden" }, 403); // only the moderator can bring it back
  } else {
    const c = await env.DB.prepare("SELECT COUNT(*) AS n FROM flows WHERE author = ? AND state = 'live'").bind(author).first();
    if ((c?.n || 0) >= MAX_LIVE_PER_AUTHOR) return json({ error: "too_many" }, 429);
  }
  const minMs = env.MIN_WRITE_MS !== undefined ? Number(env.MIN_WRITE_MS) : MIN_WRITE_MS;
  if (!(await spend(env, author, "write", WRITES_PER_DAY, minMs)) || !(await spend(env, ip, "write", WRITES_PER_DAY))) {
    return json({ error: "slow_down" }, 429);
  }
  const now = Date.now();
  const data = JSON.stringify(flow);
  if (id) {
    await env.DB.prepare("UPDATE flows SET data = ?, updated = ? WHERE id = ? AND author = ?").bind(data, now, id, author).run();
    return json({ id, updated: now });
  }
  const newId = "c" + [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 15);
  await env.DB.prepare("INSERT INTO flows (id, author, data, state, reports, created, updated) VALUES (?, ?, ?, 'live', 0, ?, ?)")
    .bind(newId, author, data, now, now).run();
  return json({ id: newId, updated: now }, 201);
}

async function report(req, env, id, reporter, ip, json) {
  const { body, error } = await readBody(req, 1024, json);
  if (error) return error;
  const reason = typeof body?.reason === "string" ? body.reason.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 200) : "";
  const row = await env.DB.prepare("SELECT author, state FROM flows WHERE id = ?").bind(id).first();
  if (!row || row.state === "deleted") return json({ error: "not_found" }, 404);
  if (row.author === reporter) return json({ error: "own_flow" }, 400);
  if (!(await spend(env, reporter, "report", REPORTS_PER_DAY)) || !(await spend(env, ip, "report", REPORTS_PER_DAY))) {
    return json({ error: "slow_down" }, 429);
  }
  await env.DB.prepare("INSERT OR IGNORE INTO flow_reports (flow_id, reporter, ip, reason, at) VALUES (?, ?, ?, ?, ?)")
    .bind(id, reporter, ip, reason, Date.now()).run();
  const c = await env.DB.prepare("SELECT COUNT(DISTINCT ip) AS n FROM flow_reports WHERE flow_id = ?").bind(id).first();
  const n = c?.n || 0;
  const limit = Math.max(1, Number(env.REPORT_LIMIT) || 3);
  const hide = row.state === "live" && n >= limit;
  await env.DB.prepare(`UPDATE flows SET reports = ?${hide ? ", state = 'hidden', updated = ?" : ""} WHERE id = ?`)
    .bind(...(hide ? [n, Date.now(), id] : [n, id])).run();
  return json({ ok: true, hidden: hide || row.state === "hidden" });
}

// Moderation: only with the MOD_KEY secret (npx wrangler secret put MOD_KEY). Without it, these routes do not exist.
async function modRoute(req, env, url, parts, { json, sha256 }) {
  if (!env.MOD_KEY || String(env.MOD_KEY).length < 20) return json({ error: "not_found" }, 404);
  // Compare hashes, so the comparison takes the same time whatever the key.
  if ((await sha256(bearer(req))) !== (await sha256(String(env.MOD_KEY)))) return json({ error: "forbidden" }, 403);
  if (parts[2] !== "flows") return json({ error: "not_found" }, 404);
  if (parts.length === 3 && req.method === "GET") {
    const state = ["live", "hidden", "deleted"].includes(url.searchParams.get("state")) ? url.searchParams.get("state") : "hidden";
    const { results } = await env.DB.prepare(
      "SELECT id, data, state, reports, created, updated FROM flows WHERE state = ? ORDER BY reports DESC, updated DESC LIMIT 200").bind(state).all();
    const reasons = {};
    for (const r of results) {
      const rs = await env.DB.prepare("SELECT reason, at FROM flow_reports WHERE flow_id = ? ORDER BY at DESC LIMIT 20").bind(r.id).all();
      reasons[r.id] = rs.results;
    }
    return json({ flows: results.map((r) => ({ ...r, data: JSON.parse(r.data), reasons: reasons[r.id] })) }, 200, { "Cache-Control": "no-store" });
  }
  const id = parts[3];
  if (parts.length === 4 && CID_RE.test(id || "") && req.method === "POST") {
    const { body, error } = await readBody(req, 1024, json);
    if (error) return error;
    const now = Date.now();
    const sql = {
      hide: "UPDATE flows SET state = 'hidden', updated = ? WHERE id = ? AND state != 'deleted'",
      show: "UPDATE flows SET state = 'live', reports = 0, updated = ? WHERE id = ? AND state != 'deleted'",
      delete: "UPDATE flows SET state = 'deleted', data = '{}', updated = ? WHERE id = ?"
    }[body?.action];
    if (!sql) return json({ error: "bad_action" }, 400);
    const res = await env.DB.prepare(sql).bind(now, id).run();
    if (body.action === "show") await env.DB.prepare("DELETE FROM flow_reports WHERE flow_id = ?").bind(id).run();
    return json({ ok: true, changed: res.meta?.changes || 0 });
  }
  return json({ error: "not_found" }, 404);
}
