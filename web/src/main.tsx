import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { AuthProvider } from './auth';
import { App } from './App';

function isStandaloneApp() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIosDevice() {
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent)
    || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
}

function syncStandaloneMode() {
  document.documentElement.classList.toggle('is-standalone', isStandaloneApp());
}

function listenToMediaQuery(query: string, onChange: () => void) {
  const media = window.matchMedia(query);
  if (media.addEventListener) {
    media.addEventListener('change', onChange);
  } else {
    media.addListener(onChange);
  }
}

// Track the *visible* viewport height (excludes the Safari toolbar / keyboard)
// so the app shell + tab bar always fit the truly visible area on iOS.
function setAppHeight() {
  const visibleH = window.visualViewport?.height ?? window.innerHeight;
  const h = isStandaloneApp() && isIosDevice()
    ? Math.max(window.innerHeight, document.documentElement.clientHeight, window.screen.height || 0)
    : visibleH;
  document.documentElement.style.setProperty('--app-h', `${Math.round(h)}px`);
}
syncStandaloneMode();
setAppHeight();
listenToMediaQuery('(display-mode: standalone)', () => {
  syncStandaloneMode();
  setAppHeight();
});
window.visualViewport?.addEventListener('resize', setAppHeight);
window.addEventListener('resize', setAppHeight);
window.addEventListener('orientationchange', () => {
  syncStandaloneMode();
  setTimeout(setAppHeight, 250);
});

// Service worker: register + check for updates on focus; reload when a new
// version takes control so design/code changes show up without manual cache clears.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, r) {
    if (!r) return;
    setInterval(() => { r.update().catch(() => {}); }, 30 * 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') r.update().catch(() => {});
    });
  },
});
if ('serviceWorker' in navigator) {
  let hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return; } // first claim, not an update
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
