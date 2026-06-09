/* CV Revamp scan funnel. One call: email + CV -> full hybrid3 diagnosis.
   States: upload -> loading -> result. Deploy to repo ROOT as /scan.js. */

var SCAN_API = 'https://script.google.com/macros/s/AKfycbxIWCr9SNW7TnIh7OqGq1RlY1wA5BNppTh7Mm9QGN6TquDHuSo39v9R17sxAX46yJjW/exec';
var CATEGORIES = ['ATS Parseability', 'Quantified Impact', 'Professional Summary & Positioning',
                  'Keyword Optimization', 'Skills Relevance', 'Education & Credentials',
                  'Certifications & Professional Development', 'Career Progression & Consistency'];

var turnstileToken = null;
var pendingFile = null;

window.onTurnstile = function (t) { turnstileToken = t; refreshBtn(); };
window.onTurnstileError = function (code) {
  if (window.console) console.error('Turnstile error:', code);
  var err = document.getElementById('upload-err');
  if (err) err.textContent = 'Security check error (' + code + '). Please refresh and try again.';
  turnstileToken = null; refreshBtn();
};
window.onTurnstileExpired = function () { turnstileToken = null; refreshBtn(); };

function show(id) {
  ['state-upload', 'state-loading', 'state-result'].forEach(function (s) {
    var el = document.getElementById(s); if (el) el.hidden = (s !== id);
  });
}
function refreshBtn() { document.getElementById('scan-btn').disabled = !(pendingFile && turnstileToken); }
function tier(s) { return s < 40 ? 'low' : (s < 70 ? 'mid' : 'high'); }
function fileToB64(f) {
  return new Promise(function (resolve, reject) {
    var r = new FileReader();
    r.onload = function () { resolve(r.result.split(',')[1]); };
    r.onerror = reject; r.readAsDataURL(f);
  });
}
function post(body) {
  return fetch(SCAN_API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
    .then(function (r) { return r.json(); });
}

/* ---- upload page: render the evaluation dials ---- */
(function renderDials() {
  var wrap = document.getElementById('dials'); if (!wrap) return;
  CATEGORIES.forEach(function (c) {
    var el = document.createElement('div'); el.className = 'dial';
    var ring = document.createElement('div'); ring.className = 'ring';
    var nm = document.createElement('div'); nm.className = 'dn'; nm.textContent = c;
    el.appendChild(ring); el.appendChild(nm); wrap.appendChild(el);
  });
})();

/* ---- file selection + drag-and-drop ---- */
var input = document.getElementById('cv-file');
input.addEventListener('change', function () {
  var f = input.files[0];
  var err = document.getElementById('upload-err');
  var nameBox = document.getElementById('file-name');
  var nameTxt = nameBox ? nameBox.querySelector('.file-name-text') : null;
  err.textContent = '';
  if (!f) { pendingFile = null; if (nameBox) nameBox.classList.remove('show'); refreshBtn(); return; }
  if (f.size > 5 * 1024 * 1024) { err.textContent = 'File is over 5 MB.'; pendingFile = null; if (nameBox) nameBox.classList.remove('show'); refreshBtn(); return; }
  pendingFile = f;
  if (nameTxt) { nameTxt.textContent = f.name; nameBox.classList.add('show'); }
  refreshBtn();
});
(function () {
  var area = document.querySelector('.file-upload-area'); if (!area) return;
  ['dragenter', 'dragover'].forEach(function (ev) {
    area.addEventListener(ev, function (e) { e.preventDefault(); e.stopPropagation(); area.classList.add('dragover'); });
  });
  area.addEventListener('dragleave', function (e) { e.preventDefault(); e.stopPropagation(); area.classList.remove('dragover'); });
  area.addEventListener('drop', function (e) {
    e.preventDefault(); e.stopPropagation(); area.classList.remove('dragover');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
      input.files = e.dataTransfer.files; input.dispatchEvent(new Event('change'));
    }
  });
  window.addEventListener('dragover', function (e) { e.preventDefault(); });
  window.addEventListener('drop', function (e) { e.preventDefault(); });
})();

/* ---- loading animation: make it feel like the system is reading the CV ---- */
var LSTEPS = ['Uploading your CV…', 'Extracting text and layout…', 'Parsing sections and dates…',
              'Matching against ATS keywords…', 'Scoring the 8 dimensions…', 'Compiling your breakdown…'];
var ltimer = null;
function startLoader() {
  var el = document.getElementById('loading-text'); var i = 0;
  if (el) el.textContent = LSTEPS[0];
  ltimer = setInterval(function () { i = Math.min(i + 1, LSTEPS.length - 1); if (el) el.textContent = LSTEPS[i]; }, 1700);
}
function stopLoader() { if (ltimer) { clearInterval(ltimer); ltimer = null; } }

/* ---- the score gauge (segmented ring) ---- */
function renderGauge(score) {
  var svg = document.getElementById('gauge'); if (!svg) return;
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  var N = 40, cx = 60, cy = 60, ro = 55, ri = 40, gap = 2;
  var lit = Math.round(score / 100 * N);
  var color = score < 40 ? '#FF5A5A' : (score < 70 ? '#FFC24B' : '#00FF87');
  var NS = 'http://www.w3.org/2000/svg', step = 360 / N;
  function p(r, deg) { var a = deg * Math.PI / 180; return [(cx + r * Math.cos(a)).toFixed(2), (cy + r * Math.sin(a)).toFixed(2)]; }
  for (var i = 0; i < N; i++) {
    var a1 = -90 + i * step + gap / 2, a2 = -90 + (i + 1) * step - gap / 2;
    var o1 = p(ro, a1), o2 = p(ro, a2), i2 = p(ri, a2), i1 = p(ri, a1);
    var d = 'M' + o1[0] + ' ' + o1[1] + ' A' + ro + ' ' + ro + ' 0 0 1 ' + o2[0] + ' ' + o2[1] +
            ' L' + i2[0] + ' ' + i2[1] + ' A' + ri + ' ' + ri + ' 0 0 0 ' + i1[0] + ' ' + i1[1] + ' Z';
    var path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', i < lit ? color : 'rgba(255,255,255,0.09)');
    svg.appendChild(path);
  }
}

