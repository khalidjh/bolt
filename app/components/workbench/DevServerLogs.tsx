import { useStore } from '@nanostores/react';
import { useEffect, useMemo, useRef } from 'react';
import { bootLogs } from '~/lib/stores/bootLogs';

/*
 * Strip ANSI escape codes and collapse carriage-return redraws (npm progress bars) to the final
 * state of each line, so the raw terminal stream reads cleanly in a plain text view.
 */
function cleanLogs(raw: string) {
  return raw

    .replace(/\[[0-9;?]*[a-zA-Z]/g, '')
    .split('\n')
    .map((line) => line.split('\r').pop() ?? line)
    .join('\n')
    .trim();
}

/**
 * Mobile fallback shown while the dev server is still booting (no live preview yet). Mirrors the
 * "Getting your preview ready…" status and streams the install/boot output so a stuck or failing
 * build is visible instead of an opaque spinner.
 */
export function DevServerLogs() {
  const raw = useStore(bootLogs);
  const cleaned = useMemo(() => cleanLogs(raw), [raw]);
  const scrollRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const el = scrollRef.current;

    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [cleaned]);

  return (
    <div className="h-full flex flex-col bg-bolt-elements-background-depth-1">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-bolt-elements-borderColor select-none">
        <span className="inline-flex shrink-0 overflow-visible">
          <img src="/etlaq-mark.svg" alt="" aria-hidden className="etlaq-mark-thinking w-4 h-4" />
        </span>
        <span className="thinking-shimmer text-sm font-medium">Getting your preview ready…</span>
      </div>
      <pre
        ref={scrollRef}
        className="flex-1 overflow-auto p-4 text-[11px] leading-relaxed font-mono whitespace-pre-wrap break-words text-bolt-elements-textSecondary"
      >
        {cleaned || 'Installing dependencies and starting the development server…'}
      </pre>
    </div>
  );
}
