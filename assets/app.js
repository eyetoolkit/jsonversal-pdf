/* cloak — jsonversal · shared helpers (client-side only) */
(function () {
  'use strict';
  var toastEl;
  function toast(msg, isErr) {
    if (!toastEl) toastEl = document.getElementById('toast');
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.className = 'show' + (isErr ? ' err' : '');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.className = ''; }, 1900);
  }
  function copyText(text) {
    if (!text) return Promise.resolve(false);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; },
        function () { return fallbackCopy(text); });
    }
    return Promise.resolve(fallbackCopy(text));
  }
  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }
  function copyFrom(btn) {
    var sel = btn.getAttribute('data-copy');
    var node = sel ? document.querySelector(sel) : btn.previousElementSibling;
    var text = node ? (node.value || node.textContent || node.innerText || '') : '';
    if (!text.trim()) { toast('Nothing to copy', true); return; }
    copyText(text).then(function (ok) {
      toast(ok ? 'Copied to clipboard' : 'Copy failed', !ok);
    });
  }
  // expose (window.pdf is the namespace for this site; window.cloak kept for shared code)
  window.pdf = { toast: toast, copyText: copyText, copyFrom: copyFrom };
  window.cloak = window.pdf;
})();
