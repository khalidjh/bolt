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
      {/* Mobile-only single toggle: below `lg` the workbench covers the whole screen, so one button
          flips between chat and code. It shows the OTHER view's label (in chat → "Code", in code →
          "Chat") and stays compact so the centered chat title has room. */}
      {chatStarted && (
        <button
          onClick={() => {
            if (showWorkbench) {
              chatStore.setKey('showChat', true);
              workbenchStore.showWorkbench.set(false);
            } else {
              workbenchStore.showWorkbench.set(true);
            }
          }}
          className={classNames(
            'flex lg:hidden items-center justify-center gap-1.5 mr-1 px-3 py-1.5 rounded-md text-xs transition-colors',
            'border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2',
            'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary',
          )}
          title={showWorkbench ? 'Show chat' : 'Show code'}
        >
          <div className={showWorkbench ? 'i-ph:chat-circle-duotone' : 'i-ph:code-duotone'} />
          {showWorkbench ? 'Chat' : 'Code'}
        </button>
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
