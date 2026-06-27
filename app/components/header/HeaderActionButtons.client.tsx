import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import { chatStore } from '~/lib/stores/chat';
import { DeployButton } from '~/components/deploy/DeployButton';
import { classNames } from '~/utils/classNames';

interface HeaderActionButtonsProps {
  chatStarted: boolean;
}

export function HeaderActionButtons({ chatStarted }: HeaderActionButtonsProps) {
  const [activePreviewIndex] = useState(0);
  const previews = useStore(workbenchStore.previews);
  const activePreview = previews[activePreviewIndex];
  const showWorkbench = useStore(workbenchStore.showWorkbench);

  const shouldShowButtons = activePreview;

  return (
    <div className="flex items-center gap-1">
      {/* Mobile-only Chat / Code toggle: below `lg` the workbench covers the whole screen and its
          built-in chat toggle is disabled, leaving no way back to the chat. This switches between
          the two views by sliding the workbench panel in/out. */}
      {chatStarted && (
        <div className="flex lg:hidden mr-1 border border-bolt-elements-borderColor rounded-md overflow-hidden text-xs">
          <button
            onClick={() => {
              chatStore.setKey('showChat', true);
              workbenchStore.showWorkbench.set(false);
            }}
            className={classNames('flex items-center gap-1.5 px-3 py-1.5 transition-colors', {
              'bg-accent-500 text-white': !showWorkbench,
              'bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary':
                showWorkbench,
            })}
            title="Show chat"
          >
            <div className="i-ph:chat-circle-duotone" />
            Chat
          </button>
          <div className="w-px bg-bolt-elements-borderColor" />
          <button
            onClick={() => workbenchStore.showWorkbench.set(true)}
            className={classNames('flex items-center gap-1.5 px-3 py-1.5 transition-colors', {
              'bg-accent-500 text-white': showWorkbench,
              'bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary':
                !showWorkbench,
            })}
            title="Show code"
          >
            <div className="i-ph:code-duotone" />
            Code
          </button>
        </div>
      )}

      {/* Deploy Button */}
      {shouldShowButtons && <DeployButton />}

      {/* Debug Tools */}
      {shouldShowButtons && (
        <div className="flex border border-bolt-elements-borderColor rounded-md overflow-hidden text-sm">
          <button
            onClick={() =>
              window.open('https://github.com/stackblitz-labs/bolt.diy/issues/new?template=bug_report.yml', '_blank')
            }
            className="rounded-l-md items-center justify-center [&:is(:disabled,.disabled)]:cursor-not-allowed [&:is(:disabled,.disabled)]:opacity-60 px-3 py-1.5 text-xs bg-accent-500 text-white hover:text-bolt-elements-item-contentAccent [&:not(:disabled,.disabled)]:hover:bg-bolt-elements-button-primary-backgroundHover outline-accent-500 flex gap-1.5"
            title="Report Bug"
          >
            <div className="i-ph:bug" />
            <span className="hidden sm:inline">Report Bug</span>
          </button>
          <div className="w-px bg-bolt-elements-borderColor" />
          <button
            onClick={async () => {
              try {
                const { downloadDebugLog } = await import('~/utils/debugLogger');
                await downloadDebugLog();
              } catch (error) {
                console.error('Failed to download debug log:', error);
              }
            }}
            className="rounded-r-md items-center justify-center [&:is(:disabled,.disabled)]:cursor-not-allowed [&:is(:disabled,.disabled)]:opacity-60 px-3 py-1.5 text-xs bg-accent-500 text-white hover:text-bolt-elements-item-contentAccent [&:not(:disabled,.disabled)]:hover:bg-bolt-elements-button-primary-backgroundHover outline-accent-500 flex gap-1.5"
            title="Download Debug Log"
          >
            <div className="i-ph:download" />
            <span className="hidden sm:inline">Debug Log</span>
          </button>
        </div>
      )}
    </div>
  );
}
