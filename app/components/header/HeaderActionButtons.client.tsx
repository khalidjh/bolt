import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import { openShareSheet, openPublishSheet } from '~/lib/stores/sheets';
import { classNames } from '~/utils/classNames';

interface HeaderActionButtonsProps {
  chatStarted: boolean;
}

export function HeaderActionButtons({ chatStarted }: HeaderActionButtonsProps) {
  const previews = useStore(workbenchStore.previews);
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const hasPreview = previews.length > 0;

  if (!chatStarted) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 ml-auto">
      {/* Mobile-only play button: below `lg` the workbench covers the whole screen. Non-technical
          users just want to see the app, so this jumps straight into the live preview. Getting back
          to chat is handled by the floating preview bar, so the button only shows while in chat. */}
      {!showWorkbench && (
        <button
          disabled={!hasPreview}
          onClick={() => {
            if (!hasPreview) {
              return;
            }

            workbenchStore.showWorkbench.set(true);
            workbenchStore.currentView.set('preview');
          }}
          className={classNames(
            'flex lg:hidden items-center justify-center w-9 h-9 rounded-full shrink-0 transition-colors shadow-sm',
            'border border-bolt-elements-borderColor',
            hasPreview
              ? 'bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2'
              : 'bg-bolt-elements-background-depth-2 text-bolt-elements-textTertiary opacity-60 cursor-not-allowed',
          )}
          title={hasPreview ? 'Preview your app' : 'No preview yet — still building'}
          aria-label="Preview your app"
        >
          <div className="i-ph:play-fill text-base" />
        </button>
      )}

      {/* Desktop actions: Share + Publish, mirroring the Lovable layout. The old Deploy/Debug
          cluster is replaced by these — deploy now lives behind "Publish". */}
      <div className="hidden lg:flex items-center gap-2">
        <button
          onClick={openShareSheet}
          className={classNames(
            'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors',
            'border border-bolt-elements-borderColor bg-bolt-elements-background-depth-1',
            'text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2',
          )}
          title="Share project"
        >
          <span className="i-ph:export text-base" />
          Share
        </button>
        <button
          onClick={openPublishSheet}
          className={classNames(
            'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors',
            'bg-accent-500 text-white hover:bg-bolt-elements-button-primary-backgroundHover',
          )}
          title="Publish project"
        >
          <span className="i-ph:rocket-launch text-base" />
          Publish
        </button>
      </div>
    </div>
  );
}
