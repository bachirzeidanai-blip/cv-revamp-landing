/* Cookie consent for cvrevamp.info
 *
 * Added 2026-09-02. Loaded FIRST in the head of every page, before any tag.
 *
 * Two categories, both off until the visitor chooses:
 *   analytics  PostHog (product analytics and session replay) and Google Analytics
 *   ads        Meta Pixel and the LinkedIn Insight Tag, plus Google Tag Manager which
 *              loads them and Google Analytics on the pages that use it
 * Cloudflare Turnstile is security and is never gated.
 *
 * Tags register with cvrConsent.when('ads', fn) or cvrConsent.when('analytics', fn).
 * The function runs immediately if that consent is already stored, or the moment the
 * visitor accepts. Nothing runs on reject. The choice lives in localStorage and can be
 * changed at any time from the small Cookies button that stays in the corner.
 *
 * Design rule: the two buttons are equal in weight. No pre-ticked boxes, no hidden
 * reject, no dark patterns. This site sells trust.
 */
(function () {
  'use strict';

  var KEY = 'cvr_consent';
  var VERSION = 1;
  var state = null;
  var listeners = { analytics: [], ads: [] };
  var fired = { analytics: false, ads: false };
  var lang = (document.documentElement.getAttribute('lang') || 'en').toLowerCase().indexOf('ar') === 0 ? 'ar' : 'en';

  var COPY = {
    en: {
      title: 'Cookies on cvrevamp.info',
      body: 'We use cookies for analytics and session replay (PostHog, Google Analytics) and to measure our advertising (Meta, LinkedIn). Anything you type into our forms is masked and never recorded. Security cookies (Cloudflare Turnstile) are always on.',
      accept: 'Accept all',
      reject: 'Reject non-essential',
      policy: 'Privacy policy',
      policyHref: '/privacy.html',
      pill: 'Cookies'
    },
    ar: {
      title: 'ملفات تعريف الارتباط على cvrevamp.info',
      body: 'نستخدم ملفات تعريف الارتباط للتحليلات وإعادة تشغيل الجلسات (PostHog و Google Analytics) ولقياس إعلاناتنا (Meta و LinkedIn). كل ما تكتبه في نماذجنا يُحجَب ولا يُسجَّل أبداً. ملفات الأمان (Cloudflare Turnstile) تعمل دائماً.',
      accept: 'قبول الكل',
      reject: 'رفض غير الضروري',
      policy: 'سياسة الخصوصية',
      policyHref: '/privacy-ar.html',
      pill: 'الكوكيز'
    }
  };

  function read() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || obj.v !== VERSION) return null;
      return { analytics: !!obj.analytics, ads: !!obj.ads, ts: obj.ts || null };
    } catch (e) { return null; }
  }

  function write(next) {
    try { window.localStorage.setItem(KEY, JSON.stringify({ v: VERSION, analytics: !!next.analytics, ads: !!next.ads, ts: new Date().toISOString() })); } catch (e) { /* private mode, keep in memory only */ }
  }

  function run(category) {
    if (fired[category]) return;
    fired[category] = true;
    var fns = listeners[category].slice();
    listeners[category] = [];
    for (var i = 0; i < fns.length; i++) { try { fns[i](); } catch (e) { /* one tag must never break another */ } }
  }

  function apply(next, announce) {
    state = { analytics: !!next.analytics, ads: !!next.ads, ts: next.ts || new Date().toISOString() };
    if (state.analytics) run('analytics');
    if (state.ads) run('ads');
    if (announce) {
      try { window.dispatchEvent(new CustomEvent('cvr:consent', { detail: { analytics: state.analytics, ads: state.ads } })); } catch (e) {}
    }
  }

  /* ---------- public API ---------- */
  var api = {
    get: function () { return state ? { analytics: state.analytics, ads: state.ads, ts: state.ts } : { analytics: false, ads: false, ts: null }; },
    has: function () { return !!state; },
    when: function (category, fn) {
      if (typeof fn !== 'function' || !listeners[category]) return;
      if (state && state[category]) { try { fn(); } catch (e) {} return; }
      listeners[category].push(fn);
    },
    accept: function () { write({ analytics: true, ads: true }); apply({ analytics: true, ads: true }, true); hideBanner(); showPill(); },
    rejectAll: function () { write({ analytics: false, ads: false }); apply({ analytics: false, ads: false }, true); hideBanner(); showPill(); },
    reset: function () { try { window.localStorage.removeItem(KEY); } catch (e) {} state = null; showBanner(); },
    setLang: function (l) { lang = l === 'ar' ? 'ar' : 'en'; if (bannerEl) { removeBanner(); showBanner(); } if (pillEl) { pillEl.textContent = COPY[lang].pill; } },
    open: function () { showBanner(); }
  };
  window.cvrConsent = api;

  /* ---------- UI ---------- */
  var bannerEl = null, pillEl = null, styleEl = null;

  function ensureStyle() {
    if (styleEl) return;
    styleEl = document.createElement('style');
    styleEl.textContent = [
      '#cvr-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;margin:0 auto;max-width:720px;background:#0A0A0A;color:#fff;border:1px solid rgba(255,255,255,.12);border-top:3px solid #00FF87;border-radius:14px;padding:18px 20px;box-shadow:0 12px 40px rgba(0,0,0,.55);font-family:"Space Grotesk",Cairo,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;line-height:1.55}',
      '#cvr-consent[dir="rtl"]{text-align:right}',
      '#cvr-consent h2{margin:0 0 6px;font-size:15px;font-weight:700;color:#fff}',
      '#cvr-consent p{margin:0 0 14px;color:#C9C9C9}',
      '#cvr-consent .cvr-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center}',
      '#cvr-consent button{flex:1 1 200px;min-height:42px;padding:10px 16px;border-radius:10px;font:inherit;font-weight:700;cursor:pointer;border:1px solid #00FF87;background:#00FF87;color:#0A0A0A}',
      '#cvr-consent button.cvr-reject{background:transparent;color:#fff;border-color:rgba(255,255,255,.35)}',
      '#cvr-consent button:focus-visible{outline:3px solid #fff;outline-offset:2px}',
      '#cvr-consent a{color:#00FF87;text-decoration:underline;white-space:nowrap;padding:6px 4px}',
      '#cvr-consent-pill{position:fixed;bottom:12px;z-index:2147482000;background:#0A0A0A;color:#C9C9C9;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:6px 12px;font:600 12px/1 "Space Grotesk",Cairo,system-ui,sans-serif;cursor:pointer;opacity:.85}',
      '#cvr-consent-pill:hover{opacity:1;color:#fff}',
      '#cvr-consent-pill[dir="ltr"]{left:12px}',
      '#cvr-consent-pill[dir="rtl"]{right:12px}',
      '@media (max-width:480px){#cvr-consent{left:8px;right:8px;bottom:8px;padding:16px}}'
    ].join('\n');
    document.head.appendChild(styleEl);
  }

  function showBanner() {
    if (bannerEl || !document.body) return;
    ensureStyle();
    var c = COPY[lang];
    var dir = lang === 'ar' ? 'rtl' : 'ltr';
    bannerEl = document.createElement('section');
    bannerEl.id = 'cvr-consent';
    bannerEl.setAttribute('role', 'dialog');
    bannerEl.setAttribute('aria-live', 'polite');
    bannerEl.setAttribute('aria-labelledby', 'cvr-consent-title');
    bannerEl.setAttribute('dir', dir);
    bannerEl.setAttribute('lang', lang);

    var h = document.createElement('h2'); h.id = 'cvr-consent-title'; h.textContent = c.title;
    var p = document.createElement('p'); p.textContent = c.body;
    var actions = document.createElement('div'); actions.className = 'cvr-actions';
    var accept = document.createElement('button'); accept.type = 'button'; accept.className = 'cvr-accept'; accept.textContent = c.accept;
    var reject = document.createElement('button'); reject.type = 'button'; reject.className = 'cvr-reject'; reject.textContent = c.reject;
    var link = document.createElement('a'); link.href = c.policyHref; link.textContent = c.policy;
    accept.addEventListener('click', api.accept);
    reject.addEventListener('click', api.rejectAll);
    actions.appendChild(accept); actions.appendChild(reject); actions.appendChild(link);
    bannerEl.appendChild(h); bannerEl.appendChild(p); bannerEl.appendChild(actions);
    document.body.appendChild(bannerEl);
    hidePill();
  }

  function removeBanner() { if (bannerEl && bannerEl.parentNode) bannerEl.parentNode.removeChild(bannerEl); bannerEl = null; }
  function hideBanner() { removeBanner(); }

  function showPill() {
    if (pillEl || !document.body) return;
    ensureStyle();
    pillEl = document.createElement('button');
    pillEl.id = 'cvr-consent-pill';
    pillEl.type = 'button';
    pillEl.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    pillEl.setAttribute('aria-label', COPY[lang].title);
    pillEl.textContent = COPY[lang].pill;
    pillEl.addEventListener('click', function () { hidePill(); showBanner(); });
    document.body.appendChild(pillEl);
  }
  function hidePill() { if (pillEl && pillEl.parentNode) pillEl.parentNode.removeChild(pillEl); pillEl = null; }

  /* ---------- boot ---------- */
  var stored = read();
  if (stored) apply(stored, false);

  function boot() {
    if (stored) showPill(); else showBanner();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
