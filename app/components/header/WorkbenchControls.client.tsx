import { useStore } from '@nanostores/react';
import { Slider, type SliderOptions } from '~/components/ui/Slider';
import { workbenchStore, type WorkbenchViewType } from '~/lib/stores/workbench';
import { usePreviewStore, previewDeviceModeStore } from '~/lib/stores/previews';
import { classNames } from '~/utils/classNames';

const sliderOptions: SliderOptions<WorkbenchViewType> = {
  left: { value: 'preview', text: 'Preview', icon: 'i-ph:globe' },
  middle: { value: 'code', text: 'Code', icon: 'i-ph:code' },
  right: { value: 'diff', text: 'Diff', icon: 'i-ph:git-diff' },
};

// Flat, Lovable-style icon button: transparent by default, faint circular hover, dimmed when disabled.
const iconButton = classNames(
  'group flex items-center justify-center w-9 h-9 rounded-full transition-all duration-150',
  'bg-transparent text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2 active:scale-95',
  '[&:disabled]:text-bolt-elements-textTertiary [&:disabled]:opacity-40 [&:disabled]:cursor-not-allowed [&:disabled]:hover:bg-transparent [&:disabled]:active:scale-100',
);

/**
 * Left-side view switcher (Code / Diff / Preview). Rendered in the header's left zone while the
 * workbench is open; lg-only since mobile uses the preview-only view + floating bar.
 */
export function WorkbenchViewSlider() {
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const selectedView = useStore(workbenchStore.currentView);

  if (!showWorkbench) {
    return null;
  }

  return (
    <Slider
      selected={selectedView}
      options={sliderOptions}
      setSelected={(view) => workbenchStore.currentView.set(view)}
    />
  );
}

/**
 * Center preview controls: reload, open in new tab, and the desktop/mobile size switch. Rendered in
 * the header center while the workbench is open.
 */
export function WorkbenchControls() {
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const previews = useStore(workbenchStore.previews);
  const isDeviceMode = useStore(previewDeviceModeStore);
  const previewStore = usePreviewStore();

  if (!showWorkbench) {
    return null;
  }

  const hasPreview = previews.length > 0;

  return (
    <div className="hidden lg:flex items-center gap-1">
      <button
        className={iconButton}
        disabled={!hasPreview}
        onClick={() => previewStore.refreshAllPreviews()}
        title="Reload preview"
        aria-label="Reload preview"
      >
        <span className="i-ph:arrow-clockwise text-base transition-transform duration-300 group-hover:rotate-90" />
      </button>
      <button
        className={iconButton}
        disabled={!hasPreview}
        onClick={() => {
          const url = previews[0]?.baseUrl;

          if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
          }
        }}
        title="Open in new tab"
        aria-label="Open in new tab"
      >
        <span className="i-ph:arrow-square-out text-base transition-transform duration-150 group-hover:-translate-y-px group-hover:translate-x-px" />
      </button>
      <button
        className={iconButton}
        disabled={!hasPreview}
        onClick={() => previewDeviceModeStore.set(!previewDeviceModeStore.get())}
        title={isDeviceMode ? 'Switch to desktop size' : 'Switch to mobile size'}
        aria-label={isDeviceMode ? 'Switch to desktop size' : 'Switch to mobile size'}
      >
        <span className={classNames(isDeviceMode ? 'i-ph:monitor' : 'i-ph:device-mobile', 'text-base')} />
      </button>
    </div>
  );
}
