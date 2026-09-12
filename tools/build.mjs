#!/usr/bin/env node
// Build ohne Abhängigkeiten: src/pages/*.html → dist/<slug>/index.html
// Aufruf: node tools/build.mjs   (Umgebung: BASE_PATH="/" | "/repo/", SITE_URL="https://helfende-hand-afg.de")
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const DIST = join(ROOT, "dist");
const BASE = (process.env.BASE_PATH || "/").replace(/\/?$/, "/");
const SITE = (process.env.SITE_URL || "https://helfende-hand-afg.de").replace(/\/$/, "");
const SITE_NAME = "Helfende Hand für Afghanistan e. V.";

const NAV = [
  ["ueber-uns", "Über uns"],
  ["projekt", "Unser Projekt"],
  ["spenden", "Spenden"],
  ["mitglied-werden", "Mitglied werden"],
  ["transparenz", "Transparenz"],
  ["kontakt", "Kontakt"],
];

// Escaping + geschützte Leerzeichen in „e. V.“ / „§ 60a“ / „VR 4808“ (Front-Matter wird ohne Entities geschrieben).
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  .replace(/e\. V\./g, "e. V.").replace(/§ (?=\d)/g, "§ ").replace(/VR (?=\d)/g, "VR ");
const hash = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 8);

function frontMatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: text.slice(m[0].length) };
}

// dist leeren, Assets kopieren
rmSync(DIST, { recursive: true, force: true });
mkdirSync(join(DIST, "css", "pages"), { recursive: true });
cpSync(join(SRC, "assets"), DIST, { recursive: true });

const layout = readFileSync(join(SRC, "layout.html"), "utf8");
const css = readFileSync(join(SRC, "css", "style.css"));
writeFileSync(join(DIST, "css", "style.css"), css);
const cssv = hash(css);

const pages = readdirSync(join(SRC, "pages")).filter((f) => f.endsWith(".html"));
const urls = [];
let warnings = 0;

for (const file of pages) {
  const slug = file.replace(/\.html$/, "");
  const { meta, body } = frontMatter(readFileSync(join(SRC, "pages", file), "utf8"));
  const isIndex = slug === "index";
  const is404 = slug === "404";
  // Relative Pfade (Hosting unter Domain-Root und Unterordner); 404 braucht absolute Pfade (wird unter beliebigem Pfad ausgeliefert).
  const root = is404 ? BASE : isIndex ? "" : "../";
  const path = isIndex ? "" : `${slug}/`;
  const canonical = `${SITE}${BASE}${path}`;
  const outFile = is404 ? join(DIST, "404.html") : isIndex ? join(DIST, "index.html") : join(DIST, slug, "index.html");

  if (!meta.title) { console.warn(`WARNUNG ${file}: kein title im Front-Matter`); warnings++; }
  if (!meta.description) { console.warn(`WARNUNG ${file}: keine description im Front-Matter`); warnings++; }
  const title = meta.title || slug;
  const fullTitle = title.includes("Helfende Hand") ? title : `${title} – ${SITE_NAME}`;
  // PREVIEW=1: Vorschau-Deploy (GitHub Pages) komplett aus dem Index halten
  const robots = process.env.PREVIEW ? "noindex, nofollow" : (meta.robots || (is404 ? "noindex" : ""));

  let pagecss = "";
  const pcss = join(SRC, "css", "pages", `${slug}.css`);
  if (existsSync(pcss)) {
    const buf = readFileSync(pcss);
    writeFileSync(join(DIST, "css", "pages", `${slug}.css`), buf);
    pagecss = `<link rel="stylesheet" href="${root}css/pages/${slug}.css?v=${hash(buf)}">\n`;
  }

  const nav = NAV.map(([s, label]) =>
    `        <li><a href="${root}${s}/"${s === slug ? ' aria-current="page"' : ""}>${label}</a></li>`).join("\n");

  const vars = {
    lang: meta.lang || "de",
    dir: meta.dir || "ltr",
    locale: meta.locale || "de_DE",
    title: esc(fullTitle),
    description: esc(meta.description || ""),
    robots: robots ? `<meta name="robots" content="${esc(robots)}">\n` : "",
    canonical,
    root,
    slug,
    cssv,
    pagecss,
    nav,
    year: String(new Date().getFullYear()),
    content: body.replace(/\{\{root\}\}/g, root).trim(),
  };
  let html = layout.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));
  // Redaktionelle Kommentare (TODO/OFFEN) bleiben in src, nicht im Auslieferungs-HTML.
  html = html.replace(/[ \t]*<!--[\s\S]*?-->[ \t]*\n?/g, "");
  // Footer-Links zur aktuellen Seite (Impressum, Datenschutz, Transparenz) markieren.
  if (!isIndex) html = html.replace(new RegExp(`<a href="${root}${slug}/">`, "g"), `<a href="${root}${slug}/" aria-current="page">`);
  const left = html.match(/\{\{\w+\}\}/g);
  if (left) { console.warn(`WARNUNG ${file}: unbekannte Platzhalter ${[...new Set(left)].join(", ")}`); warnings++; }

  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, html);
  if (!robots.includes("noindex")) urls.push(canonical);
  console.log(`✓ ${file} → ${outFile.replace(ROOT + "/", "")} (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB)`);
}

writeFileSync(join(DIST, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${esc(u)}</loc></url>`).join("\n") + `\n</urlset>\n`);
writeFileSync(join(DIST, "robots.txt"), process.env.PREVIEW ? `User-agent: *\nDisallow: /\n` : `User-agent: *\nAllow: /\nSitemap: ${SITE}${BASE}sitemap.xml\n`);
writeFileSync(join(DIST, ".nojekyll"), "");

console.log(`Fertig: ${pages.length} Seiten, CSS v=${cssv}, BASE_PATH=${BASE}${warnings ? `, ${warnings} Warnung(en)` : ""}`);
process.exitCode = warnings ? 1 : 0;
