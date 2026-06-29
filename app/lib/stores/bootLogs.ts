import { atom } from 'nanostores';

/**
 * Rolling buffer of the dev-server's stdout/stderr (npm install + npm run dev). Surfaced on the
 * mobile preview-only view while the live preview is still booting, so the user can see install
 * progress and any errors instead of an opaque "Getting your preview ready…" wait.
 */
export const bootLogs = atom<string>('');

const MAX_BOOT_LOG_CHARS = 16_000;

export function appendBootLog(chunk: string) {
  const next = bootLogs.get() + chunk;
  bootLogs.set(next.length > MAX_BOOT_LOG_CHARS ? next.slice(-MAX_BOOT_LOG_CHARS) : next);
}

export function clearBootLogs() {
  bootLogs.set('');
}
