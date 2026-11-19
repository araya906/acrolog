import en from "./lang/en.js";
import es from "./lang/es.js";
import eu from "./lang/eu.js";

// Order = display order. English is the source language and fallback.
export const STRINGS = { en, es, eu };
export const LANGS = { en: "English", es: "Español", eu: "Euskara" };

// First supported language in the browser's preference list (e.g. "eu-ES" → "eu"), else English.
export function detectLang(prefs = (typeof navigator !== "undefined" && (navigator.languages?.length ? navigator.languages : [navigator.language])) || []) {
  for (const p of prefs) {
    const code = String(p || "").toLowerCase().slice(0, 2);
    if (LANGS[code]) return code;
  }
  return "en";
}

const pick = (lang, key) => [STRINGS[lang], STRINGS.en].map((s) => s?.[key]).find((v) => v !== undefined);

export function makeT(lang) {
  const t = (key, vars = {}) => {
    const raw = pick(lang, key);
    if (typeof raw !== "string") return key;
    return raw.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
  };
  t.list = (key) => {
    const raw = pick(lang, key);
    return Array.isArray(raw) ? raw : [];
  };
  return t;
}
