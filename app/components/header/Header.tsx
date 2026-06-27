import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import { sidebarOpenStore, toggleSidebar } from '~/lib/stores/sidebar';

export function Header() {
  const chat = useStore(chatStore);
  const sidebarOpen = useStore(sidebarOpenStore);

  return (
    <header
      className={classNames('flex items-center px-4 border-b h-[var(--header-height)]', {
        'border-transparent': !chat.started,
        'border-bolt-elements-borderColor': chat.started,
      })}
    >
      <div className="flex items-center gap-2 z-logo text-bolt-elements-textPrimary">
        <button
          data-sidebar-toggle
          className={classNames(
            'flex items-center justify-center w-9 h-9 rounded-full shrink-0 cursor-pointer transition-colors',
            'border border-bolt-elements-borderColor bg-bolt-elements-background-depth-1',
            'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2',
          )}
          aria-label="Toggle sidebar"
          onClick={() => toggleSidebar()}
        >
          <span className="i-ph:sidebar-simple-duotone text-lg" />
        </button>
        {/* Hide the logo/name once a chat starts so the centered chat title has room, and
            when the sidebar is open so it doesn't overlap the sidebar's own logo (z-logo > z-sidebar). */}
        {!chat.started && !sidebarOpen && (
          <a href="/" className="text-2xl font-semibold text-accent flex items-center" aria-label="Etlaq home">
            <img src="/logo-etlaq-light.svg" alt="Etlaq" className="w-[104px] inline-block dark:hidden" />
            <img src="/logo-etlaq-dark.svg" alt="Etlaq" className="w-[104px] inline-block hidden dark:block" />
          </a>
        )}
      </div>
      {chat.started && ( // Display ChatDescription and HeaderActionButtons only when the chat has started.
        <>
          <div className="flex-1 flex justify-center min-w-0 px-2">
            <span
              className={classNames(
                'inline-flex items-center max-w-full truncate px-4 py-1.5 rounded-full text-sm font-medium',
                'border border-bolt-elements-borderColor bg-bolt-elements-background-depth-1 shadow-sm',
                'text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2 transition-colors',
              )}
            >
              <ClientOnly>{() => <ChatDescription />}</ClientOnly>
            </span>
          </div>
          <ClientOnly>
            {() => (
              <div className="">
                <HeaderActionButtons chatStarted={chat.started} />
              </div>
            )}
          </ClientOnly>
        </>
      )}
    </header>
  );
}
