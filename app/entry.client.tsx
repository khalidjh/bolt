import { RemixBrowser } from '@remix-run/react';
import { startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';

/**
 * After a redeploy, asset hashes change. A browser still running the previous
 * build will try to lazy-load chunks (e.g. /assets/index-*.js) that no longer
 * exist on the server, producing "Failed to fetch dynamically imported module"
 * 404s. Reloading the page pulls the fresh index.html and the new chunk names.
 *
 * A short cooldown (stored in sessionStorage) prevents an infinite reload loop
 * if the failure is caused by something other than a stale deploy.
 */
function handleStaleChunkError() {
  const COUNT_KEY = 'etlaq:staleReload:count';
  const TS_KEY = 'etlaq:staleReload:lastTs';
  const PARAM = '_staleReload';
  const COOLDOWN_MS = 10_000;
  const MAX_RELOADS = 2;

  /*
   * Count attempts in sessionStorage so the cap survives the app's own client-side navigation
   * (e.g. landing -> /chat/:id), which would otherwise strip a URL-param counter and let the loop
   * run forever. The URL param is only a fallback for when storage is unavailable (private mode).
   */
  let storageOk = true;
  let count = 0;
  let last = 0;

  try {
    count = Number(sessionStorage.getItem(COUNT_KEY) ?? '0') || 0;
    last = Number(sessionStorage.getItem(TS_KEY) ?? '0') || 0;
  } catch {
    storageOk = false;
  }

  const url = new URL(window.location.href);

  if (!storageOk) {
    count = Number(url.searchParams.get(PARAM) ?? '0') || 0;
  }

  if (count >= MAX_RELOADS) {
    // Persistent failure — stop reloading so we don't wipe the page (and any in-progress work) in a loop.
    return;
  }

  if (storageOk && last && Date.now() - last < COOLDOWN_MS) {
    // Don't fire twice from a single burst of failures.
    return;
  }

  if (storageOk) {
    try {
      sessionStorage.setItem(COUNT_KEY, String(count + 1));
      sessionStorage.setItem(TS_KEY, String(Date.now()));
    } catch {
      // ignore
    }

    window.location.reload();
  } else {
    url.searchParams.set(PARAM, String(count + 1));
    window.location.replace(url.toString());
  }
}

// Vite dispatches this when a dynamic import / module preload fails to load.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  handleStaleChunkError();
});

// Fallback: some chunk failures surface only as an unhandled rejection.
window.addEventListener('unhandledrejection', (event) => {
  const message = String(event.reason?.message ?? event.reason ?? '');

  if (/Failed to fetch dynamically imported module|error loading dynamically imported module/i.test(message)) {
    event.preventDefault();
    handleStaleChunkError();
  }
});

startTransition(() => {
  hydrateRoot(document.getElementById('root')!, <RemixBrowser />);
});