/* ---- render the full hybrid3 diagnosis ---- */
function renderResult(res) {
  document.getElementById('score-num').textContent = res.overall_score;
  renderGauge(res.overall_score);

  var t = tier(res.overall_score);
  var hl = t === 'low' ? 'Your CV is being filtered out before a human sees it.'
         : t === 'mid' ? 'Your CV gets through, but it is leaking interviews.'
         : 'Your CV is strong, with a few gaps left to close.';
  document.getElementById('score-headline').textContent = hl;
  document.getElementById('score-summary').textContent = res.summary || '';

  var bars = document.getElementById('bars'); bars.innerHTML = '';
  (res.categories || []).forEach(function (c) {
    var tt = tier(c.score);
    var row = document.createElement('div'); row.className = 'row';
    var top = document.createElement('div'); top.className = 'rowtop';
    var cat = document.createElement('span'); cat.className = 'cat'; cat.textContent = c.name;
    var sc = document.createElement('span'); sc.className = 'sc t-' + tt; sc.textContent = c.score;
    top.appendChild(cat); top.appendChild(sc);
    var bar = document.createElement('div'); bar.className = 'bar';
    var fill = document.createElement('div'); fill.className = 'fill f-' + tt; fill.style.width = c.score + '%';
    bar.appendChild(fill);
    row.appendChild(top); row.appendChild(bar); bars.appendChild(row);
  });

  var iss = document.getElementById('issues'); iss.innerHTML = '';
  (res.issues || []).forEach(function (it) {
    var card = document.createElement('div'); card.className = 'issue';
    var top = document.createElement('div'); top.className = 'top';
    var cat = document.createElement('div'); cat.className = 'cat'; cat.textContent = it.category;
    var scc = document.createElement('div'); scc.className = 'scc'; scc.textContent = it.score + ' / 100';
    top.appendChild(cat); top.appendChild(scc);
    var p = document.createElement('p'); p.textContent = it.detail;
    var lock = document.createElement('span'); lock.className = 'lock'; lock.textContent = '🔒 The fix is included in your rebuild';
    card.appendChild(top); card.appendChild(p); card.appendChild(lock); iss.appendChild(card);
  });

  var more = (res.issues_found || 3) - 3;
  var tease = document.getElementById('tease');
  if (more > 0) {
    tease.textContent = '';
    tease.appendChild(document.createTextNode('We found '));
    var b = document.createElement('b'); b.textContent = more + ' more issue' + (more > 1 ? 's' : '');
    tease.appendChild(b);
    tease.appendChild(document.createTextNode(' across your CV that we fix in the full rebuild.'));
  } else { tease.textContent = ''; }

  show('state-result');
  window.scrollTo(0, 0);
  if (window.gtag) gtag('event', 'scan_scored', { score: res.overall_score });
}

/* ---- scan ---- */
document.getElementById('scan-btn').addEventListener('click', async function () {
  var email = document.getElementById('email-field').value.trim();
  var name = document.getElementById('name-field').value.trim();
  var err = document.getElementById('upload-err'); err.textContent = '';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = 'Enter a valid email.'; return; }
  if (!pendingFile) { err.textContent = 'Upload your CV first.'; return; }
  if (!turnstileToken) { err.textContent = 'Please complete the verification.'; return; }

  show('state-loading'); startLoader();
  var timeout = setTimeout(function () { var rb = document.getElementById('retry-btn'); if (rb) { rb.hidden = false; rb.style.display = 'inline-block'; } }, 75000);
  try {
    var b64 = await fileToB64(pendingFile);
    var res = await post({ action: 'scan', email: email, name: name, cvBase64: b64, fileName: pendingFile.name, mimeType: pendingFile.type, turnstileToken: turnstileToken });
    clearTimeout(timeout); stopLoader();
    if (res.status !== 'success') {
      show('state-upload');
      document.getElementById('upload-err').textContent = res.message || 'Scan failed. Please try again.';
      if (window.turnstile) { try { turnstile.reset(); } catch (e) {} }
      turnstileToken = null; refreshBtn();
      return;
    }
    try { await CVStore.saveScan({ blob: pendingFile, fileName: pendingFile.name, mimeType: pendingFile.type, name: name, email: email }); } catch (e) {}
    if (window.gtag) gtag('event', 'email_captured');
    renderResult(res);
  } catch (e) {
    clearTimeout(timeout); stopLoader(); show('state-upload');
    document.getElementById('upload-err').textContent = 'Something went wrong. Please try again.';
  }
});

document.getElementById('retry-btn').addEventListener('click', function () {
  stopLoader(); show('state-upload'); this.hidden = true; this.style.display = 'none';
});

var ctaLink = document.getElementById('cta-link');
if (ctaLink) ctaLink.addEventListener('click', function () { if (window.gtag) gtag('event', 'cta_clicked'); });

if (window.gtag) gtag('event', 'scan_started');
