/* Credit Score Hub — optional, consent-based Google Analytics 4.
 * No calculator values, entered balances, collection details or score results are sent.
 * Only the normal GA4 pageview is enabled after a visitor explicitly opts in.
 */
(function () {
  'use strict';
  const MEASUREMENT_ID = 'G-3SHJEG2YQ7';
  const STORAGE_KEY = 'credit-score-hub-analytics-consent-v1';
  const PRIVACY_URL = 'privacy.html';
  const SOURCE_URL = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(MEASUREMENT_ID);
  let loaded = false;

  function readChoice() {
    try {
      const choice = window.localStorage.getItem(STORAGE_KEY);
      return choice === 'granted' || choice === 'denied' ? choice : null;
    } catch (e) {
      return null;
    }
  }
  function saveChoice(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {
      // If storage is unavailable, visitors may have to decide on every visit.
    }
  }
  function consentState(granted) {
    return {
      analytics_storage: granted ? 'granted' : 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    };
  }
  function beginAnalytics() {
    if (loaded) return;
    loaded = true;
    window['ga-disable-' + MEASUREMENT_ID] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    // Basic consent mode: Google scripts are not loaded until visitor opts in.
    window.gtag('consent', 'default', consentState(false));
    window.gtag('consent', 'update', consentState(true));
    window.gtag('js', new Date());
    window.gtag('config', MEASUREMENT_ID, {
      send_page_view: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = SOURCE_URL;
    tag.setAttribute('data-credit-score-hub-analytics', 'true');
    document.head.appendChild(tag);
  }
  function deleteGaCookies() {
    // Best-effort first-party cleanup when consent is withdrawn.
    const cookieNames = document.cookie.split(';').map(s => s.trim().split('=')[0]).filter(name => /^_ga($|_)/.test(name));
    const domains = [undefined, location.hostname, '.' + location.hostname];
    for (const name of cookieNames) {
      for (const domain of domains) {
        document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax' + (domain ? '; Domain=' + domain : '');
      }
    }
  }
  function make(tagName, props, content) {
    const el = document.createElement(tagName);
    if (props) Object.entries(props).forEach(([key, value]) => el.setAttribute(key, value));
    if (typeof content === 'string') el.textContent = content;
    return el;
  }
  function hideBanner() {
    const existing = document.getElementById('csh-analytics-banner');
    if (existing) existing.remove();
  }
  function choose(value) {
    saveChoice(value);
    hideBanner();
    if (value === 'granted') {
      beginAnalytics();
    } else {
      window['ga-disable-' + MEASUREMENT_ID] = true;
      if (typeof window.gtag === 'function') {
        window.gtag('consent', 'update', consentState(false));
      }
      deleteGaCookies();
      // Unload any previously activated Google script so denial sends no pings.
      if (loaded) location.reload();
    }
  }
  function openBanner() {
    if (document.getElementById('csh-analytics-banner')) return;
    const banner = make('section', { id: 'csh-analytics-banner', role: 'region', 'aria-label': 'Analytics privacy preferences' });
    const content = make('div', { class: 'csh-analytics-message' });
    content.appendChild(make('strong', null, 'Your privacy matters'));
    content.appendChild(make('p', null, 'May Credit Score Hub use optional Google Analytics cookies to count page visits and improve the website? Your entered balances, loan information and score estimates are not sent to Analytics.'));
    const link = make('a', { href: PRIVACY_URL }, 'Privacy details');
    content.appendChild(link);
    const buttons = make('div', { class: 'csh-analytics-actions' });
    const decline = make('button', { type: 'button', class: 'csh-decline' }, 'Decline analytics');
    const accept = make('button', { type: 'button', class: 'csh-accept' }, 'Accept analytics');
    decline.addEventListener('click', () => choose('denied'));
    accept.addEventListener('click', () => choose('granted'));
    buttons.append(decline, accept);
    banner.append(content, buttons);
    document.body.appendChild(banner);
  }
  function installUI() {
    const css = make('style', { id: 'csh-analytics-style' });
    css.textContent = [
      '#csh-analytics-banner{position:fixed;z-index:2147483600;left:14px;right:14px;bottom:14px;max-width:970px;margin:auto;box-sizing:border-box;padding:18px 20px;border-radius:16px;border:1px solid #bddccc;background:#fff;box-shadow:0 14px 55px rgba(19,47,42,.24);color:#213f41;display:flex;gap:18px;align-items:center;font:13px/1.55 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '#csh-analytics-banner .csh-analytics-message{flex:1;min-width:0}',
      '#csh-analytics-banner strong{display:block;margin-bottom:4px;font-size:15px}',
      '#csh-analytics-banner p{margin:0 0 4px;font-size:12px;color:#58716a}',
      '#csh-analytics-banner a{font-size:12px;color:#126d60;font-weight:700}',
      '#csh-analytics-banner .csh-analytics-actions{display:flex;gap:8px;flex-wrap:wrap}',
      '#csh-analytics-banner button{border:1px solid #b7d7c6;padding:11px 13px;border-radius:9px;font:700 12px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;white-space:nowrap;cursor:pointer}',
      '#csh-analytics-banner .csh-decline{background:#fff;color:#24534b}',
      '#csh-analytics-banner .csh-accept{background:#0b7564;color:#fff;border-color:#0b7564}',
      '.csh-privacy-links{display:flex;flex-wrap:wrap;gap:14px;align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid #dce6df;font:12px/1.6 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#60746d}',
      '.csh-privacy-links a{color:#176c5c}',
      '.csh-privacy-links button{padding:0;border:0;background:none;text-decoration:underline;color:#176c5c;cursor:pointer;font:inherit}',
      '#csh-analytics-banner button:focus-visible,.csh-privacy-links button:focus-visible{outline:3px solid #8ed6bd;outline-offset:2px}',
      '@media(max-width:690px){#csh-analytics-banner{left:10px;right:10px;bottom:10px;display:block;padding:15px}#csh-analytics-banner .csh-analytics-actions{margin-top:12px}#csh-analytics-banner button{flex:1}}'
    ].join('\n');
    document.head.appendChild(css);
    const footer = document.querySelector('footer');
    if (footer) {
      const links = make('div', { class: 'csh-privacy-links' });
      links.appendChild(make('a', { href: PRIVACY_URL }, 'Privacy & analytics'));
      const pref = make('button', { type: 'button', id: 'csh-privacy-settings' }, 'Change analytics preference');
      pref.addEventListener('click', openBanner);
      links.appendChild(pref);
      footer.appendChild(links);
    }
    const privacyButton = document.getElementById('csh-open-privacy-preferences');
    if (privacyButton) privacyButton.addEventListener('click', openBanner);
    const choice = readChoice();
    if (choice === 'granted') beginAnalytics();
    else if (choice === null) openBanner();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installUI);
  else installUI();
})();
