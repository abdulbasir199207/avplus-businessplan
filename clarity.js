/* =====================================================
   AVplus e.U. – Microsoft Clarity (Heatmaps & Sitzungs-
   aufzeichnung), DSGVO-konform an den Cookie-Banner
   gekoppelt.

   Clarity wird NUR geladen, wenn der Besucher im Cookie-
   Banner den Analyse-Cookies zugestimmt hat. Ohne
   Einwilligung passiert nichts.

   ── SO AKTIVIERST DU CLARITY ──
   1. Auf https://clarity.microsoft.com mit deinem Google-
      Konto anmelden und ein neues Projekt "avplus.at"
      anlegen.
   2. Clarity zeigt dir eine Projekt-ID (kurzer Code wie
      "abcd1234ef"). Diese unten bei CLARITY_ID eintragen.
   3. Fertig – ab dann zeichnet Clarity auf (nur mit
      Einwilligung). Heatmaps & Aufzeichnungen erscheinen
      nach kurzer Zeit im Clarity-Dashboard.
   ===================================================== */
(function () {
  'use strict';

  /* ── HIER DIE CLARITY-PROJEKT-ID EINTRAGEN ── */
  var CLARITY_ID = 'xp0wp0azmn';   /* Projekt-ID aus clarity.microsoft.com */

  if (!CLARITY_ID) return;   /* keine ID → Clarity bleibt aus */

  var loaded = false;

  /* Offizielles Clarity-Snippet – lädt das Tracking-Script */
  function loadClarity() {
    if (loaded) return;
    loaded = true;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CLARITY_ID);
  }

  /* Clarity nur bei Einwilligung in Analyse-Cookies starten */
  function apply(consent) {
    if (consent && consent.analytics) loadClarity();
  }

  /* Falls schon eine Einwilligung gespeichert ist (Wiederkehrer) */
  apply(window._avplusConsent);

  /* Auf spätere Änderung im Cookie-Banner reagieren */
  window.addEventListener('avplusConsentUpdated', function (e) {
    apply(e.detail);
  });
})();
