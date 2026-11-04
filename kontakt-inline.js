/* =====================================================
   AVplus e.U. – Handler für das lokale Kontaktformular
   auf den Leistungsseiten. Sendet an Formspree und zeigt
   eine Erfolgs-/Fehlermeldung ohne Seitenwechsel.
   Fällt ohne JavaScript auf einen normalen POST zurück.
   ===================================================== */
(function () {
  'use strict';

  function attach(form) {
    var btn = form.querySelector('.ki-submit');
    var msg = form.querySelector('.ki-msg');
    var defaultLabel = btn ? btn.textContent : 'Anfrage absenden →';

    /* Formulare mit data-require-contact: Telefon ODER E-Mail genügt.
       Solange eines davon ausgefüllt ist, ist das andere optional. */
    if (form.hasAttribute('data-require-contact')) {
      var tel = form.querySelector('[name="telefon"]');
      var mail = form.querySelector('[name="email"]');
      var syncRequired = function () {
        if (!tel || !mail) return;
        var hasTel = tel.value.trim() !== '';
        var hasMail = mail.value.trim() !== '';
        tel.required = !hasMail;
        mail.required = !hasTel;
      };
      if (tel) tel.addEventListener('input', syncRequired);
      if (mail) mail.addEventListener('input', syncRequired);
      syncRequired();
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (btn) { btn.textContent = 'Wird gesendet …'; btn.disabled = true; }
      if (msg) { msg.hidden = true; msg.className = 'ki-msg'; }

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      }).then(function (response) {
        if (!response.ok) throw new Error('Serverfehler');
        /* Erfolg an das Tracking melden (GA4 "generate_lead" + Google-Ads-Conversion) */
        try { window.dispatchEvent(new CustomEvent('avplusLeadSuccess')); } catch (err) {}
        if (msg) {
          msg.className = 'ki-msg ok';
          msg.textContent = '✓ Ihre Anfrage wurde gesendet! Wir melden uns innerhalb von 24 Stunden.';
          msg.hidden = false;
        }
        form.reset();
      }).catch(function () {
        if (msg) {
          msg.className = 'ki-msg err';
          msg.textContent = '✗ Senden fehlgeschlagen. Bitte rufen Sie uns an: +43 676 6520263 oder schreiben Sie an office@avplus.at';
          msg.hidden = false;
        }
      }).finally(function () {
        if (btn) { btn.textContent = defaultLabel; btn.disabled = false; }
      });
    });
  }

  function init() {
    var forms = document.querySelectorAll('.ki-form');
    for (var i = 0; i < forms.length; i++) attach(forms[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
