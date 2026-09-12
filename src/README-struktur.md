# Struktur und Komponenten – Website Helfende Hand für Afghanistan e. V.

Statisch, ohne Abhängigkeiten. Designsystem „Lebender Plan“ (Konzept `concepts/bauplan/`). Deutsch zuerst; EN/Dari/Türkisch später über dieselbe Struktur (Layout nutzt logische Properties, `lang`/`dir` kommen aus dem Front-Matter).

## Befehle
```
node tools/build.mjs                                   # src → dist (BASE_PATH="/" Standard, SITE_URL="https://helfende-hand-afg.de")
BASE_PATH=/hha-website/ node tools/build.mjs           # GitHub-Pages-Unterordner
node tools/shot.mjs dist/spenden/index.html 360 shots/spenden-360.png            # Screenshot (Exit 1 bei Überlauf/Konsolenfehler)
node tools/shot.mjs dist/spenden/index.html 1440 shots/spenden-1440-dark.png --dark
```
Pflicht-Breiten: 360, 390, 1024, 1440 hell + 1440 dunkel. Screenshots ansehen (bei langen Seiten mit `sips -c <höhe> <breite> --cropOffset <y> 0 in.png --out teil.png` zerschneiden; Offset 0 nicht verwenden, sips nimmt dann die Mitte – 1 nehmen).

## Seitenfragment `src/pages/<slug>.html`
```
---
title: Spenden
description: Ein Satz für Suchmaschinen (≤ 160 Zeichen).
robots: noindex          (optional; Standard: indexierbar)
---
<section class="page-head"> … </section>
<section> … </section>
```
- Slug = Dateiname → `dist/<slug>/index.html` (`index.html` → `dist/index.html`, `404.html` → `dist/404.html`).
- Titel bekommt automatisch das Suffix „ – Helfende Hand für Afghanistan e. V.“ (außer er enthält „Helfende Hand“ schon).
- **Links und Assets immer mit `{{root}}`:** `{{root}}spenden/`, `{{root}}img/x.svg`. Der Build setzt `""` (Startseite), `../` (Unterseiten) bzw. den absoluten Basis-Pfad (404).
- Inhalt kommt in `<main>`; Header, Footer, Skip-Link, Navigation (mit `aria-current="page"`) liefert `src/layout.html`.
- Eine `h1` je Seite (im `.page-head`), dann `h2` je Sektion, `h3` darunter. Kein inline `style=`.
- Seitenspezifisches CSS optional: `src/css/pages/<slug>.css` (wird als zweites Stylesheet mit Hash eingebunden).
- Icons: Sprite-Symbole `#logo`, `#arrow` (`<svg aria-hidden="true"><use href="#arrow"/></svg>`).

## Harte Inhaltsregeln (Kurzfassung, Details in `design-brief.md`, `briefing-2026-09-09.md` Abschnitt 9)
Keine erfundenen Fakten/Zahlen/Partner/Zitate. Kein „bauen/Baubeginn/Bautafel/Baufortschritt/Kran/Neubau“ – der Verein richtet ein, stattet aus, baut auf; „Projekttafel“, „Start der Einrichtung“, „Im Aufbau“. Öffentlich nur „Berufsausbildungszentrum in Kabul“. Keine Telefonnummer, keine IBAN, keine Social-Links, keine Fotos von Menschen, keine Beitragshöhe. E-Mail: info@helfende-hand-afg.de. Typografie: „…“, –, `&nbsp;` in „e.&nbsp;V.“, „§&nbsp;60a“, „VR&nbsp;4808“.

## Komponenten (Klassen + Beispiel)

### Seitenkopf mit Kicker/Nummer (`.page-head`)
```html
<section class="page-head">
  <div class="wrap">
    <p class="eyebrow mono"><b>03</b> Spenden</p>
    <h1>Jede Ausgabe hat einen Beleg.</h1>
    <p class="lead">Ein Satz, der die Seite trägt.</p>
  </div>
</section>
```
Sektionen darunter: `<section aria-labelledby="h-x"><div class="wrap"><div class="sec-head"><p class="eyebrow mono"><b>01</b> Thema</p><h2 id="h-x">…</h2><p>…</p></div> … </div></section>`. Fließtext-Blöcke in `<div class="prose">` (Absatzabstände, Listen mit Terrakotta-Strich).

### Projekttafel / Faktenblock (`.tafel` + `.meta`)
```html
<div class="tafel">
  <p class="tafel-title mono">Projekttafel</p>
  <dl class="meta">
    <dt class="mono">Status</dt><dd class="now">Im Aufbau</dd>
    <dt class="mono">Register</dt><dd>Amtsgericht Kassel, VR&nbsp;4808</dd>
  </dl>
</div>
```
`.tafel` = Rahmen mit Eckmarken (auch für Notizen: `.tafel.notice` mit `<p class="mono">` Label). `dd.now` = Terrakotta mit Punkt.

