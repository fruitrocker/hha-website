# Helfende Hand für Afghanistan e. V. – Website

Statische Website des gemeinnützigen Vereins Helfende Hand für Afghanistan e. V. (Kassel).

- `src/` – Layout, Seitenfragmente, CSS, Assets (Fonts unter SIL Open Font License)
- `tools/build.mjs` – Build ohne Abhängigkeiten (Node ≥ 20): `node tools/build.mjs`
- `tools/shot.mjs` – Screenshot- und Überlaufprüfung per Chrome DevTools Protocol
- `dist/` – Build-Ausgabe

Build für GitHub-Pages-Vorschau: `PREVIEW=1 BASE_PATH=/hha-website/ node tools/build.mjs`
Build für die Domain: `SITE_URL=https://helfende-hand-afg.de node tools/build.mjs`
