#!/usr/bin/env node
// Screenshot-Tool ohne Abhängigkeiten (Chrome headless + DevTools-Protokoll über nativen WebSocket, Node ≥ 22).
// Aufruf: node tools/shot.mjs <html-datei> <breite> <ausgabe.png> [--dark] [--height=900]
// Prüft horizontalen Überlauf (scrollWidth > Viewport), sammelt Konsolenfehler, macht Full-Page-Screenshot.
// Exit-Code 1 bei Überlauf oder Konsolenfehlern.
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith("--"));
const pos = args.filter((a) => !a.startsWith("--"));
if (pos.length < 3) {
  console.error("Aufruf: node tools/shot.mjs <html-datei> <breite> <ausgabe.png> [--dark] [--height=900]");
  process.exit(2);
}
const [file, widthArg, out] = pos;
const width = Number(widthArg);
const height = Number((flags.find((f) => f.startsWith("--height=")) || "--height=900").split("=")[1]);
const dark = flags.includes("--dark");
const url = /^https?:/.test(file) ? file : pathToFileURL(resolve(file)).href;

const profile = mkdtempSync(join(tmpdir(), "hha-shot-"));
const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check",
  "--allow-file-access-from-files", `--user-data-dir=${profile}`, "--remote-debugging-port=0", "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });

const wsUrl = await new Promise((res, rej) => {
  let buf = "";
  chrome.stderr.on("data", (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) res(m[1]); });
  chrome.on("exit", (c) => rej(new Error(`Chrome beendet (Code ${c})`)));
  setTimeout(() => rej(new Error("Chrome antwortet nicht (DevTools-URL)")), 15000);
});

const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0;
const pending = new Map();
const listeners = [];
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id); pending.delete(msg.id);
    msg.error ? rej(new Error(`${msg.error.message}`)) : res(msg.result);
  } else if (msg.method) listeners.forEach((l) => l(msg));
};
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const m = { id: ++id, method, params }; if (sessionId) m.sessionId = sessionId;
  pending.set(m.id, { res, rej }); ws.send(JSON.stringify(m));
});
const once = (method, sessionId) => new Promise((res) => {
  const l = (m) => { if (m.method === method && m.sessionId === sessionId) { listeners.splice(listeners.indexOf(l), 1); res(m.params); } };
  listeners.push(l);
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Profil erst nach Chrome-Ende löschen (sonst ENOTEMPTY, weil Chrome noch schreibt); Reste in tmp sind unkritisch.
const cleanup = () => { try { ws.close(); } catch {} chrome.kill(); chrome.once("exit", () => { try { rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }); } catch {} }); };
const guard = setTimeout(() => { console.error("Zeitüberschreitung (45 s)"); cleanup(); process.exit(1); }, 45000);

try {
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId: s } = await send("Target.attachToTarget", { targetId, flatten: true });
  const errors = [];
  listeners.push((m) => {
    if (m.sessionId !== s) return;
    if (m.method === "Runtime.exceptionThrown") { const d = m.params.exceptionDetails; errors.push(`Exception: ${d.exception?.description || d.text}`); }
    if (m.method === "Runtime.consoleAPICalled" && (m.params.type === "error" || m.params.type === "warning"))
      errors.push(`console.${m.params.type}: ${m.params.args.map((a) => a.value ?? a.description ?? "").join(" ")}`);
    if (m.method === "Log.entryAdded" && m.params.entry.level === "error") errors.push(`${m.params.entry.source}: ${m.params.entry.text} ${m.params.entry.url || ""}`);
  });
  await send("Page.enable", {}, s);
  await send("Runtime.enable", {}, s);
  await send("Log.enable", {}, s);
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 800 }, s);
  if (dark) await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] }, s);

  const loaded = once("Page.loadEventFired", s);
  await send("Page.navigate", { url }, s);
  await loaded;
  await send("Runtime.evaluate", { expression: "document.fonts.ready.then(() => new Promise(r => setTimeout(r, 600)))", awaitPromise: true }, s);

  const { result: { value: m } } = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      // Mobile Emulation weitet den Layout-Viewport, wenn Inhalt breiter als die Gerätebreite ist → innerWidth > Sollbreite.
      const want = ${width}, iw = innerWidth, sw = document.documentElement.scrollWidth, sh = document.documentElement.scrollHeight;
      const wide = [];
      if (sw > want || iw > want) for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.right > want + 1 && r.width > 0) wide.push(el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).join('.') : '') + ' → ' + Math.round(r.right) + 'px');
        if (wide.length >= 8) break;
      }
      return { want, iw, sw, sh, wide };
    })()`,
  }, s);

  await send("Emulation.setDeviceMetricsOverride", { width, height: Math.max(height, m.sh), deviceScaleFactor: 1, mobile: width < 800 }, s);
  await send("Runtime.evaluate", { expression: "new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 150))))", awaitPromise: true }, s);
  const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }, s);
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(resolve(out), Buffer.from(data, "base64"));

  const overflow = m.sw > m.want || m.iw > m.want;
  console.log(`${out}: ${m.iw}×${m.sh}px${dark ? " (dark)" : ""}`);
  console.log(overflow ? `ÜBERLAUF: scrollWidth ${m.sw}, Layout-Viewport ${m.iw} > Sollbreite ${m.want}\n  ${m.wide.join("\n  ")}` : `Kein horizontaler Überlauf (scrollWidth ${m.sw} = Viewport ${m.iw})`);
  console.log(errors.length ? `Konsolenfehler (${errors.length}):\n  ${errors.join("\n  ")}` : "Keine Konsolenfehler");
  process.exitCode = overflow || errors.length ? 1 : 0;
} catch (e) {
  console.error("Fehler:", e.message);
  process.exitCode = 1;
} finally {
  clearTimeout(guard);
  cleanup();
}
