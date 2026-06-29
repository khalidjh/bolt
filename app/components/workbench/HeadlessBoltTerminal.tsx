import { useStore } from '@nanostores/react';
import { themeStore } from '~/lib/stores/theme';
import { workbenchStore } from '~/lib/stores/workbench';
import { Terminal } from './terminal/Terminal';

/**
 * An off-screen bolt terminal mounted on mobile, where the full editor/terminal panel
 * (and thus TerminalTabs) is never rendered.
 *
 * Command execution is driven through an attached xterm: the action runner awaits
 * `BoltShell.ready()`, which only resolves once `attachBoltTerminal()` wires a terminal to the
 * shell. Without a mounted terminal the very first `npm install && npm run dev` action blocks on
 * `ready()` forever — the infinite "Run command" spinner seen on phones.
 *
 * The terminal is laid out with a real size (so xterm computes sane cols/rows) but positioned
 * far off-screen; its output is surfaced to the user through DevServerLogs instead.
 */
export function HeadlessBoltTerminal() {
  const theme = useStore(themeStore);

  return (
    <div aria-hidden className="absolute -left-[9999px] top-0 w-[800px] h-[300px] overflow-hidden pointer-events-none">
      <Terminal
        id="bolt-headless"
        className="h-full w-full"
        theme={theme}
        onTerminalReady={(terminal) => workbenchStore.attachBoltTerminal(terminal)}
        onTerminalResize={(cols, rows) => workbenchStore.onTerminalResize(cols, rows)}
      />
    </div>
  );
}
