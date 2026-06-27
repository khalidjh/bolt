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
  const COOLDOWN_MS = 10_000;

  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0);

    if (Date.now() - last < COOLDOWN_MS) {
      // Already reloaded very recently — bail out to avoid a reload loop.
      return;
    }

    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // sessionStorage may be unavailable (private mode, etc.) — reload anyway.
  }

  window.location.reload();
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
    handleStaleChunkError();
  }
});

startTransition(() => {
  hydrateRoot(document.getElementById('root')!, <RemixBrowser />);
});
