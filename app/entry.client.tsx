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
  const KEY = 'vite:preloadError:lastReload';
  const PARAM = '_staleReload';
  const COOLDOWN_MS = 10_000;
  const MAX_RELOADS = 3;

  /*
   * The attempt count rides in the URL so it survives the reload even when sessionStorage is
   * unavailable (private mode, disabled storage). This is the hard cap that prevents an infinite
   * reload loop when the failure is NOT a stale deploy.
   */
  const url = new URL(window.location.href);
  const count = Number(url.searchParams.get(PARAM) ?? '0') || 0;

  if (count >= MAX_RELOADS) {
    return;
  }

  // Time-based cooldown (best-effort) to avoid two reloads firing back-to-back from one failure.
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0);

    if (Date.now() - last < COOLDOWN_MS) {
      return;
    }

    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable — the URL-param cap above still bounds the retries.
  }

  url.searchParams.set(PARAM, String(count + 1));
  window.location.replace(url.toString());
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
