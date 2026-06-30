import { WebContainer } from '@webcontainer/api';
import { WORK_DIR_NAME } from '~/utils/constants';
import { cleanStackTrace } from '~/utils/stacktrace';

interface WebContainerContext {
  loaded: boolean;
}

export const webcontainerContext: WebContainerContext = import.meta.hot?.data.webcontainerContext ?? {
  loaded: false,
};

if (import.meta.hot) {
  import.meta.hot.data.webcontainerContext = webcontainerContext;
}

export let webcontainer: Promise<WebContainer> = new Promise(() => {
  // noop for ssr
});

if (!import.meta.env.SSR) {
  webcontainer =
    import.meta.hot?.data.webcontainer ??
    Promise.resolve()
      .then(() => {
        return WebContainer.boot({
          /*
           * Must match the COEP header the document is served with (see entry.server.tsx:
           * `Cross-Origin-Embedder-Policy: require-corp`). Safari does not support the
           * `credentialless` COEP mode, so booting with it there hangs forever — leaving the
           * "Creating initial files" spinner stuck. `require-corp` is supported across Chrome,
           * Firefox and Safari 16.4+.
           */
          coep: 'require-corp',
          workdirName: WORK_DIR_NAME,
          forwardPreviewErrors: true, // Enable error forwarding from iframes
        });
      })
      .then(async (webcontainer) => {
        webcontainerContext.loaded = true;

        const { workbenchStore } = await import('~/lib/stores/workbench');

        const response = await fetch('/inspector-script.js');
        const inspectorScript = await response.text();
        await webcontainer.setPreviewScript(inspectorScript);

        // Listen for preview errors
        webcontainer.on('preview-message', (message) => {
          console.log('WebContainer preview message:', message);

          // Handle both uncaught exceptions and unhandled promise rejections
          if (message.type === 'PREVIEW_UNCAUGHT_EXCEPTION' || message.type === 'PREVIEW_UNHANDLED_REJECTION') {
            const isPromise = message.type === 'PREVIEW_UNHANDLED_REJECTION';
            const title = isPromise ? 'Unhandled Promise Rejection' : 'Uncaught Exception';
            workbenchStore.actionAlert.set({
              type: 'preview',
              title,
              description: 'message' in message ? message.message : 'Unknown error',
              content: `Error occurred at ${message.pathname}${message.search}${message.hash}\nPort: ${message.port}\n\nStack trace:\n${cleanStackTrace(message.stack || '')}`,
              source: 'preview',
            });
          }
        });

        return webcontainer;
      })
      .catch((error) => {
        /*
         * A boot failure (e.g. an unsupported browser, blocked SharedArrayBuffer, or a missing
         * cross-origin-isolation header) must not be swallowed: without this the promise rejects
         * silently and every `await webcontainer` downstream hangs, leaving spinners stuck forever.
         * Surface it so the failure is visible instead of an eternal "Creating initial files".
         */
        console.error('WebContainer failed to boot:', error);

        import('~/lib/stores/workbench')
          .then(({ workbenchStore }) => {
            workbenchStore.actionAlert.set({
              type: 'preview',
              title: 'Preview environment unavailable',
              description: 'The in-browser runtime could not start.',
              content: `WebContainer failed to boot. This usually means the browser doesn't support the required cross-origin isolation, or an extension is blocking it.\n\n${
                error instanceof Error ? error.message : String(error)
              }`,
              source: 'preview',
            });
          })
          .catch(() => {});

        throw error;
      });

  if (import.meta.hot) {
    import.meta.hot.data.webcontainer = webcontainer;
  }
}
