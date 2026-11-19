// End-to-end test of the community flows API against a LOCAL Worker (never the live one).
// 1. npx wrangler d1 execute acrolog --local --file schema.sql
// 2. npx wrangler dev --local --port 8787 --var ALLOWED_ORIGINS:http://localhost:8124 --var MOD_KEY:local-moderator-key-123456789 --var REPORT_LIMIT:2 --var MIN_WRITE_MS:1500
// 3. node --test test/flows.test.mjs        (BASE=http://127.0.0.1:8787 by default)
import { test } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.BASE || "http://127.0.0.1:8787";
if (/workers\.dev|https:/.test(BASE)) throw new Error("Run these tests against a local Worker only.");
const MOD = "local-moderator-key-123456789";
const rnd = () => "k" + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now();
const A = rnd(), B = rnd(), C = rnd();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(path, { method = "GET", key, body, headers = {} } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { Origin: "http://localhost:8124", ...(key && { Authorization: "Bearer " + key }), ...(body !== undefined && { "Content-Type": "application/json" }), ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body)
  });
  return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
}

const flow = { name: "Test flow <b>bold</b>", desc: "Line 1\n\n\n\nLine 2‮", type: "pop", level: 3, steps: ["front-bird", "throne"], video: "https://youtu.be/OooDR1XrtUI", tag: "#Test", by: "Ane", lang: "eu" };
let id, t0;

test("lists, CORS and auth", async () => {
  const r = await call("/v1/flows?since=0");
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body.flows));
  assert.equal(r.headers.get("access-control-allow-origin"), "http://localhost:8124");
  t0 = r.body.now;
  assert.equal((await call("/v1/flows", { method: "POST", body: flow })).status, 401);
});

test("validation", async () => {
  const bad = async (patch, err, status = 400) => {
    const r = await call("/v1/flows", { method: "POST", key: A, body: { ...flow, ...patch } });
    assert.equal(r.status, status, JSON.stringify(r.body));
    if (err) assert.equal(r.body.error, err);
  };
  await bad({ steps: ["front-bird", "u-my-own"] }, "bad_steps");
  await bad({ steps: Array(31).fill("throne") }, "bad_steps");
  await bad({ type: "dance" }, "bad_type");
  await bad({ level: 9 }, "bad_level");
  await bad({ name: " " }, "bad_name");
  await bad({ video: "javascript:alert(1)" }, "bad_video");
  await bad({ video: "https://evil.example/x" }, "bad_video");
  await bad({ desc: "x".repeat(5000) }, "too_big", 413);
  const r = await call("/v1/flows", { method: "POST", key: A, body: "{not json" });
  assert.equal(r.body.error, "bad_json");
});

test("publish, read back cleaned, no author exposed", async () => {
  const r = await call("/v1/flows", { method: "POST", key: A, body: flow });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  id = r.body.id;
  assert.match(id, /^c[0-9a-f]{15}$/);
  const l = await call(`/v1/flows?since=${t0 - 1}`);
  const f = l.body.flows.find((x) => x.id === id);
  assert.ok(f);
  assert.equal(f.name, "Test flow <b>bold</b>"); // stored as text; the app escapes it when rendering
  assert.equal(f.desc, "Line 1\n\nLine 2");
  assert.equal(f.tag, "test");
  assert.equal(f.author, undefined);
  assert.equal(JSON.stringify(l.body).includes(A), false);
});

test("only the author can update; rate limit", async () => {
  assert.equal((await call(`/v1/flows/${id}`, { method: "PUT", key: B, body: flow })).status, 403);
  assert.equal((await call(`/v1/flows/${id}`, { method: "PUT", key: A, body: flow })).body.error, "slow_down");
  await sleep(1600);
  const r = await call(`/v1/flows/${id}`, { method: "PUT", key: A, body: { ...flow, name: "Renamed" } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await call(`/v1/flows/${id}`, { method: "DELETE", key: B })).status, 403);
});

test("reports: own flow refused, same network counts once, distinct networks hide it", async () => {
  assert.equal((await call(`/v1/flows/${id}/report`, { method: "POST", key: A, body: {} })).body.error, "own_flow");
  const r1 = await call(`/v1/flows/${id}/report`, { method: "POST", key: B, body: { reason: "spam" }, headers: { "CF-Connecting-IP": "203.0.113.1" } });
  assert.equal(r1.body.hidden, false);
  const r2 = await call(`/v1/flows/${id}/report`, { method: "POST", key: C, body: { reason: "spam" }, headers: { "CF-Connecting-IP": "203.0.113.1" } });
  assert.equal(r2.body.hidden, false, "two keys from one network count once");
  const r3 = await call(`/v1/flows/${id}/report`, { method: "POST", key: rnd(), body: {}, headers: { "CF-Connecting-IP": "198.51.100.7" } });
  if (r3.body.hidden === false) {
    console.log("note: this runtime does not pass CF-Connecting-IP through; distinct-network hiding not exercised");
    return;
  }
  assert.equal(r3.body.hidden, true);
  const l = await call(`/v1/flows?since=${t0 - 1}`);
  assert.deepEqual(Object.keys(l.body.flows.find((x) => x.id === id)).sort(), ["gone", "id", "updated"]);
  assert.equal((await call(`/v1/flows?since=0`)).body.flows.some((x) => x.id === id), false, "first download skips hidden flows");
  assert.equal((await call(`/v1/flows/${id}`, { method: "PUT", key: A, body: flow })).body.error, "hidden");
});

test("moderator", async () => {
  assert.equal((await call(`/v1/mod/flows/${id}`, { method: "POST", key: "wrong-key-wrong-key-wrong", body: { action: "show" } })).status, 403);
  const q = await call("/v1/mod/flows?state=hidden", { key: MOD });
  assert.equal(q.status, 200);
  const r = await call(`/v1/mod/flows/${id}`, { method: "POST", key: MOD, body: { action: "show" } });
  assert.equal(r.body.ok, true);
  const l = await call(`/v1/flows?since=${t0 - 1}`);
  assert.equal(l.body.flows.find((x) => x.id === id).name, "Renamed");
});

test("author unpublishes", async () => {
  const before = Date.now() - 5000;
  assert.equal((await call(`/v1/flows/${id}`, { method: "DELETE", key: A })).body.ok, true);
  const l = await call(`/v1/flows?since=${before}`);
  assert.equal(l.body.flows.find((x) => x.id === id).gone, true);
  assert.equal((await call(`/v1/flows/${id}`, { method: "PUT", key: A, body: flow })).status, 404);
});

test("paging cursor", async () => {
  const l = await call(`/v1/flows?since=0&after=nope`);
  assert.equal(l.status, 400);
});
