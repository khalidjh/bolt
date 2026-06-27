import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import { toggleSidebar } from '~/lib/stores/sidebar';

export function Header() {
  const chat = useStore(chatStore);

  return (
    <header
      className={classNames('flex items-center px-4 border-b h-[var(--header-height)]', {
        'border-transparent': !chat.started,
        'border-bolt-elements-borderColor': chat.started,
      })}
    >
      <div className="flex items-center gap-2 z-logo text-bolt-elements-textPrimary">
        <button
          className="i-ph:sidebar-simple-duotone text-xl text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors cursor-pointer"
          aria-label="Toggle sidebar"
          onClick={() => toggleSidebar()}
        />
        <a href="/" className="text-2xl font-semibold text-accent flex items-center" aria-label="Etlaq home">
          <img src="/logo-etlaq-light.svg" alt="Etlaq" className="w-[104px] inline-block dark:hidden" />
          <img src="/logo-etlaq-dark.svg" alt="Etlaq" className="w-[104px] inline-block hidden dark:block" />
        </a>
      </div>
      {chat.started && ( // Display ChatDescription and HeaderActionButtons only when the chat has started.
        <>
          <div className="flex-1 flex justify-center min-w-0 px-2">
            <span className="inline-flex items-center max-w-full truncate px-3 py-1 rounded-full text-sm font-medium text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2 transition-colors">
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
