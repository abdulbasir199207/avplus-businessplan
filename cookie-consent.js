/* =====================================================
   AVplus e.U. – Cookie Consent Banner
   DSGVO + TKG 2021 konform | Österreich | v1.0
   ===================================================== */
(function () {
  'use strict';

  var STORAGE_KEY = 'avplus_consent';
  var VERSION = '1';
  var DSE_URL = '/impressum#datenschutz';

  /* ── Consent lesen / schreiben ── */
  function getConsent() {
    try {
      var d = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return (d && d.v === VERSION) ? d : null;
    } catch (e) { return null; }
  }

  function saveConsent(analytics, marketing) {
    var d = { v: VERSION, ts: Date.now(), necessary: true, analytics: !!analytics, marketing: !!marketing };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    window._avplusConsent = d;
    updateGtagConsent(d);
    try { window.dispatchEvent(new CustomEvent('avplusConsentUpdated', { detail: d })); } catch (e) {}
    closeBanner();
    showReopenBtn();
  }

  /* ── CSS einfügen ── */
  function injectCSS() {
    var css = [
      /* Banner Overlay */
      '#avcc-overlay{position:fixed;left:0;right:0;bottom:0;z-index:999990;display:flex;justify-content:center;padding:1rem 1rem 1.2rem;pointer-events:none;}',
      '#avcc-overlay.avcc-show{pointer-events:all;}',

      /* Banner Card */
      '#avcc-banner{background:#fff;border-radius:18px;box-shadow:0 -2px 40px rgba(0,0,0,0.18),0 8px 40px rgba(0,0,0,0.12);max-width:900px;width:100%;padding:1.8rem 2rem;font-family:"Segoe UI",Arial,sans-serif;color:#1a2332;transform:translateY(120%);transition:transform 0.4s cubic-bezier(.22,.68,0,1.2);opacity:0;}',
      '#avcc-overlay.avcc-show #avcc-banner{transform:translateY(0);opacity:1;}',

      /* Header row */
      '#avcc-header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:0.9rem;}',
      '#avcc-title{font-size:1.05rem;font-weight:800;display:flex;align-items:center;gap:0.5rem;}',
      '#avcc-text{font-size:0.85rem;color:#6b7280;line-height:1.65;margin-bottom:1.2rem;}',
      '#avcc-text a{color:#2d6ea8;text-decoration:underline;}',

      /* Button row */
      '#avcc-btns{display:flex;gap:0.7rem;flex-wrap:wrap;align-items:center;}',
      '.avcc-btn{padding:0.65rem 1.3rem;border-radius:9px;font-size:0.88rem;font-weight:700;cursor:pointer;border:2px solid transparent;transition:all 0.2s;white-space:nowrap;font-family:inherit;line-height:1;}',
      '.avcc-btn-accept{background:#6ab04c;color:#fff;border-color:#6ab04c;}',
      '.avcc-btn-accept:hover{background:#4e8a36;border-color:#4e8a36;transform:translateY(-1px);}',
      '.avcc-btn-reject{background:#fff;color:#1a2332;border-color:#d1d5db;}',
      '.avcc-btn-reject:hover{border-color:#1a2332;}',
      '.avcc-btn-settings{background:none;border:none;color:#2d6ea8;font-size:0.83rem;font-weight:600;text-decoration:underline;cursor:pointer;padding:0.6rem 0.3rem;font-family:inherit;}',
      '.avcc-btn-settings:hover{color:#1b4f7a;}',

      /* Einstellungen-Panel */
      '#avcc-details{max-height:0;overflow:hidden;transition:max-height 0.35s ease,opacity 0.3s;opacity:0;}',
      '#avcc-details.avcc-open{max-height:400px;opacity:1;}',
      '#avcc-details-inner{padding-top:1.2rem;border-top:1px solid #e5e7eb;margin-top:1.2rem;}',

      /* Toggle rows */
      '.avcc-row{display:flex;align-items:center;justify-content:space-between;padding:0.7rem 0;border-bottom:1px solid #f3f4f6;}',
      '.avcc-row:last-of-type{border-bottom:none;}',
      '.avcc-row-label strong{display:block;font-size:0.88rem;font-weight:700;color:#1a2332;}',
      '.avcc-row-label span{font-size:0.78rem;color:#6b7280;}',

      /* Toggle switch */
      '.avcc-switch{position:relative;width:46px;height:26px;flex-shrink:0;margin-left:1rem;}',
      '.avcc-switch input{opacity:0;width:0;height:0;position:absolute;}',
      '.avcc-slider{position:absolute;inset:0;background:#d1d5db;border-radius:34px;cursor:pointer;transition:background 0.2s;}',
      '.avcc-slider::before{content:"";position:absolute;width:20px;height:20px;left:3px;top:3px;background:#fff;border-radius:50%;transition:transform 0.2s;box-shadow:0 1px 4px rgba(0,0,0,0.2);}',
      '.avcc-switch input:checked+.avcc-slider{background:#2d6ea8;}',
      '.avcc-switch input:checked+.avcc-slider::before{transform:translateX(20px);}',
      '.avcc-switch input:disabled+.avcc-slider{opacity:0.55;cursor:not-allowed;}',

      /* Save button row */
      '#avcc-save-row{display:flex;gap:0.7rem;margin-top:1.1rem;flex-wrap:wrap;}',

      /* Floating reopen button */
      '#avcc-reopen{position:fixed;bottom:1.2rem;left:1.2rem;width:46px;height:46px;background:#2d6ea8;color:#fff;border:none;border-radius:50%;font-size:1.25rem;cursor:pointer;box-shadow:0 4px 18px rgba(45,110,168,0.45);z-index:999989;display:none;align-items:center;justify-content:center;transition:background 0.2s,transform 0.2s;line-height:1;}',
      '#avcc-reopen.avcc-visible{display:flex;}',
      '#avcc-reopen:hover{background:#1b4f7a;transform:scale(1.1);}',

      /* Modal */
      '#avcc-modal{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:999991;display:none;align-items:center;justify-content:center;padding:1rem;}',
      '#avcc-modal.avcc-show{display:flex;}',
      '#avcc-modal-card{background:#fff;border-radius:20px;max-width:500px;width:100%;padding:2rem 2.2rem;font-family:"Segoe UI",Arial,sans-serif;color:#1a2332;box-shadow:0 20px 60px rgba(0,0,0,0.25);max-height:90vh;overflow-y:auto;}',
      '#avcc-modal-card h3{font-size:1.1rem;font-weight:800;margin-bottom:0.5rem;}',
      '#avcc-modal-card p{font-size:0.85rem;color:#6b7280;margin-bottom:1.2rem;line-height:1.65;}',
      '#avcc-modal-card a{color:#2d6ea8;}',
      '#avcc-modal-card .avcc-row{padding:0.75rem 0;}',

      /* Responsive */
      '@media(max-width:600px){',
      '#avcc-banner{padding:1.3rem 1.2rem;border-radius:14px;}',
      '#avcc-btns{flex-direction:column;}',
      '.avcc-btn{width:100%;text-align:center;}',
      '#avcc-modal-card{padding:1.4rem 1.3rem;}',
      '}',
    ].join('');

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ── Banner erstellen ── */
  function buildBanner() {
    var overlay = document.createElement('div');
    overlay.id = 'avcc-overlay';
    overlay.innerHTML =
      '<div id="avcc-banner" role="dialog" aria-modal="true" aria-label="Cookie-Einstellungen">' +
        '<div id="avcc-header"><div id="avcc-title">🍪 Diese Website verwendet Cookies</div></div>' +
        '<div id="avcc-text">' +
          'Wir verwenden Cookies, um Ihnen die bestmögliche Erfahrung zu bieten, den Website-Traffic zu analysieren ' +
          'und Ihnen relevante Werbung auf Google sowie Instagram/Facebook zu zeigen. ' +
          'Weitere Infos in unserer <a href="' + DSE_URL + '">Datenschutzerklärung</a>.' +
        '</div>' +
        '<div id="avcc-btns">' +
          '<button class="avcc-btn avcc-btn-accept" id="avcc-accept">✓ Alle akzeptieren</button>' +
          '<button class="avcc-btn avcc-btn-reject" id="avcc-reject">Nur notwendige</button>' +
          '<button class="avcc-btn-settings" id="avcc-toggle-details">Einstellungen anpassen ›</button>' +
        '</div>' +
        '<div id="avcc-details">' +
          '<div id="avcc-details-inner">' +
            buildToggleRow('avcc-necessary', 'Notwendige Cookies', 'Technisch erforderlich — immer aktiv', true, true) +
            buildToggleRow('avcc-analytics', 'Analyse (Google Analytics 4 &amp; Microsoft Clarity)', 'Hilft uns, die Nutzung der Website zu verstehen', false, false) +
            buildToggleRow('avcc-marketing', 'Marketing (Google Ads &amp; Meta/Instagram)', 'Für personalisierte Werbung auf Google und Instagram', false, false) +
            '<div id="avcc-save-row">' +
              '<button class="avcc-btn avcc-btn-accept" id="avcc-save">Auswahl speichern</button>' +
              '<button class="avcc-btn avcc-btn-reject" id="avcc-cancel">Abbrechen</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    /* Events Banner */
    document.getElementById('avcc-accept').addEventListener('click', function () { saveConsent(true, true); });
    document.getElementById('avcc-reject').addEventListener('click', function () { saveConsent(false, false); });
    document.getElementById('avcc-toggle-details').addEventListener('click', toggleDetails);
    document.getElementById('avcc-save').addEventListener('click', function () {
      saveConsent(
        document.getElementById('avcc-analytics').checked,
        document.getElementById('avcc-marketing').checked
      );
    });
    document.getElementById('avcc-cancel').addEventListener('click', function () {
      document.getElementById('avcc-details').classList.remove('avcc-open');
    });

    /* Banner einblenden */
    requestAnimationFrame(function () {
      overlay.classList.add('avcc-show');
    });
  }

  function buildToggleRow(id, label, desc, checked, disabled) {
    return '<div class="avcc-row">' +
      '<div class="avcc-row-label"><strong>' + label + '</strong><span>' + desc + '</span></div>' +
      '<label class="avcc-switch">' +
        '<input type="checkbox" id="' + id + '"' + (checked ? ' checked' : '') + (disabled ? ' disabled' : '') + '>' +
        '<span class="avcc-slider"></span>' +
      '</label>' +
    '</div>';
  }

  function toggleDetails() {
    var d = document.getElementById('avcc-details');
    d.classList.toggle('avcc-open');
  }

  function closeBanner() {
    var overlay = document.getElementById('avcc-overlay');
    if (overlay) {
      overlay.classList.remove('avcc-show');
      setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 400);
    }
  }

  /* ── Floating Reopen Button ── */
  function buildReopenBtn() {
    var btn = document.createElement('button');
    btn.id = 'avcc-reopen';
    btn.title = 'Cookie-Einstellungen';
    btn.setAttribute('aria-label', 'Cookie-Einstellungen ändern');
    btn.textContent = '🍪';
    document.body.appendChild(btn);
    btn.addEventListener('click', openModal);
  }

  function showReopenBtn() {
    var btn = document.getElementById('avcc-reopen');
    if (btn) btn.classList.add('avcc-visible');
  }

  /* ── Einstellungs-Modal (nachträgliche Änderung) ── */
  function buildModal() {
    var modal = document.createElement('div');
    modal.id = 'avcc-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Cookie-Einstellungen ändern');
    modal.innerHTML =
      '<div id="avcc-modal-card">' +
        '<h3>🍪 Cookie-Einstellungen</h3>' +
        '<p>Passen Sie Ihre Einwilligung jederzeit an. Weitere Informationen in unserer <a href="' + DSE_URL + '">Datenschutzerklärung</a>.</p>' +
        buildToggleRow('avcc-m-necessary', 'Notwendige Cookies', 'Immer aktiv', true, true) +
        buildToggleRow('avcc-m-analytics', 'Analyse (Google Analytics 4 &amp; Microsoft Clarity)', 'Nutzungsanalyse', false, false) +
        buildToggleRow('avcc-m-marketing', 'Marketing (Google Ads &amp; Meta/Instagram)', 'Personalisierte Werbung', false, false) +
        '<div id="avcc-save-row" style="margin-top:1.3rem;">' +
          '<button class="avcc-btn avcc-btn-accept" id="avcc-modal-save">Speichern</button>' +
          '<button class="avcc-btn avcc-btn-reject" id="avcc-modal-close">Schließen</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    document.getElementById('avcc-modal-save').addEventListener('click', function () {
      saveConsent(
        document.getElementById('avcc-m-analytics').checked,
        document.getElementById('avcc-m-marketing').checked
      );
      closeModal();
    });
    document.getElementById('avcc-modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  }

  function openModal() {
    var c = getConsent() || { analytics: false, marketing: false };
    var ma = document.getElementById('avcc-m-analytics');
    var mm = document.getElementById('avcc-m-marketing');
    if (ma) ma.checked = !!c.analytics;
    if (mm) mm.checked = !!c.marketing;
    document.getElementById('avcc-modal').classList.add('avcc-show');
  }

  function closeModal() {
    var modal = document.getElementById('avcc-modal');
    if (modal) modal.classList.remove('avcc-show');
  }

  /* Für Footer-Links: window.avplusOpenCookieSettings() */
  window.avplusOpenCookieSettings = openModal;

  /* ── Google Consent Mode v2: Einwilligung an gtag weitergeben ── */
  function updateGtagConsent(c) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('consent', 'update', {
      'analytics_storage': c.analytics ? 'granted' : 'denied',
      'ad_storage': c.marketing ? 'granted' : 'denied',
      'ad_user_data': c.marketing ? 'granted' : 'denied',
      'ad_personalization': c.marketing ? 'granted' : 'denied'
    });
  }

  /* ── Einwilligung anwenden ── */
  function applyConsent(c) {
    window._avplusConsent = c;
    updateGtagConsent(c);
    try { window.dispatchEvent(new CustomEvent('avplusConsentUpdated', { detail: c })); } catch (e) {}
  }

  /* ── Init ── */
  function init() {
    injectCSS();
    buildReopenBtn();
    buildModal();

    var consent = getConsent();
    if (consent) {
      applyConsent(consent);
      showReopenBtn();
    } else {
      buildBanner();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
