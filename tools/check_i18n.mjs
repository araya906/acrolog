// Checks that every language file has every key of en.js (same type, same {placeholders}, same list length),
// and that every t("key") / data-i18n="key" used by the app exists in en.js.
// Run: node tools/check_i18n.mjs
import { readFileSync } from "node:fs";
import { STRINGS } from "../src/i18n.js";

const en = STRINGS.en;
const vars = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
let bad = 0;
const fail = (msg) => { bad++; console.log("✗ " + msg); };

for (const [lang, tbl] of Object.entries(STRINGS)) {
  if (lang === "en") continue;
  for (const [k, v] of Object.entries(en)) {
    if (!(k in tbl)) { fail(`${lang}: missing ${k}`); continue; }
    if (Array.isArray(v) !== Array.isArray(tbl[k])) fail(`${lang}: ${k} type differs`);
    else if (Array.isArray(v) && v.length !== tbl[k].length) fail(`${lang}: ${k} has ${tbl[k].length} items, en has ${v.length}`);
    else if (!Array.isArray(v) && vars(v) !== vars(tbl[k])) fail(`${lang}: ${k} placeholders {${vars(tbl[k])}} ≠ {${vars(v)}}`);
  }
  for (const k of Object.keys(tbl)) if (!(k in en)) fail(`${lang}: extra key ${k}`);
}

const src = ["src/app.js", "index.html"].map((f) => readFileSync(new URL("../" + f, import.meta.url), "utf8")).join("\n");
const used = new Set([
  ...[...src.matchAll(/\bt(?:\.list)?\("([a-z0-9_]+)"\s*[,)]/g)].map((m) => m[1]),
  ...[...src.matchAll(/data-i18n(?:-ph|-list|-aria)?="([a-z0-9_]+)"/g)].map((m) => m[1])
]);
for (const k of used) if (!(k in en)) fail(`used but not in en.js: ${k}`);

console.log(bad ? `${bad} problem(s)` : `OK: ${Object.keys(STRINGS).join(", ")} have all ${Object.keys(en).length} keys; ${used.size} literal keys used by the app exist.`);
process.exit(bad ? 1 : 0);
