/* Shared CV store for the scan funnel. Holds ONE scanned CV (Blob + metadata)
   in IndexedDB, 24h TTL, used to carry the CV from /scan into checkout.
   Loaded by both scan.html and index.html. Deploy to the repo ROOT as /cv-store.js. */
(function (global) {
  var DB = 'cvrevamp', STORE = 'scan', KEY = 'current', TTL_MS = 24 * 60 * 60 * 1000;

  function open() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  async function saveScan(rec) {
    /* rec: { blob, fileName, mimeType, name, email } */
    try {
      if (navigator.storage && navigator.storage.estimate) {
        var est = await navigator.storage.estimate();
        if (est.quota && est.usage && (est.quota - est.usage) < rec.blob.size * 2) return false;
      }
      var db = await open();
      await new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put({ rec: rec, ts: Date.now() }, KEY);
        tx.oncomplete = resolve; tx.onerror = function () { reject(tx.error); };
      });
      return true;
    } catch (e) { return false; }
  }

  async function getScan() {
    try {
      var db = await open();
      var wrapped = await new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readonly');
        var g = tx.objectStore(STORE).get(KEY);
        g.onsuccess = function () { resolve(g.result); };
        g.onerror = function () { reject(g.error); };
      });
      if (!wrapped) return null;
      if (Date.now() - wrapped.ts > TTL_MS) { await clearScan(); return null; }
      return wrapped.rec;
    } catch (e) { return null; }
  }

  async function clearScan() {
    try {
      var db = await open();
      await new Promise(function (resolve) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(KEY);
        tx.oncomplete = resolve; tx.onerror = resolve;
      });
    } catch (e) {}
  }

  global.CVStore = { saveScan: saveScan, getScan: getScan, clearScan: clearScan };
})(window);
