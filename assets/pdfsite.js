/* pdf — jsonversal · shared helpers (client-side only, zero upload) */
(function () {
  'use strict';

  // derive vendor base dir from this script's own location
  var VENDOR = (document.currentScript && document.currentScript.src)
    ? document.currentScript.src.replace(/pdfsite\.js.*$/, 'vendor/')
    : 'assets/vendor/';

  var toastEl;
  function toast(msg, isErr) {
    if (!toastEl) toastEl = document.getElementById('toast');
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.className = 'show' + (isErr ? ' err' : '');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.className = ''; }, 2200);
  }

  function fmtBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(2) + ' MB';
  }

  function download(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 800);
  }

  function readAsArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(new Error('Could not read ' + file.name)); };
      r.readAsArrayBuffer(file);
    });
  }

  /* dropzone: click + drag&drop + programmatic input change */
  function makeDropzone(el, opts) {
    opts = opts || {};
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = opts.accept || '.pdf,application/pdf';
    input.multiple = !!opts.multiple;
    input.style.display = 'none';
    el.appendChild(input);
    el.addEventListener('click', function (e) {
      if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A') input.click();
    });
    el.addEventListener('dragover', function (e) { e.preventDefault(); el.classList.add('drag'); });
    el.addEventListener('dragleave', function () { el.classList.remove('drag'); });
    el.addEventListener('drop', function (e) {
      e.preventDefault(); el.classList.remove('drag');
      if (e.dataTransfer.files && e.dataTransfer.files.length && opts.onFiles) {
        opts.onFiles(Array.prototype.slice.call(e.dataTransfer.files));
      }
    });
    input.addEventListener('change', function () {
      if (input.files && input.files.length && opts.onFiles) {
        opts.onFiles(Array.prototype.slice.call(input.files));
      }
      input.value = '';
    });
    return input;
  }

  /* file list with optional remove / move up / move down */
  function renderFileList(container, files, handlers) {
    handlers = handlers || {};
    container.innerHTML = '';
    files.forEach(function (f, i) {
      var li = document.createElement('li');
      var name = document.createElement('span');
      name.className = 'fi'; name.textContent = f.name;
      var size = document.createElement('span');
      size.className = 'fs'; size.textContent = fmtBytes(f.size);
      li.appendChild(name); li.appendChild(size);
      if (handlers.onRemove) {
        var rm = document.createElement('button');
        rm.type = 'button'; rm.className = 'ghost'; rm.textContent = '✕';
        rm.title = 'Remove'; rm.setAttribute('data-i', i);
        rm.addEventListener('click', function (e) { e.stopPropagation(); handlers.onRemove(i); });
        li.appendChild(rm);
      }
      if (handlers.onMoveUp) {
        var up = document.createElement('button');
        up.type = 'button'; up.className = 'ghost'; up.textContent = '↑';
        up.title = 'Move up'; up.setAttribute('data-i', i);
        up.addEventListener('click', function (e) { e.stopPropagation(); if (i > 0) handlers.onMoveUp(i); });
        li.appendChild(up);
      }
      if (handlers.onMoveDown) {
        var dn = document.createElement('button');
        dn.type = 'button'; dn.className = 'ghost'; dn.textContent = '↓';
        dn.title = 'Move down'; dn.setAttribute('data-i', i);
        dn.addEventListener('click', function (e) { e.stopPropagation(); if (i < files.length - 1) handlers.onMoveDown(i); });
        li.appendChild(dn);
      }
      container.appendChild(li);
    });
  }

  /* "1,3,5-8" -> [1,3,5,6,7,8]; validates against total pages */
  function parseRanges(str, totalPages) {
    var out = [];
    var parts = String(str || '').split(',');
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].trim();
      if (!p) continue;
      var m = p.match(/^(\d+)\s*-\s*(\d+)$/);
      if (m) {
        var a = parseInt(m[1], 10), b = parseInt(m[2], 10);
        if (a < 1 || b < 1 || a > totalPages || b > totalPages) {
          throw new Error('Page range ' + p + ' is out of bounds (document has ' + totalPages + ' page' + (totalPages === 1 ? '' : 's') + ').');
        }
        if (b < a) { var t = a; a = b; b = t; }
        for (var q = a; q <= b; q++) out.push(q);
      } else if (/^\d+$/.test(p)) {
        var n = parseInt(p, 10);
        if (n < 1 || n > totalPages) {
          throw new Error('Page ' + n + ' is out of bounds (document has ' + totalPages + ' page' + (totalPages === 1 ? '' : 's') + ').');
        }
        out.push(n);
      } else {
        throw new Error('Cannot parse "' + p + '". Use formats like 1,3,5-8.');
      }
    }
    if (!out.length) throw new Error('No pages selected.');
    return out;
  }

  var pdfjsPromise;
  function loadPdfjs() {
    if (pdfjsPromise) return pdfjsPromise;
    pdfjsPromise = new Promise(function (resolve, reject) {
      if (window.pdfjsLib) { configureWorker(); resolve(window.pdfjsLib); return; }
      var s = document.createElement('script');
      s.src = VENDOR + 'pdf.min.js';
      s.onload = function () { configureWorker(); resolve(window.pdfjsLib); };
      s.onerror = function () { reject(new Error('Failed to load the PDF renderer.')); };
      document.head.appendChild(s);
    });
    function configureWorker() {
      pdfjsLib.GlobalWorkerOptions.workerSrc = VENDOR + 'pdf.worker.min.js';
    }
    return pdfjsPromise;
  }

  var jszipPromise;
  function loadJSZip() {
    if (jszipPromise) return jszipPromise;
    jszipPromise = new Promise(function (resolve, reject) {
      if (window.JSZip) { resolve(window.JSZip); return; }
      var s = document.createElement('script');
      s.src = VENDOR + 'jszip.min.js';
      s.onload = function () { resolve(window.JSZip); };
      s.onerror = function () { reject(new Error('Failed to load the zip packer.')); };
      document.head.appendChild(s);
    });
    return jszipPromise;
  }

  function setProgress(el, pct) {
    if (!el) return;
    el.classList.add('show');
    el.firstElementChild.style.width = Math.max(0, Math.min(100, pct)) + '%';
  }
  function setStatus(el, text) { if (el) el.textContent = text || ''; }

  /* cookie banner — we set zero cookies; this only records that the notice was seen */
  function initCookieBar() {
    var bar = document.getElementById('cookiebar');
    if (!bar) return;
    try {
      if (localStorage.getItem('pdfsite-cookie-notice')) return;
    } catch (e) { /* private mode: show anyway */ }
    bar.classList.add('show');
    var ok = document.getElementById('cookie-ok');
    if (ok) ok.addEventListener('click', function () {
      try { localStorage.setItem('pdfsite-cookie-notice', '1'); } catch (e) {}
      bar.classList.remove('show');
    });
  }

  /* service worker for offline use */
  function initSW() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol === 'file:') return;
    window.addEventListener('load', function () {
      var swPath = document.querySelector('base') ? '' : (location.pathname.indexOf('/tools/') !== -1 ? '../sw.js' : 'sw.js');
      navigator.serviceWorker.register(swPath).catch(function () { /* offline is a bonus, not a requirement */ });
    });
  }

  window.pdfsite = {
    VENDOR: VENDOR,
    toast: toast,
    fmtBytes: fmtBytes,
    download: download,
    readAsArrayBuffer: readAsArrayBuffer,
    makeDropzone: makeDropzone,
    renderFileList: renderFileList,
    parseRanges: parseRanges,
    loadPdfjs: loadPdfjs,
    loadJSZip: loadJSZip,
    setProgress: setProgress,
    setStatus: setStatus,
    initCookieBar: initCookieBar,
    initSW: initSW
  };
})();
