import { atom } from 'nanostores';

/**
 * Controls the mobile "Share project" and "Publish" bottom sheets. Kept in a tiny shared
 * store so any entry point (the preview bottom bar, the header title menu, etc.) can open
 * them without prop-drilling, while the sheets themselves are mounted once in the workbench.
 */
export const shareSheetOpen = atom<boolean>(false);
export const publishSheetOpen = atom<boolean>(false);

export function openShareSheet() {
  publishSheetOpen.set(false);
  shareSheetOpen.set(true);
}

export function closeShareSheet() {
  shareSheetOpen.set(false);
}

export function openPublishSheet() {
  shareSheetOpen.set(false);
  publishSheetOpen.set(true);
}

export function closePublishSheet() {
  publishSheetOpen.set(false);
}
