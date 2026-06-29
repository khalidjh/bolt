import { useStore } from '@nanostores/react';
import { useEffect, useState } from 'react';
import { BottomSheet } from '~/components/ui/BottomSheet';
import { useNetlifyDeploy } from '~/components/deploy/NetlifyDeploy.client';
import { netlifyConnection, netlifyOperatorDefault, fetchNetlifyStats } from '~/lib/stores/netlify';
import { workbenchStore } from '~/lib/stores/workbench';
import { streamingState } from '~/lib/stores/streaming';
import { chatId } from '~/lib/persistence/useChatHistory';
import { publishSheetOpen, closePublishSheet } from '~/lib/stores/sheets';
import { classNames } from '~/utils/classNames';

export function PublishSheet() {
  const open = useStore(publishSheetOpen);
  const connection = useStore(netlifyConnection);
  const operatorDefault = useStore(netlifyOperatorDefault);
  const currentChatId = useStore(chatId);
  const previews = useStore(workbenchStore.previews);
  const isStreaming = useStore(streamingState);
  const activePreview = previews[0];

  const { handleNetlifyDeploy } = useNetlifyDeploy();
  const [isDeploying, setIsDeploying] = useState(false);

  const netlifyAvailable = !!connection.user || operatorDefault;

  // Refresh the site list when the sheet opens so we can surface an existing URL.
  useEffect(() => {
    if (open && connection.token && currentChatId) {
      fetchNetlifyStats(connection.token);
    }
  }, [open, connection.token, currentChatId]);

  const deployedSite = connection.stats?.sites?.find((site) => site.name.includes(`bolt-diy-${currentChatId}`));
  const websiteUrl = deployedSite?.url;
  const hostname = websiteUrl ? websiteUrl.replace(/^https?:\/\//, '') : undefined;

  const canDeploy = netlifyAvailable && !!activePreview && !isStreaming && !isDeploying;

  const handlePublish = async () => {
    setIsDeploying(true);

    try {
      await handleNetlifyDeploy();

      if (connection.token) {
        await fetchNetlifyStats(connection.token);
      }
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={closePublishSheet} ariaTitle="Publish project">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={closePublishSheet}
            aria-label="Back"
            className="i-ph:caret-left text-lg text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary"
          />
          <h2 className="text-xl font-semibold text-bolt-elements-textPrimary">Publish</h2>
        </div>
        <a
          href="https://docs.netlify.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary"
        >
          <span className="i-ph:question" />
          Docs
        </a>
      </div>

      <div className="flex items-center gap-2 mt-4 mb-3 text-sm text-bolt-elements-textSecondary">
        <img className="w-4 h-4" crossOrigin="anonymous" src="https://cdn.simpleicons.org/netlify" alt="" />
        Hosted on Netlify
      </div>

      <p className="text-sm font-medium text-bolt-elements-textPrimary mb-2">Your website URL</p>
      <div className="flex items-center gap-2 rounded-xl px-3.5 py-3 border border-bolt-elements-borderColor bg-bolt-elements-background-depth-1">
        {hostname ? (
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-0 truncate text-sm font-medium text-bolt-elements-textPrimary hover:underline"
          >
            {hostname}
          </a>
        ) : (
          <span className="flex-1 min-w-0 truncate text-sm text-bolt-elements-textTertiary">
            Publish to generate your URL
          </span>
        )}
        {websiteUrl && <span className="i-ph:arrow-square-out text-base shrink-0 text-bolt-elements-textSecondary" />}
      </div>

      {/* Custom domain — Pro teaser */}
      <button
        type="button"
        disabled
        className="mt-3 w-full flex items-center gap-2.5 px-1 py-1 text-sm text-bolt-elements-textTertiary opacity-70 cursor-not-allowed"
      >
        <span className="i-ph:plus-circle text-lg" />
        Add custom domain
        <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-bolt-elements-background-depth-3">
          Pro
        </span>
      </button>

      {!netlifyAvailable && (
        <p className="mt-4 text-xs text-bolt-elements-textSecondary">
          Connect a Netlify account in Settings → Connections to publish your site.
        </p>
      )}

      <button
        type="button"
        onClick={handlePublish}
        disabled={!canDeploy}
        className={classNames(
          'mt-5 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors',
          'bg-accent-500 text-white hover:bg-bolt-elements-button-primary-backgroundHover',
          '[&:is(:disabled,.disabled)]:opacity-50 [&:is(:disabled,.disabled)]:cursor-not-allowed',
        )}
      >
        {isDeploying ? (
          <>
            <span className="i-svg-spinners:90-ring-with-bg" />
            Publishing…
          </>
        ) : (
          <>
            <span className="i-ph:rocket-launch" />
            {websiteUrl ? 'Republish' : 'Publish to Netlify'}
          </>
        )}
      </button>
    </BottomSheet>
  );
}
