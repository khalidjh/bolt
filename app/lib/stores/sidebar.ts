import { atom } from 'nanostores';

/**
 * Shared open/closed state for the left sidebar (Menu). Kept in a store so the
 * sidebar can be toggled both by the edge-hover trigger inside the Menu and by
 * the sidebar icon in the header.
 */
export const sidebarOpenStore = atom<boolean>(false);

export function toggleSidebar(force?: boolean) {
  sidebarOpenStore.set(typeof force === 'boolean' ? force : !sidebarOpenStore.get());
}
