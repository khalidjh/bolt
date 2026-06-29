import { useStore } from '@nanostores/react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { BottomSheet } from '~/components/ui/BottomSheet';
import { GitHubDeploymentDialog } from '~/components/deploy/GitHubDeploymentDialog';
import { useGitHubDeploy } from '~/components/deploy/GitHubDeploy.client';
import { workbenchStore } from '~/lib/stores/workbench';
import { shareSheetOpen, closeShareSheet, openPublishSheet } from '~/lib/stores/sheets';
import { classNames } from '~/utils/classNames';

interface ShareSheetProps {
  exportChat?: () => void;
}

interface ActionRowProps {
  icon: string;
  label: string;
  description?: string;
  onClick?: () => void;
  disabled?: boolean;
  badge?: string;
}

function ActionRow({ icon, label, description, onClick, disabled, badge }: ActionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={classNames(
        'w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-colors',
        'border border-bolt-elements-borderColor bg-bolt-elements-background-depth-1',
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:bg-bolt-elements-background-depth-3 hover:border-bolt-elements-borderColorActive cursor-pointer',
      )}
    >
      <span className={classNames(icon, 'text-lg shrink-0 text-bolt-elements-textSecondary')} />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-bolt-elements-textPrimary truncate">{label}</span>
        {description && <span className="block text-xs text-bolt-elements-textSecondary truncate">{description}</span>}
      </span>
      {badge ? (
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-bolt-elements-background-depth-3 text-bolt-elements-textSecondary">
          {badge}
        </span>
      ) : (
        !disabled && <span className="i-ph:caret-right text-base shrink-0 text-bolt-elements-textSecondary" />
      )}
    </button>
  );
}

export function ShareSheet({ exportChat }: ShareSheetProps) {
  const open = useStore(shareSheetOpen);
  const previews = useStore(workbenchStore.previews);
  const activePreview = previews[0];

  const { handleGitHubDeploy } = useGitHubDeploy();
  const [showGitHubDialog, setShowGitHubDialog] = useState(false);
  const [githubFiles, setGithubFiles] = useState<Record<string, string> | null>(null);
  const [githubProjectName, setGithubProjectName] = useState('');
  const [isPushing, setIsPushing] = useState(false);

  const handleSharePreview = async () => {
    if (!activePreview?.baseUrl) {
      toast.error('No live preview running yet');
      return;
    }

    try {
      await navigator.clipboard.writeText(activePreview.baseUrl);
      toast.success('Preview link copied to clipboard');
    } catch {
      toast.error('Could not copy the preview link');
    }
  };

  const handleDownloadZip = async () => {
    try {
      await workbenchStore.downloadZip();
    } catch {
      toast.error('Failed to download project');
    }
  };

  const handleExportChat = () => {
    if (exportChat) {
      exportChat();
      closeShareSheet();
    }
  };

  const handlePushToGitHub = async () => {
    setIsPushing(true);

    try {
      const result = await handleGitHubDeploy();

      if (result && result.success && result.files) {
        setGithubFiles(result.files);
        setGithubProjectName(result.projectName);
        setShowGitHubDialog(true);
        closeShareSheet();
      }
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <>
      <BottomSheet open={open} onClose={closeShareSheet} ariaTitle="Share project">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-semibold text-bolt-elements-textPrimary">Share project</h2>
          <span className="flex items-center gap-1.5 text-sm text-bolt-elements-textSecondary opacity-60">
            <span className="i-ph:share-network" />
            Invite link
            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-bolt-elements-background-depth-3">
              Soon
            </span>
          </span>
        </div>

        {/* Invite by email — teaser, no collaboration backend yet */}
        <div className="flex gap-2 mt-4 mb-5">
          <input
            type="email"
            disabled
            placeholder="Invite by email"
            className="flex-1 min-w-0 rounded-lg px-3.5 py-2.5 text-sm bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor text-bolt-elements-textPrimary placeholder:text-bolt-elements-textTertiary disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            disabled
            className="shrink-0 px-4 rounded-lg text-sm font-medium bg-accent-500 text-white opacity-50 cursor-not-allowed"
          >
            Invite
          </button>
        </div>

        <p className="text-xs font-medium uppercase tracking-wide text-bolt-elements-textTertiary mb-2">
          Share &amp; export
        </p>
        <div className="flex flex-col gap-2">
          <ActionRow
            icon="i-ph:link"
            label="Share preview"
            description={activePreview?.baseUrl ? 'Copy the live preview link' : 'Start the app to get a link'}
            onClick={handleSharePreview}
            disabled={!activePreview?.baseUrl}
          />
          <ActionRow
            icon="i-ph:download-simple"
            label="Download code"
            description="Export the project as a .zip"
            onClick={handleDownloadZip}
          />
          <ActionRow
            icon="i-ph:export"
            label="Export chat"
            description="Save the conversation as .json"
            onClick={handleExportChat}
            disabled={!exportChat}
          />
          <ActionRow
            icon="i-ph:github-logo"
            label={isPushing ? 'Preparing GitHub push…' : 'Push to GitHub'}
            description="Create or update a repository"
            onClick={handlePushToGitHub}
            disabled={isPushing}
          />
          <ActionRow
            icon="i-ph:envelope-simple"
            label="Invite teammates"
            description="Collaborate in real time"
            disabled
            badge="Soon"
          />
        </div>

        <button
          type="button"
          onClick={openPublishSheet}
          className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-accent-500 text-white hover:bg-bolt-elements-button-primary-backgroundHover transition-colors"
        >
          <span className="i-ph:rocket-launch" />
          Publish project
        </button>
      </BottomSheet>

      {showGitHubDialog && githubFiles && (
        <GitHubDeploymentDialog
          isOpen={showGitHubDialog}
          onClose={() => setShowGitHubDialog(false)}
          projectName={githubProjectName}
          files={githubFiles}
        />
      )}
    </>
  );
}