### Zwei-Spalten-Sektion (`.split`)
```html
<div class="wrap split">
  <div class="split-a sticky">   <!-- links 5/12, ab 900 px sticky (optional) -->
    <p class="eyebrow mono"><b>02</b> Thema</p><h2>…</h2><div class="sec-head"><p>…</p></div>
  </div>
  <div class="split-b">…</div>   <!-- rechts 6/12 -->
</div>
```
Alternativ das 12er-Raster direkt: `<div class="wrap grid">` mit `grid-column` in Seiten-CSS.

### Berufe-Kacheln (`.jobs` / `.tile` / `.tile-note`)
```html
<ul class="jobs" aria-label="Ausbildungsberufe">
  <li class="tile">
    <span class="num mono">01</span>
    <span class="ico"><svg viewBox="0 0 48 48" aria-hidden="true">…<path class="ac" d="…"/></svg></span>
    <div><h3>Metallbau und Schweißen</h3><p>Werkstatt 01</p></div>
  </li>
  <li class="tile-note"><span class="mono">Ausbildungsdauer</span><strong>6 bis 18 Monate.</strong><p>…</p></li>
</ul>
```
Icons: 48er-Raster, Strich 1,5, `class="ac"` = Terrakotta-Akzent. Die sieben fertigen Icons stehen in `src/pages/index.html`. Container Query schaltet ab 20 rem Kachelbreite auf einspaltig.

### Meilensteinliste (`.log`, Zustände `done` / `open` / `next`)
```html
<ol class="log" aria-label="Meilensteine">
  <li data-state="done"><span class="st" aria-hidden="true"></span><time class="when mono" datetime="2026-06-09"><span class="sr">Erledigt: </span>09.06.2026</time><span class="what">Gemeinnützigkeit anerkannt<small>Finanzamt Kassel, §&nbsp;60a AO</small></span></li>
  <li data-state="open"><span class="st" aria-hidden="true"></span><span class="when mono"><span class="sr">Läuft: </span>2026</span><span class="what">Zentrum im Aufbau</span></li>
  <li data-state="next"><span class="st" aria-hidden="true"></span><span class="when mono"><span class="sr">Folgt: </span>folgt</span><span class="what">Erste Berichte</span></li>
</ol>
<ul class="log-legend mono" aria-hidden="true">
  <li data-state="done"><span class="st"></span>erledigt</li><li data-state="open"><span class="st"></span>läuft</li><li data-state="next"><span class="st"></span>folgt</li>
</ul>
```
Nur belegte Einträge (2009 Verein · 09.06.2026 Gemeinnützigkeit · 2026 Zentrum im Aufbau · Erste Berichte folgen).

### Positionsliste / Raumprogramm (`.room-list`) und Werdegang (`.path`)
```html
<ol class="room-list"><li><span class="code mono">R-01</span><div><h3>Werkstätten <small>– Zusatz</small></h3><p>…</p></div></li></ol>
<ol class="path"><li><div><h3>Grundbildung</h3><p>…</p></div></li> … <li class="loop"><svg …/><span class="mono">Und später: selbst ausbilden.</span></li></ol>
```
Kennzahlen-Reihe ohne Zahlenerfindung: `<div class="facts"><div><strong>2009</strong><span class="mono muted">Verein besteht seit</span></div></div>` (auch `.room-sum`).

### FAQ (`.faq-list` mit `<details name="faq">`)
```html
<div class="faq-list">
  <details name="faq" open>
    <summary><span class="n mono">F-01</span><span>Frage?</span><span class="x" aria-hidden="true"></span></summary>
    <div class="a"><p>Antwort nur aus dem Briefing.</p></div>
  </details>
</div>
```

### CTA-Band (`.cta-band`) und CTA-Karten (`.cta-grid` / `.cta-card`)
```html
<div class="cta-band">
  <div><h2>Drei Wege, das Zentrum zu tragen.</h2><p>…</p></div>
  <div class="actions"><a class="btn btn-primary" href="{{root}}spenden/">Spenden <svg aria-hidden="true"><use href="#arrow"/></svg></a><a class="btn" href="{{root}}kontakt/">Kontakt</a></div>
</div>
```
Karten: `<div class="cta-grid"><div class="cta-card primary"><span class="mono">Spenden</span><h3>…</h3><p>…</p><a class="btn btn-primary" href="…">…</a><span class="fine mono">Kleingedrucktes</span></div></div>`.
Buttons: `.btn` (Outline), `.btn-primary` (Terrakotta), `.btn-ghost` (leise), `.btn-lg`.

