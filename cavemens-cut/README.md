# Cavemen’s Cut – Webseite

Statische Webseite (HTML/CSS/JS, ohne Build-Schritt) für den Herrenfriseur **Cavemen’s Cut**, Mollardgasse 44/5, 1060 Wien.

## Aufbau
- `index.html` – Onepager: Start, Salon, Leistungen, Galerie, Google-Bewertungen, Termin, Kontakt
- `impressum.html`, `datenschutz.html` – Rechtstexte
- `assets/css/style.css`, `assets/js/main.js`
- `assets/img/` – optimierte Fotos (WebP), Logo-Entwurf (`logo.svg`, `logo-mark.svg`, `favicon.svg`)
- `assets/fonts/` – Schriften lokal eingebunden (Cinzel, Inter) → keine Verbindung zu Google Fonts, kein Cookie-Banner nötig

## Lokal ansehen
```
cd cavemens-cut
python3 -m http.server 8000
# → http://localhost:8000
```

## Offene Punkte
Mit `class="todo"` markiert: Öffnungszeiten, E-Mail, Rechtsform, UID-Nummer, Hosting-Anbieter. Außerdem Preise und Domain (derzeit `cavemens-cut.at` als Platzhalter im Canonical-Link).
