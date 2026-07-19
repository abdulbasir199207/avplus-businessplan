/* =====================================================
   AVplus e.U. – Besucher-Tracking (GA4 + Google Ads)

   Sendet alle Events über gtag/dataLayer. Der Google
   Consent Mode v2 (siehe <head> jeder Seite) regelt
   automatisch, ob Cookies gesetzt werden dürfen –
   ohne Einwilligung gehen nur anonyme, cookielose Pings.

   ── GOOGLE ADS EINRICHTEN ──
   1. In Google Ads: Tools → Messung → Conversions
   2. Conversion-ID (Format AW-XXXXXXXXXX) unten bei
      GOOGLE_ADS_ID eintragen.
   3. Optional: Conversion-Labels für "Lead-Formular"
      und "Anruf" eintragen, dann werden diese Events
      direkt als Google-Ads-Conversions gemeldet.
   Alternativ können alle GA4-Events (generate_lead,
   phone_click …) in Google Ads als importierte
   Conversions verknüpft werden.
   ===================================================== */
(function () {
  'use strict';

  /* ── KONFIGURATION ── */
  var GOOGLE_ADS_ID = '';                    /* z. B. 'AW-1234567890' */
  var CONVERSION_LABEL_LEAD = '';            /* Label der Conversion "Anfrage gesendet" */
  var CONVERSION_LABEL_PHONE = '';           /* Label der Conversion "Anruf-Klick" */

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }

  if (GOOGLE_ADS_ID) gtag('config', GOOGLE_ADS_ID);

  var PAGE = (location.pathname.split('/').pop() || 'index.html');

  function track(name, params) {
    params = params || {};
    params.page = PAGE;
    gtag('event', name, params);
  }

  function adsConversion(label) {
    if (GOOGLE_ADS_ID && label) {
      gtag('event', 'conversion', { send_to: GOOGLE_ADS_ID + '/' + label });
    }
  }

  /* ── Klicks: Telefon, E-Mail, externe Links, Kontakt-CTA ── */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var text = (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80);

    if (href.indexOf('tel:') === 0) {
      track('phone_click', { link_text: text });
      adsConversion(CONVERSION_LABEL_PHONE);
    } else if (href.indexOf('mailto:') === 0) {
      track('email_click', { link_text: text });
    } else if (href.indexOf('#kontakt') !== -1) {
      track('cta_kontakt_click', { link_text: text });
    } else if (a.host && a.host !== location.host && /^https?:$/.test(a.protocol)) {
      track('outbound_click', { link_url: a.href, link_text: text });
    }
  }, true);

  /* ── Formulare: Beginn des Ausfüllens + erfolgreicher Versand ── */
  var formStarted = false;
  document.addEventListener('focusin', function (e) {
    if (formStarted) return;
    var t = e.target;
    if (t && t.form && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) {
      formStarted = true;
      track('form_start', {});
    }
  });

  /* Wird von kontakt-inline.js bzw. dem Formular der
     Startseite nach erfolgreichem Versand ausgelöst */
  window.addEventListener('avplusLeadSuccess', function () {
    track('generate_lead', {});
    adsConversion(CONVERSION_LABEL_LEAD);
  });

  /* ── Scroll-Tiefe: 25 / 50 / 75 / 90 % ── */
  var scrollMarks = [25, 50, 75, 90];
  var scrollSent = {};
  function onScroll() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    if (max <= 0) return;
    var pct = Math.round((window.scrollY || doc.scrollTop) / max * 100);
    for (var i = 0; i < scrollMarks.length; i++) {
      var m = scrollMarks[i];
      if (pct >= m && !scrollSent[m]) {
        scrollSent[m] = true;
        track('scroll_depth', { percent: m });
      }
    }
    if (scrollSent[90]) window.removeEventListener('scroll', onScrollThrottled);
  }
  var scrollTimer = null;
  function onScrollThrottled() {
    if (scrollTimer) return;
    scrollTimer = setTimeout(function () { scrollTimer = null; onScroll(); }, 400);
  }
  window.addEventListener('scroll', onScrollThrottled, { passive: true });

  /* ── Sektionen: Sichtbarkeit + Verweildauer ──
     Meldet pro Sektion einmal "section_view" beim ersten
     Erscheinen und "section_dwell" mit Sekunden, sobald
     der Besucher die Sektion wieder verlässt (ab 3 s).
     So sieht man in GA4 genau, welche Inhalte auf welcher
     Seite am meisten betrachtet werden. */
  function sectionLabel(sec, idx) {
    if (sec.id) return sec.id;
    var h = sec.querySelector('h1,h2,h3');
    if (h) return (h.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    return 'section-' + (idx + 1);
  }

  function initSections() {
    if (!('IntersectionObserver' in window)) return;
    var secs = document.querySelectorAll('section');
    if (!secs.length) return;

    var state = [];
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var s = state[entry.target._avIdx];
        if (!s) return;
        if (entry.isIntersecting) {
          if (!s.viewed) {
            s.viewed = true;
            track('section_view', { section: s.label });
          }
          if (!s.since) s.since = Date.now();
        } else if (s.since) {
          var sec = Math.round((Date.now() - s.since) / 1000);
          s.since = 0;
          s.total += sec;
          if (sec >= 3) track('section_dwell', { section: s.label, seconds: sec });
        }
      });
    }, { threshold: 0.3 });

    for (var i = 0; i < secs.length; i++) {
      secs[i]._avIdx = i;
      state[i] = { label: sectionLabel(secs[i], i), viewed: false, since: 0, total: 0 };
      observer.observe(secs[i]);
    }

    /* Beim Verlassen der Seite: meistbetrachtete Sektion melden */
    window.addEventListener('pagehide', function () {
      var best = null;
      for (var i = 0; i < state.length; i++) {
        var s = state[i];
        var t = s.total + (s.since ? Math.round((Date.now() - s.since) / 1000) : 0);
        if (!best || t > best.t) best = { label: s.label, t: t };
      }
      if (best && best.t >= 3) {
        track('most_viewed_section', { section: best.label, seconds: best.t });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSections);
  } else {
    initSections();
  }
})();
