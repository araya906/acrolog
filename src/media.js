// Video links and photo helpers. No network access here: embeds are only created when the user taps Play.
import { igInfo } from "./stats.js";

// YouTube and Instagram links → embeddable player. Anything else → null (shown as a plain link).
export function videoInfo(url) {
  const s = String(url || "");
  const yt = s.match(/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/i);
  if (yt) return { kind: "youtube", id: yt[1], url: `https://www.youtube.com/watch?v=${yt[1]}`, embed: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0` };
  const ig = igInfo(s);
  if (ig) return { kind: "instagram", id: ig.code, url: ig.url, embed: ig.embed };
  return null;
}

export const platformName = (url) => {
  const v = videoInfo(url);
  if (v) return v.kind === "youtube" ? "YouTube" : "Instagram";
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
};

// Shrinks a camera photo before storing it on the device (a phone photo is often 3-6 MB).
export async function shrinkImage(file, max = 1280, quality = 0.82) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", quality));
}

export const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(r.error);
  r.readAsDataURL(blob);
});

// Decoded by hand: fetch("data:...") is blocked by the page's Content-Security-Policy (connect-src 'self').
export function dataUrlToBlob(url) {
  const [head, b64] = url.split(",");
  const type = head.match(/^data:([^;,]+)/)?.[1] || "application/octet-stream";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}
