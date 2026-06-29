import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { WorkbenchControls, WorkbenchViewSlider } from './WorkbenchControls.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import { description as descriptionStore, chatTimestamp } from '~/lib/persistence';
import { sidebarOpenStore, toggleSidebar } from '~/lib/stores/sidebar';
import { workbenchStore } from '~/lib/stores/workbench';
import { formatRelativeTime } from '~/utils/formatRelativeTime';

export function Header() {
  const chat = useStore(chatStore);
  const sidebarOpen = useStore(sidebarOpenStore);
  const chatDescription = useStore(descriptionStore);
  const timestamp = useStore(chatTimestamp);
  const showWorkbench = useStore(workbenchStore.showWorkbench);

  const subtitle = formatRelativeTime(timestamp);

  // Reflect chat-started on the root element so CSS can give the pre-chat homepage a taller header
  // (keeps the centered logo off the top). Drives --header-height for both this header and the
  // sidebar header, so they stay aligned.
  useEffect(() => {
    document.documentElement.dataset.chatStarted = String(chat.started);
  }, [chat.started]);

  return (
    <header
      className={classNames(
        'relative shrink-0 items-center gap-2 px-4 py-2 border-b lg:border-b-0 h-[var(--header-height)]',
        {
          'border-transparent': !chat.started,
          'border-bolt-elements-borderColor': chat.started,

          /*
           * On mobile the workbench/preview covers the screen and provides its own controls, so hide
           * the header there to keep the preview fullscreen (it stays visible on desktop).
           */
          'hidden lg:flex': showWorkbench,
          flex: !showWorkbench,
        },
      )}
    >
      {/* Left zone: sidebar toggle, logo (pre-chat) and the desktop title block. */}
      <div className="flex items-center gap-2.5 z-logo text-bolt-elements-textPrimary min-w-0 lg:flex-1">
        <button
          data-sidebar-toggle
          className={classNames(
            'flex items-center justify-center w-9 h-9 rounded-full shrink-0 cursor-pointer transition-colors shadow-sm',
            'border border-bolt-elements-borderColor bg-bolt-elements-background-depth-1',
            'text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2',
          )}
          aria-label="Toggle sidebar"
          onClick={() => toggleSidebar()}
        >
          <span className="i-ph:sidebar-simple text-lg" />
        </button>

        {/* Hide the logo/name once a chat starts so the centered chat title has room, and
            when the sidebar is open so it doesn't overlap the sidebar's own logo (z-logo > z-sidebar).
            Absolutely centered in the header so it stays in the middle regardless of the toggle. */}
        {!chat.started && !sidebarOpen && (
          <a
            href="/"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center"
            aria-label="Etlaq home"
          >
            <img src="/logo-etlaq-light.svg" alt="Etlaq" className="h-10 w-auto inline-block dark:hidden" />
            <img src="/logo-etlaq-dark.svg" alt="Etlaq" className="h-10 w-auto inline-block hidden dark:block" />
          </a>
        )}

        {/* Desktop: project title + subtitle, far-left (Lovable-style). */}
        {chat.started && chatDescription && !sidebarOpen && (
          <div className="hidden lg:flex items-center gap-2.5">
            <img src="/etlaq-mark.svg" alt="" aria-hidden className="w-6 h-6 shrink-0" />
            <div className="flex flex-col leading-tight">
              <ClientOnly>{() => <ChatDescription variant="bare" align="start" />}</ClientOnly>
              {subtitle && <span className="text-[11px] text-bolt-elements-textTertiary whitespace-nowrap">{subtitle}</span>}
            </div>
          </div>
        )}
      </div>

      {/* Mobile: centered title pill + subtitle. */}
      {chat.started && chatDescription && !sidebarOpen && (
        <div className="lg:hidden flex-1 flex flex-col items-center justify-center min-w-0 px-2 leading-tight">
          <ClientOnly>{() => <ChatDescription />}</ClientOnly>
          {subtitle && (
            <span className="mt-0.5 text-[11px] text-bolt-elements-textTertiary truncate max-w-full">{subtitle}</span>
          )}
        </div>
      )}

      {/* Code/Diff/Preview switcher, aligned to the left edge of the workbench/preview panel
          (--workbench-left + the panel's px-4 inset) so it sits over the panel, not the far left. */}
      {chat.started && !sidebarOpen && (
        <div className="z-max hidden lg:block absolute top-1/2 -translate-y-1/2 mt-1 left-[calc(var(--workbench-left)_+_1rem)]">
          <ClientOnly>{() => <WorkbenchViewSlider />}</ClientOnly>
        </div>
      )}

      {/* Preview controls (reload / open external / size switch), centered over the workbench/preview
          panel — i.e. the midpoint between --workbench-left and the right edge — so they don't collide
          with the left-aligned view switcher on narrower viewports. */}
      {chat.started && !sidebarOpen && (
        <div className="z-max hidden lg:block absolute top-1/2 -translate-x-1/2 -translate-y-1/2 mt-1 left-[calc((100%_+_var(--workbench-left))_/_2)]">
          <ClientOnly>{() => <WorkbenchControls />}</ClientOnly>
        </div>
      )}

      {/* Right zone: actions (mobile play / desktop Share + Publish). flex-1 balances the left zone
          so the center controls stay centered on desktop. Hidden while the sidebar overlay is open. */}
      {chat.started && !sidebarOpen && (
        <div className="flex items-center ml-auto lg:flex-1 lg:justify-end">
          <ClientOnly>{() => <HeaderActionButtons chatStarted={chat.started} />}</ClientOnly>
        </div>
      )}
    </header>
  );
}
