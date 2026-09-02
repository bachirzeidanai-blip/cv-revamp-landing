/* PostHog product analytics for cvrevamp.info
 *
 * Added 2026-09-01. Purpose: the checkout leak. About 14 genuine sessions have ever
 * reached this site and one converted, and until now nothing could tell us where the
 * other thirteen stopped. Meta Pixel, GTM and the LinkedIn Insight Tag are already on
 * the page, but they are ad attribution tags, not product analytics: none of them can
 * show a funnel or replay a session.
 *
 * EU region on purpose. The form receives CVs with names, emails, phone numbers and
 * full career histories, so the data stays in the EU and session replay masks every
 * input. Do not turn masking off.
 *
 * The phc_ key is a public client key. It is meant to ship in page source and cannot
 * read data back; only the phx_ personal key can, and that one never leaves
 * %USERPROFILE%\.secrets\personal.env.
 *
 * Funnel this instruments, in order:
 *   1. $pageview            every page, automatic
 *   2. cv_form_submitted    the visitor pressed Submit and passed validation
 *   3. lead_saved           the Apps Script webhook accepted the row and the CV
 *   4. checkout_opened      we are about to hand them to Stripe
 *   5. purchase_completed   thank-you.html loaded
 * The leak lives between 4 and 5.
 */
!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

posthog.init('phc_t74NgHpJwerzN4p86j66MHmvAoaQ9F7fDxDRwdXKyuQo', {
  api_host: 'https://eu.i.posthog.com',
  person_profiles: 'identified_only',

  /* Consent, three layers deep, because the default alone is not enough:
     - opt_out_capturing_by_default only governs brand-new visitors. A returning visitor
       whose browser holds a stored opt-in from before the banner existed keeps capturing.
       So consent is also enforced explicitly after init (see below).
     - capture_pageview is off and the $pageview is sent by hand after consent, otherwise
       the automatic one can fire before the explicit opt-out lands for those visitors.
     - persistence starts in memory so no PostHog cookie or localStorage entry exists
       before acceptance; it is switched to localStorage+cookie on opt-in. */
  opt_out_capturing_by_default: true,
  capture_pageview: false,
  capture_pageleave: true,
  disable_session_recording: true,
  persistence: 'memory',

  /* Privacy. This site receives CVs, so recordings must never carry the contents of
     the form. maskAllInputs covers name, email, phone, LinkedIn and the file chooser. */
  session_recording: {
    maskAllInputs: true,
    maskTextSelector: '[data-ph-mask]',
    blockSelector: '[data-ph-block]'
  }
});

/* Wire consent. If analytics consent is already stored, opt in now; otherwise wait for
   the banner. On a late opt-in the automatic $pageview has already been suppressed, so
   capture it by hand, or the funnel loses its first step for consenting visitors. */
(function () {
  function optIn() {
    try {
      if (!window.posthog || !posthog.opt_in_capturing) return;
      posthog.set_config({ persistence: 'localStorage+cookie' });
      posthog.opt_in_capturing();
      posthog.startSessionRecording();
      posthog.capture('$pageview');
    } catch (e) {}
  }
  function optOut() {
    try {
      if (!window.posthog || !posthog.opt_out_capturing) return;
      posthog.opt_out_capturing();
    } catch (e) {}
  }
  var consent = window.cvrConsent ? window.cvrConsent.get() : { analytics: false };
  if (consent.analytics) {
    optIn();
  } else {
    /* Enforce, do not assume. Also covers a page where consent.js failed to load:
       stay opted out rather than fail open. */
    optOut();
    if (window.cvrConsent) window.cvrConsent.when('analytics', optIn);
  }
})();

/* Small helper so the call sites stay readable and never throw if the SDK is blocked
   by an ad blocker, which a meaningful share of visitors will have. */
window.cvrTrack = function (event, props) {
  try {
    if (window.posthog && typeof window.posthog.capture === 'function') {
      window.posthog.capture(event, props || {});
    }
  } catch (e) {
    /* Analytics must never break the funnel it is measuring. */
  }
};
