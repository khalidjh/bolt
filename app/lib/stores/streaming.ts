import { atom } from 'nanostores';

export const streamingState = atom<boolean>(false);

/*
 * True while the workbench is still draining queued file/shell actions — i.e. files are still being
 * written to the WebContainer. This stays true AFTER the chat text has finished streaming
 * (streamingState → false) because the action queue runs asynchronously behind the stream. Used to
 * keep a stale-chunk reload from interrupting the file-writing tail and leaving the last action
 * (e.g. the final component) stuck on a spinner.
 */
export const workbenchBusyState = atom<boolean>(false);
