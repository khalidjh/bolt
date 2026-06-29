import { useStore } from '@nanostores/react';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import { usePreviewStore } from '~/lib/stores/previews';
import { openShareSheet } from '~/lib/stores/sheets';
import { classNames } from '~/utils/classNames';

/**
 * Floating control bar shown over the preview on mobile (Lovable-style). Keeps the experience
 * preview-first for non-technical users: bottom-left returns to the chat, bottom-right reloads
 * the preview and opens the Share sheet.
 */
export function PreviewBar() {
  const previewStore = usePreviewStore();
  const previews = useStore(workbenchStore.previews);
  const hasPreview = previews.length > 0;

  const backToChat = () => {
    chatStore.setKey('showChat', true);
    workbenchStore.showWorkbench.set(false);
  };

  // Layout-only base; colour utilities are applied per-button so a variant's bg/text/border can't
  // be clobbered by the neutral defaults (UnoCSS resolves conflicting utilities by stylesheet order,
  // not by class-string order).
  const roundButtonBase =
    'flex items-center justify-center w-11 h-11 rounded-full shrink-0 transition-colors shadow-sm';
  const roundButton = classNames(
    roundButtonBase,
    'border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3',
  );

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] flex items-center justify-between px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] min-h-[4.75rem] border-t border-bolt-elements-borderColor bg-bolt-elements-background-depth-1/95 backdrop-blur-sm pointer-events-none">
      <button
        type="button"
        onClick={backToChat}
        className="pointer-events-auto flex items-center gap-1.5 h-11 pl-3 pr-4 rounded-full text-sm font-medium transition-colors border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3 shadow-sm"
      >
        <span className="i-ph:caret-left text-base" />
        Chat
      </button>

      <div className="pointer-events-auto flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => previewStore.refreshAllPreviews()}
          disabled={!hasPreview}
          aria-label="Reload preview"
          className={classNames(roundButton, { 'opacity-50 cursor-not-allowed': !hasPreview })}
        >
          <span className="i-ph:arrow-clockwise text-lg" />
        </button>
        <button
          type="button"
          onClick={openShareSheet}
          aria-label="Share project"
          className={classNames(
            roundButtonBase,
            'border border-transparent bg-accent-500 text-white hover:bg-bolt-elements-button-primary-backgroundHover hover:text-white',
          )}
        >
          <span className="i-ph:export text-lg" />
        </button>
      </div>
    </div>
  );
}