### Hinweisbox (`.hinweis`)
```html
<div class="hinweis"><p class="mono">Hinweis</p><p>Spendenkonto wird nachgereicht. Bis dahin keine Bankdaten auf dieser Seite.</p></div>
```

### Definitionsliste für Register/Rechtsangaben (`.defs`)
```html
<dl class="defs">
  <div><dt>Registergericht</dt><dd>Amtsgericht Kassel</dd><dd>VR&nbsp;4808</dd></div>
  <div><dt>Vertreten durch</dt><dd>Dr. Yama Aref (1. Vorsitzender), Salih Tasdemir (2. Vorsitzender), Orhan Atmaca (Kassenwart)</dd></div>
</dl>
```

### Weitere Bausteine
- Vorstand: `.board` + `.board-list` + `.member` (Subgrid: `<span class="mono">Funktion</span><h3>Name</h3><p>Zusatz</p>`), `.board-note`.
- Transparenz-Panel (dunkel in beiden Modi): `<section class="trust">` mit `.trust-grid` + `.stamp` (`<span class="mono">Label</span><span class="big">§&nbsp;60a AO</span><h3>…</h3><p>…</p>`).
- Dari-Name: `<p class="dari" lang="fa-AF">انجمن «دست یاری برای افغانستان»</p>` + `<p class="dari-cap mono">Vereinsname in Dari</p>`.
- Zitat/Kernsatz: `<p class="pull">…</p>`. Nebentext: `.muted`. Screenreader-Text: `.sr`.
- Zeichnung: `<img class="plan-img" data-inline src="{{root}}img/axonometrie.svg" width="1073" height="655" alt="…">` – JS setzt die SVG inline (scroll-getriebenes Zeichnen), ohne JS bleibt das Bild. Marken: `.plan-marks` (Positionen in %), Legende `.plan-legend`, Bildunterschrift `.plan-cap` („Raumprogramm, schematisch – kein Bauplan, kein Maßstab“).
- Einblenden beim Scrollen: Klasse `reveal` (nur transform/opacity, bei reduced-motion aus).

## Typo-Skala (fluid, clamp 360 → 1440 px)
`--t-mono` 13–14 px (Mono-Labels, nie kleiner) · `--t--1` 14–15 · `--t-0` 16–18 (Fließtext) · `--t-1` 18–22 (Lead, h3 in Listen) · `--t-2` 21–30 (h3) · `--t-3` 30–53 (h2) · `--t-4` 42–96 (h1 Startseite). `.page-head h1` nutzt `--t-3`. Schriften: Bricolage Grotesque (variable, Text/Headlines), JetBrains Mono (Labels, Nummern, Legenden), System-Arabisch für Dari. Zeilenlänge `--measure` 62ch, `.lead` 48ch.

## Abstände
`--section` 4–7 rem (Sektion oben/unten) · `--margin` 1–4 rem (Seitenrand) · `--gutter` 1–2 rem (Spaltenabstand) · `.sec-head` Abstand unten 2–4 rem · Rahmen `--rule` 1,5 px, Linien `--hairline` 1 px, Radius 2 px.

## Farb-Tokens (Light / Dark, alle via `light-dark()`)
`--kalk` #F4F0E8 / #0F1A26 (Hintergrund) · `--kalk-2` #EAE4D8 / #172533 (Fläche) · `--kalk-3` #DCD3C2 / #24374A (Linien) · `--ink` #14263A / #EFE9DD (Text) · `--ink-2` #3A5878 / #B7C5D2 (Nebentext) · `--line` #52708F / #7F9AB4 (Zeichnung) · `--terra` #B4441F / #F0925F (Akzent, CTA-Fläche) · `--terra-ink` #9E3A18 / #F0925F (Akzenttext) · `--on-terra` #FFF / #0F1A26 · `--holz` #C79A62 / #D9B27F · `--holz-ink` #7A522A / #D9B27F · `--panel` #14263A / #172533 + `--on-panel` (dunkle Panels, in beiden Modi dunkel) · `--focus` = `--terra`. Kontraste WCAG AA geprüft (siehe `concepts/bauplan/concept.md`). Planpapier-Raster: `--grid-paper` nur in `.hero` und `.page-head`.

## Bild-Regeln
Keine Fotos, keine Gesichter, keine Stockbilder, keine KI-Menschen. Nur selbst erstellte SVG (Linien in `--line`/`--ink`, Akzente Terrakotta/Holz), schematisch, ohne Maßstab, ohne Baustelle/Kran. Assets unter `src/assets/img/` (`logo.svg`, `favicon.svg`, `axonometrie.svg`), Fonts unter `src/assets/fonts/` (OFL-Lizenzen liegen daneben). Keine externen Requests (Fonts, Skripte, Bilder, Karten). Alt-Texte beschreiben, was zu sehen ist; dekorative SVG `aria-hidden="true"`.
