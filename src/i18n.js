import en from "./lang/en.js";
import es from "./lang/es.js";

// Order = display order. English is the source language and fallback.
export const STRINGS = { en, es };
export const LANGS = { en: "English", es: "Español" };

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
