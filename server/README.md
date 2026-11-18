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
