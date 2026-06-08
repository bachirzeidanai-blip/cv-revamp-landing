/* Scan funnel state machine. Deploy to repo ROOT as /scan.js.
   States: upload -> loading -> score+gate -> revealed.
   Calls the standalone Scan API. One Claude call on scan; issues released only on reveal. */

var SCAN_API = 'https://script.google.com/macros/s/AKfycbxIWCr9SNW7TnIh7OqGq1RlY1wA5BNppTh7Mm9QGN6TquDHuSo39v9R17sxAX46yJjW/exec';

var turnstileToken = null;
var lastScan = null;     /* { nonce, score, verdict, name } */
var pendingFile = null;  /* the File the user picked */

window.onTurnstile = function (t) { turnstileToken = t; refreshScanBtn(); };

function show(id) {
  ['state-upload', 'state-loading', 'state-score', 'state-revealed'].forEach(function (s) {
    document.getElementById(s).hidden = (s !== id);
  });
}
function refreshScanBtn() {
  document.getElementById('scan-btn').disabled = !(pendingFile && turnstileToken);
}
function fileToBase64(file) {
  return new Promise(function (resolve, reject) {
    var r = new FileReader();
    r.onload = function () { resolve(r.result.split(',')[1]); };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
function post(body) {
  return fetch(SCAN_API, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, /* simple request: no CORS preflight */
    body: JSON.stringify(body)
  }).then(function (r) { return r.json(); });
}

document.getElementById('cv-file').addEventListener('change', function (e) {
  var f = e.target.files[0];
  var err = document.getElementById('upload-err');
  err.textContent = '';
  if (!f) { pendingFile = null; refreshScanBtn(); return; }
  if (f.size > 5 * 1024 * 1024) { err.textContent = 'File is over 5 MB.'; pendingFile = null; refreshScanBtn(); return; }
  pendingFile = f; refreshScanBtn();
});

document.getElementById('scan-btn').addEventListener('click', async function () {
  if (!pendingFile || !turnstileToken) return;
  show('state-loading');
  var timeout = setTimeout(function () { document.getElementById('retry-btn').hidden = false; }, 60000);
  try {
    var b64 = await fileToBase64(pendingFile);
    var res = await post({ action: 'scan', cvBase64: b64, fileName: pendingFile.name, mimeType: pendingFile.type, turnstileToken: turnstileToken });
    clearTimeout(timeout);
    if (res.status !== 'success') {
      show('state-upload');
      document.getElementById('upload-err').textContent = res.message || 'Scan failed.';
      return;
    }
    lastScan = res;
    if (window.gtag) gtag('event', 'scan_scored', { score: res.score });
    document.getElementById('score-line').textContent = 'Your CV scores ' + res.score + '/100 for the UAE job market.';
    document.getElementById('verdict-line').textContent = res.verdict;
    document.getElementById('name-field').value = res.name || '';
    show('state-score');
  } catch (e) {
    clearTimeout(timeout);
    show('state-upload');
    document.getElementById('upload-err').textContent = 'Something went wrong. Please try again.';
  }
});

document.getElementById('retry-btn').addEventListener('click', function () {
  show('state-upload');
  document.getElementById('retry-btn').hidden = true;
});

document.getElementById('reveal-btn').addEventListener('click', async function () {
  var email = document.getElementById('email-field').value.trim();
  var name = document.getElementById('name-field').value.trim();
  var err = document.getElementById('gate-err');
  err.textContent = '';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = 'Enter a valid email.'; return; }
  if (!lastScan) { err.textContent = 'Please re-run your scan.'; return; }

  var res = await post({ action: 'reveal', nonce: lastScan.nonce, email: email, name: name, turnstileToken: turnstileToken });
  if (res.status !== 'success') { err.textContent = res.message || 'Could not reveal. Try again.'; return; }

  if (window.gtag) gtag('event', 'email_captured');

  /* Stash the CV (Blob, not base64) + identity for checkout carry-forward. */
  if (pendingFile) {
    await CVStore.saveScan({ blob: pendingFile, fileName: pendingFile.name, mimeType: pendingFile.type, name: name, email: email });
  }

  var list = document.getElementById('issues-list');
  list.innerHTML = '';
  res.issues.forEach(function (i) { var li = document.createElement('li'); li.textContent = i; list.appendChild(li); });
  show('state-revealed');
});

document.getElementById('cta-link').addEventListener('click', function () {
  if (window.gtag) gtag('event', 'cta_clicked');
});

if (window.gtag) gtag('event', 'scan_started');
