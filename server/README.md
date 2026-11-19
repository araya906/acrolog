# AcroLog sync server

Optional. Without it, friends share progress only through links. With it, each person can turn on
**Friends → Keep friends updated automatically**: the app uploads their snapshot a few seconds after each change and
downloads their friends' latest snapshots when it opens, comes back online, or Friends is opened.

It is a Cloudflare Worker with a D1 (SQLite) database, both free for this use: D1 allows 100,000 writes and
5 million reads a day. No accounts or emails: each phone makes a random id and a secret write key. A snapshot is the
same data the share link already carries (name, roles, statuses, totals, optionally the last 10 sessions), and can be
read only by someone who knows the id, which travels in the friend link. Turning sync off deletes it.

## Deploy (once, about 5 minutes)

You need a free Cloudflare account and Node.js. From this `server/` folder:

```powershell
npx wrangler login
```

```powershell
npx wrangler d1 create acrolog
```

Copy the `database_id` it prints into `wrangler.toml`, then:

```powershell
npx wrangler d1 execute acrolog --remote --file schema.sql
```

```powershell
npx wrangler deploy
```

`deploy` prints the address, e.g. `https://acrolog-sync.<your-subdomain>.workers.dev`. Put it in `src/config.js`
(`SYNC_URL`), bump `VERSION` in `sw.js`, and publish the app. Optionally set `ALLOWED_ORIGINS` in `wrangler.toml` to the
app's address (e.g. `https://araya906.github.io`) and deploy again.

A custom domain instead of `*.workers.dev` must also be added to `connect-src` in `index.html`.

## Test locally

```powershell
npx wrangler d1 execute acrolog --local --file schema.sql
```

```powershell
npx wrangler dev --port 8787 --local
```

## API

- `PUT /v1/snap/:id` with `Authorization: Bearer <key>` and the snapshot JSON (max 64 KB, at most one write per 10 s).
  The first write stores `sha256(id:key)`; later writes and deletes need the same key.
- `GET /v1/snaps?ids=a,b,c` returns `{ snaps: { id: snapshot } }` for the ids that exist (max 100).
- `DELETE /v1/snap/:id` with the same key.
- `GET /` returns `{ ok: true }`.
- Community flows: see below.

## Community flows (added 2026-11)

People can publish a flow they made so that every AcroLog can download it (Flows → **Community**). Same Worker,
same D1 database, three new tables (`flows`, `flow_reports`, `limits`). Code: `flows.js`, which bundles the app's own
validator `../src/flowcheck.js` (and `../src/catalog.js`, so a flow's steps can only be built-in figure ids:
**deploy the Worker again whenever built-in figures are added**).

- Publishing, updating and unpublishing need the same secret key as sync (`Authorization: Bearer <key>`); the author
  is `sha256(key)` cut to 32 hex chars and is never returned by the API. Only that key can change or delete a flow.
- Limits: 4 KB per flow (name 60, description 600, 30 steps), video links only https YouTube/Instagram; 50 live flows per
  author; one write per author every 15 s; 60 writes and 20 reports a day per author/reporter and per network.
- Reports: a flow is hidden automatically once `REPORT_LIMIT` (default 3) different networks reported it.
  Moderation uses the `MOD_KEY` secret; without it the moderation routes don't exist.

### Deploy it (owner, once)

From this `server/` folder (already logged in to Cloudflare):

```powershell
npx wrangler d1 execute acrolog --remote --file migrations/0002_community_flows.sql
```

```powershell
npx wrangler secret put MOD_KEY
```

(paste a long random value, e.g. from `[Convert]::ToBase64String((1..32 | % { Get-Random -Max 256 }))`, and keep it)

```powershell
npx wrangler deploy
```

Check it: `GET https://acrolog-sync.vespacontrol.workers.dev/v1/flows?since=0` should return `{"flows":[],...}`.
The migration only creates tables (`IF NOT EXISTS`); it does not touch `snaps`.

### Moderate

```powershell
$h = @{ Authorization = "Bearer <MOD_KEY>" }
Invoke-RestMethod "https://acrolog-sync.vespacontrol.workers.dev/v1/mod/flows?state=hidden" -Headers $h
```

```powershell
Invoke-RestMethod "https://acrolog-sync.vespacontrol.workers.dev/v1/mod/flows/<id>" -Method Post -Headers $h -ContentType "application/json" -Body '{"action":"show"}'
```

`action` is `show` (back to live, reports cleared), `hide` or `delete`. `?state=live` lists live flows by report count.

### Test locally

```powershell
npx wrangler d1 execute acrolog --local --file schema.sql
```

```powershell
npx wrangler dev --local --port 8787 --var ALLOWED_ORIGINS:http://localhost:8124 --var MOD_KEY:local-moderator-key-123456789 --var REPORT_LIMIT:2 --var MIN_WRITE_MS:1500
```

```powershell
node --test test/flows.test.mjs
```

To try the app against it, serve the app on port 8124 and run `localStorage.setItem("al.syncUrl", '"http://127.0.0.1:8787"')`
in the browser console (local addresses only; see `src/sync.js`), then reload.

### Community API

- `GET /v1/flows?since=<ms>&after=<id>` → `{ flows, next }`: flows changed after the cursor, 200 per page. Hidden or
  deleted flows come as `{ id, gone: true, updated }` (only when `since` > 0).
- `POST /v1/flows` (create) / `PUT /v1/flows/:id` (update) with the flow JSON: `name`, `desc`, `type`
  (`transition|flow|washing|pop`), `level` (1–4), `steps` (built-in figure ids), `video`, `tag`, `by`, `lang`.
- `DELETE /v1/flows/:id` (author), `POST /v1/flows/:id/report` with `{ reason }`.
- `GET /v1/mod/flows?state=hidden|live|deleted`, `POST /v1/mod/flows/:id` with `{ action }` (moderator).
