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
