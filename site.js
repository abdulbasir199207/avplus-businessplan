/* =====================================================
   AVplus e.U. – Mobiles Navigationsmenü (Hamburger)
   ===================================================== */
(function () {
  'use strict';

  function init() {
    var toggle = document.getElementById('nav-toggle');
    var nav = document.querySelector('header nav');
    if (!toggle || !nav) return;

    /* Das Symbol sitzt in einem eigenen <span>, damit der
       "Leistungen"-Text im Button beim Umschalten erhalten bleibt */
    var icon = toggle.querySelector('.nt-icon') || toggle;

    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      icon.textContent = open ? '✕' : '☰';
    });

    /* Menü schließen, sobald ein Link angeklickt wird */
    nav.addEventListener('click', function (e) {
      var link = e.target.closest ? e.target.closest('a') : null;
      if (link) {
        nav.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
        icon.textContent = '☰';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* =====================================================
   AVplus e.U. – Fester Anruf-/Anfrage-Balken (nur Handy)
   Wird nur auf Seiten mit <body data-call-bar> eingeblendet.
   Verschwindet, sobald das Kontaktformular (#kontakt) im
   Bild ist, damit er das Formular nicht verdeckt.
   Die Klicks laufen über tracking.js (phone_click bzw.
   cta_kontakt_click), hier ist dafür nichts nötig.
   ===================================================== */
(function () {
  'use strict';

  function init() {
    if (!document.body || !document.body.hasAttribute('data-call-bar')) return;

    var css = document.createElement('style');
    css.textContent =
      '#av-callbar{display:none}' +
      '@media (max-width:768px){' +
        '#av-callbar{position:fixed;left:0;right:0;bottom:0;z-index:9990;display:flex;gap:0.6rem;padding:0.6rem 0.8rem calc(0.6rem + env(safe-area-inset-bottom));background:rgba(255,255,255,0.97);box-shadow:0 -4px 18px rgba(0,0,0,0.14);transition:transform 0.25s}' +
        '#av-callbar.av-hide{transform:translateY(110%)}' +
        '#av-callbar a{flex:1;display:flex;align-items:center;justify-content:center;min-height:48px;border-radius:10px;font-weight:700;font-size:1rem;text-decoration:none;color:#fff}' +
        '#av-callbar .av-call{background:#447f2f}' +
        '#av-callbar .av-ask{background:#1b4f7a}' +
        'body[data-call-bar]{padding-bottom:72px}' +
        'body[data-call-bar] #avcc-reopen,body[data-call-bar] #back-top{display:none !important}' +
      '}';
    document.head.appendChild(css);

    var bar = document.createElement('div');
    bar.id = 'av-callbar';
    bar.innerHTML =
      '<a class="av-call" href="tel:+436766520263">📞 Jetzt anrufen</a>' +
      '<a class="av-ask" href="#kontakt">Anfrage senden</a>';
    document.body.appendChild(bar);

    var form = document.getElementById('kontakt');
    if (form && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        bar.classList.toggle('av-hide', entries[0].isIntersecting);
      }, { threshold: 0.15 }).observe(form);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
