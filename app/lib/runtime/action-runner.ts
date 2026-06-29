import type { WebContainer } from '@webcontainer/api';
import { path as nodePath } from '~/utils/path';
import { atom, map, type MapStore } from 'nanostores';
import type { ActionAlert, BoltAction, DeployAlert, FileHistory, SupabaseAction, SupabaseAlert } from '~/types/actions';
import { createScopedLogger } from '~/utils/logger';
import { unreachable } from '~/utils/unreachable';
import type { ActionCallbackData } from './message-parser';
import type { BoltShell } from '~/utils/shell';
import { appendBootLog, bootLogs, clearBootLogs } from '~/lib/stores/bootLogs';

const logger = createScopedLogger('ActionRunner');

export type ActionStatus = 'pending' | 'running' | 'complete' | 'aborted' | 'failed';

export type BaseActionState = BoltAction & {
  status: Exclude<ActionStatus, 'failed'>;
  abort: () => void;
  executed: boolean;
  abortSignal: AbortSignal;
};

export type FailedActionState = BoltAction &
  Omit<BaseActionState, 'status'> & {
    status: Extract<ActionStatus, 'failed'>;
    error: string;
  };

export type ActionState = BaseActionState | FailedActionState;

type BaseActionUpdate = Partial<Pick<BaseActionState, 'status' | 'abort' | 'executed'>>;

export type ActionStateUpdate =
  | BaseActionUpdate
  | (Omit<BaseActionUpdate, 'status'> & { status: 'failed'; error: string });

type ActionsMap = MapStore<Record<string, ActionState>>;

/**
 * Scan a shell command and return the quote character (" or ') that is left open, or null if all
 * quotes are balanced. Tracks which quote type we're inside so an apostrophe within "..." (or a
 * double-quote within '...') isn't miscounted, and ignores a quote escaped with a backslash while
 * outside of single quotes (inside single quotes the shell treats backslash literally).
 */
function findUnterminatedQuote(command: string): '"' | "'" | null {
  let openQuote: '"' | "'" | null = null;

  for (let i = 0; i < command.length; i++) {
    const char = command[i];

    if (char === '\\' && openQuote !== "'") {
      i++; // skip the escaped character
      continue;
    }

    if (char === '"' || char === "'") {
      if (openQuote === null) {
        openQuote = char;
      } else if (openQuote === char) {
        openQuote = null;
      }
    }
  }

  return openQuote;
}

class ActionCommandError extends Error {
  readonly _output: string;
  readonly _header: string;

  constructor(message: string, output: string) {
    // Create a formatted message that includes both the error message and output
    const formattedMessage = `Failed To Execute Shell Command: ${message}\n\nOutput:\n${output}`;
    super(formattedMessage);

    // Set the output separately so it can be accessed programmatically
    this._header = message;
    this._output = output;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, ActionCommandError.prototype);

    // Set the name of the error for better debugging
    this.name = 'ActionCommandError';
  }

  // Optional: Add a method to get just the terminal output
  get output() {
    return this._output;
  }
  get header() {
    return this._header;
  }
}

export class ActionRunner {
  #webcontainer: Promise<WebContainer>;
  #currentExecutionPromise: Promise<void> = Promise.resolve();
  #shellTerminal: () => BoltShell;
  runnerId = atom<string>(`${Date.now()}`);
  actions: ActionsMap = map({});
  onAlert?: (alert: ActionAlert) => void;
  onSupabaseAlert?: (alert: SupabaseAlert) => void;
  onDeployAlert?: (alert: DeployAlert) => void;
  buildOutput?: { path: string; exitCode: number; output: string };

  constructor(
    webcontainerPromise: Promise<WebContainer>,
    getShellTerminal: () => BoltShell,
    onAlert?: (alert: ActionAlert) => void,
    onSupabaseAlert?: (alert: SupabaseAlert) => void,
    onDeployAlert?: (alert: DeployAlert) => void,
  ) {
    this.#webcontainer = webcontainerPromise;
    this.#shellTerminal = getShellTerminal;
    this.onAlert = onAlert;
    this.onSupabaseAlert = onSupabaseAlert;
    this.onDeployAlert = onDeployAlert;
  }

  addAction(data: ActionCallbackData) {
    const { actionId } = data;

    const actions = this.actions.get();
    const action = actions[actionId];

    if (action) {
      // action already added
      return;
    }

    const abortController = new AbortController();

    this.actions.setKey(actionId, {
      ...data.action,
      status: 'pending',
      executed: false,
      abort: () => {
        abortController.abort();
        this.#updateAction(actionId, { status: 'aborted' });
      },
      abortSignal: abortController.signal,
    });

    this.#currentExecutionPromise.then(() => {
      this.#updateAction(actionId, { status: 'running' });
    });
  }

  async runAction(data: ActionCallbackData, isStreaming: boolean = false) {
    const { actionId } = data;
    const action = this.actions.get()[actionId];

    if (!action) {
      unreachable(`Action ${actionId} not found`);
    }

    if (action.executed) {
      return; // No return value here
    }

    if (isStreaming && action.type !== 'file') {
      return; // No return value here
    }

    this.#updateAction(actionId, { ...action, ...data.action, executed: !isStreaming });

    this.#currentExecutionPromise = this.#currentExecutionPromise
      .then(() => {
        return this.#executeAction(actionId, isStreaming);
      })
      .catch((error) => {
        logger.error('Action execution promise failed:', error);
      });

    await this.#currentExecutionPromise;

    return;
  }

  async #executeAction(actionId: string, isStreaming: boolean = false) {
    const action = this.actions.get()[actionId];

    this.#updateAction(actionId, { status: 'running' });

    /*
     * Guard against an empty shell/start command (a model sometimes emits <boltAction type="shell">
     * with no content). executeCommand would send a bare newline, and jsh shows a fresh prompt
     * without emitting an `exit` OSC — so waitTillOscCode('exit') hangs forever, spinning this step
     * and wedging the whole serialized action queue (including the dev-server fallback). Treat a
     * blank command as a no-op so the queue keeps moving.
     */
    if ((action.type === 'shell' || action.type === 'start') && !action.content?.trim()) {
      logger.debug(`Skipping empty ${action.type} command`);
      this.#updateAction(actionId, { status: 'complete' });

      return;
    }

    try {
      switch (action.type) {
        case 'shell': {
          /*
           * A dev-server command emitted as a plain shell action (e.g. "npm install && npm run dev")
           * never exits while the server is healthy, so awaiting it through #runShellAction would
           * leave this step spinning forever (visible on mobile, hidden behind the preview on
           * desktop). Launch it the same non-blocking way as a `start` action instead.
           */
          if (this.#isDevServerCommand(action.content)) {
            this.#launchDevServer(actionId, action);
            await new Promise((resolve) => setTimeout(resolve, 2000));

            return;
          }

          await this.#runShellAction(action);
          break;
        }
        case 'file': {
          await this.#runFileAction(action);
          break;
        }
        case 'supabase': {
          try {
            await this.handleSupabaseAction(action as SupabaseAction);
          } catch (error: any) {
            // Update action status
            this.#updateAction(actionId, {
              status: 'failed',
              error: error instanceof Error ? error.message : 'Supabase action failed',
            });

            // Return early without re-throwing
            return;
          }
          break;
        }
        case 'build': {
          const buildOutput = await this.#runBuildAction(action);

          // Store build output for deployment
          this.buildOutput = buildOutput;
          break;
        }
        case 'start': {
          // making the start app non blocking
          this.#launchDevServer(actionId, action);

          /*
           * adding a delay to avoid any race condition between 2 start actions
           * i am up for a better approach
           */
          await new Promise((resolve) => setTimeout(resolve, 2000));

          return;
        }
      }

      this.#updateAction(actionId, {
        status: isStreaming ? 'running' : action.abortSignal.aborted ? 'aborted' : 'complete',
      });
    } catch (error) {
      if (action.abortSignal.aborted) {
        return;
      }

      this.#updateAction(actionId, { status: 'failed', error: 'Action failed' });
      logger.error(`[${action.type}]:Action failed\n\n`, error);

      if (!(error instanceof ActionCommandError)) {
        return;
      }

      this.onAlert?.({
        type: 'error',
        title: 'Dev Server Failed',
        description: error.header,
        content: error.output,
      });

      // re-throw the error to be caught in the promise chain
      throw error;
    }
  }

  /*
   * Detect a long-running dev-server command so it can be launched non-blocking instead of awaited.
   * Matches the dev command at the start of the line or after a `&&`/`;`/`|` separator, which covers
   * the combined "npm install && npm run dev" form the model often emits as a single shell action.
   */
  #isDevServerCommand(content: string) {
    return /(^|&&|;|\|)\s*(npm run dev|npm start|npm run start|yarn dev|yarn start|pnpm (run )?dev|pnpm start|bun (run )?dev|vite|next dev|remix vite:dev|astro dev|nuxt dev|ng serve|expo start)\b/i.test(
      content,
    );
  }

  /*
   * Launch a dev server without blocking the action queue. #runStartAction installs deps if needed
   * and starts the server detached; it resolves once the server is confirmed up (or rejects if it
   * crashes), so the step flips to complete/failed instead of spinning on a never-exiting process.
   */
  #launchDevServer(actionId: string, action: ActionState) {
    this.#runStartAction(action)
      .then(() => this.#updateAction(actionId, { status: 'complete' }))
      .catch((err: Error) => {
        if (action.abortSignal.aborted) {
          return;
        }

        this.#updateAction(actionId, { status: 'failed', error: 'Action failed' });
        logger.error(`[${action.type}]:Action failed\n\n`, err);

        if (!(err instanceof ActionCommandError)) {
          return;
        }

        this.onAlert?.({
          type: 'error',
          title: 'Dev Server Failed',
          description: err.header,
          content: err.output,
        });
      });
  }

  async #runShellAction(action: ActionState) {
    if (action.type !== 'shell') {
      unreachable('Expected shell action');
    }

    // Nothing to run for an empty command — skip instead of spawning a no-op shell invocation.
    if (!action.content.trim()) {
      return;
    }

    const shell = this.#shellTerminal();
    await shell.ready();

    if (!shell || !shell.terminal || !shell.process) {
      unreachable('Shell terminal not found');
    }

    // Pre-validate command for common issues
    const validationResult = await this.#validateShellCommand(action.content);

    if (validationResult.shouldModify && validationResult.modifiedCommand) {
      logger.debug(`Modified command: ${action.content} -> ${validationResult.modifiedCommand}`);
      action.content = validationResult.modifiedCommand;
    }

    const resp = await shell.executeCommand(this.runnerId.get(), action.content, () => {
      logger.debug(`[${action.type}]:Aborting Action\n\n`, action);
      action.abort();
    });
    logger.debug(`${action.type} Shell Response: [exit code:${resp?.exitCode}]`);

    if (resp?.exitCode != 0) {
      const enhancedError = this.#createEnhancedShellError(action.content, resp?.exitCode, resp?.output);
      throw new ActionCommandError(enhancedError.title, enhancedError.details);
    }
  }

  async #runStartAction(action: ActionState) {
    if (action.type !== 'start' && action.type !== 'shell') {
      unreachable('Expected start or shell action');
    }

    if (!this.#shellTerminal) {
      unreachable('Shell terminal not found');
    }

    const shell = this.#shellTerminal();
    await shell.ready();

    if (!shell || !shell.terminal || !shell.process) {
      unreachable('Shell terminal not found');
    }

    clearBootLogs();

    // Make sure dependencies are actually present before launching the dev server. The preceding
    // install (setup shell action, or snapshot-restore setup) can fail or be interrupted — idle-
    // timeout Ctrl-C, a transient WebContainer cache error, the user cancelling — leaving
    // node_modules missing or partial, which makes `npm run dev` fail with "vite: command not
    // found". Reinstall first so the preview boots reliably.
    await this.#ensureDependenciesInstalled(shell);

    /*
     * Launch the dev server as its OWN detached process (not through the interactive shell). A dev
     * server on the interactive shell gets Ctrl-C'd by the next file-edit/shell action and wedges
     * the serialized action queue. The detached process has no idle watchdog, so it survives going
     * quiet once it's up. Output is mirrored to the terminal and into bootLogs for the preview view.
     */
    const devProcess = await shell.startDevServer(action.content, appendBootLog);

    if (!devProcess) {
      throw new ActionCommandError('Failed To Start Application', 'Dev server process could not be spawned.');
    }

    /*
     * Detect an immediate crash (bad script, missing bin, port error) without blocking on the long-
     * running server: race its exit against a short grace window. If it's still up after the grace
     * period, treat the start as successful.
     */
    const GRACE_MS = 8000;
    const outcome = await Promise.race([
      devProcess.exit.then((code) => ({ exited: true as const, code })),
      new Promise<{ exited: false }>((resolve) => setTimeout(() => resolve({ exited: false }), GRACE_MS)),
    ]);

    if (outcome.exited && outcome.code !== 0) {
      throw new ActionCommandError('Failed To Start Application', bootLogs.get() || 'No Output Available');
    }

    return undefined;
  }

  /**
   * Ensure node_modules is populated before the dev server starts. Treats deps as ready only when
   * node_modules/.bin exists and is non-empty (that's where vite/next/etc. live), so a half-finished
   * install is correctly detected as "not ready" and reinstalled. No-op for non-npm projects.
   */
  async #ensureDependenciesInstalled(shell: BoltShell) {
    const webcontainer = await this.#webcontainer;

    let hasPackageJson = false;

    try {
      await webcontainer.fs.readFile('package.json', 'utf-8');
      hasPackageJson = true;
    } catch {
      hasPackageJson = false;
    }

    if (!hasPackageJson) {
      return;
    }

    // Deps are ready only when node_modules/.bin exists and is non-empty (that's where vite/next/etc.
    // live), so a half-finished install is correctly detected as "not ready".
    const areDepsReady = async () => {
      try {
        const bin = await webcontainer.fs.readdir('node_modules/.bin');
        return bin.length > 0;
      } catch {
        return false;
      }
    };

    if (await areDepsReady()) {
      return;
    }

    logger.debug('Dependencies missing/incomplete before dev server start — installing first');
    appendBootLog('\n[etlaq] Installing dependencies before starting the dev server…\n');

    const resp = await shell.executeCommand(
      this.runnerId.get(),
      'npm install --no-audit --no-fund || (npm cache clean --force && npm install --no-audit --no-fund)',
    );

    /*
     * Don't trust the exit code alone: the install can report non-zero for reasons that don't mean
     * the deps are missing (the idle watchdog firing a Ctrl-C during npm's quiet download phase,
     * a transient WebContainer hiccup, npm's own post-install noise). The dev server only needs
     * node_modules to actually be present — so re-check the filesystem and only fail if .bin is still
     * missing. This avoids a spurious "Failed To Install Dependencies" when the install really worked.
     */
    if (await areDepsReady()) {
      return;
    }

    if (resp?.exitCode !== 0) {
      throw new ActionCommandError('Failed To Install Dependencies', resp?.output || 'No Output Available');
    }
  }

  async #runFileAction(action: ActionState) {
    if (action.type !== 'file') {
      unreachable('Expected file action');
    }

    const webcontainer = await this.#webcontainer;
    const relativePath = nodePath.relative(webcontainer.workdir, action.filePath);

    let folder = nodePath.dirname(relativePath);

    // remove trailing slashes
    folder = folder.replace(/\/+$/g, '');

    if (folder !== '.') {
      try {
        await webcontainer.fs.mkdir(folder, { recursive: true });
        logger.debug('Created folder', folder);
      } catch (error) {
        logger.error('Failed to create folder\n\n', error);
      }
    }

    try {
      await webcontainer.fs.writeFile(relativePath, action.content);
      logger.debug(`File written ${relativePath}`);
    } catch (error) {
      logger.error('Failed to write file\n\n', error);
    }
  }

  #updateAction(id: string, newState: ActionStateUpdate) {
    const actions = this.actions.get();

    this.actions.setKey(id, { ...actions[id], ...newState });
  }

  async getFileHistory(filePath: string): Promise<FileHistory | null> {
    try {
      const webcontainer = await this.#webcontainer;
      const historyPath = this.#getHistoryPath(filePath);
      const content = await webcontainer.fs.readFile(historyPath, 'utf-8');

      return JSON.parse(content);
    } catch (error) {
      logger.error('Failed to get file history:', error);
      return null;
    }
  }

  async saveFileHistory(filePath: string, history: FileHistory) {
    // const webcontainer = await this.#webcontainer;
    const historyPath = this.#getHistoryPath(filePath);

    await this.#runFileAction({
      type: 'file',
      filePath: historyPath,
      content: JSON.stringify(history),
      changeSource: 'auto-save',
    } as any);
  }

  #getHistoryPath(filePath: string) {
    return nodePath.join('.history', filePath);
  }

  async #runBuildAction(action: ActionState) {
    if (action.type !== 'build') {
      unreachable('Expected build action');
    }

    // Trigger build started alert
    this.onDeployAlert?.({
      type: 'info',
      title: 'Building Application',
      description: 'Building your application...',
      stage: 'building',
      buildStatus: 'running',
      deployStatus: 'pending',
      source: 'netlify',
    });

    const webcontainer = await this.#webcontainer;

    // Create a new terminal specifically for the build
    const buildProcess = await webcontainer.spawn('npm', ['run', 'build']);

    let output = '';
    const outputPromise = buildProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          output += data;
        },
      }),
    );

    const exitCode = await buildProcess.exit;
    await outputPromise.catch(() => {
      // Ignore output piping errors; we still have whatever was captured
    });

    let buildDir = '';

    if (exitCode !== 0) {
      const buildResult = {
        path: buildDir,
        exitCode,
        output,
      };

      this.buildOutput = buildResult;

      // Trigger build failed alert
      this.onDeployAlert?.({
        type: 'error',
        title: 'Build Failed',
        description: 'Your application build failed',
        content: output || 'No build output available',
        stage: 'building',
        buildStatus: 'failed',
        deployStatus: 'pending',
        source: 'netlify',
      });

      throw new ActionCommandError('Build Failed', output || 'No Output Available');
    }

    // Trigger build success alert
    this.onDeployAlert?.({
      type: 'success',
      title: 'Build Completed',
      description: 'Your application was built successfully',
      stage: 'deploying',
      buildStatus: 'complete',
      deployStatus: 'running',
      source: 'netlify',
    });

    // Check for common build directories
    const commonBuildDirs = ['dist', 'build', 'out', 'output', '.next', 'public'];

    // Try to find the first existing build directory
    for (const dir of commonBuildDirs) {
      const dirPath = nodePath.join(webcontainer.workdir, dir);

      try {
        await webcontainer.fs.readdir(dirPath);
        buildDir = dirPath;
        break;
      } catch {
        continue;
      }
    }

    // If no build directory was found, use the default (dist)
    if (!buildDir) {
      buildDir = nodePath.join(webcontainer.workdir, 'dist');
    }

    const buildResult = {
      path: buildDir,
      exitCode,
      output,
    };

    this.buildOutput = buildResult;

    return buildResult;
  }
  async handleSupabaseAction(action: SupabaseAction) {
    const { operation, content, filePath } = action;
    logger.debug('[Supabase Action]:', { operation, filePath, content });

    switch (operation) {
      case 'migration':
        if (!filePath) {
          throw new Error('Migration requires a filePath');
        }

        // Show alert for migration action
        this.onSupabaseAlert?.({
          type: 'info',
          title: 'Supabase Migration',
          description: `Create migration file: ${filePath}`,
          content,
          source: 'supabase',
        });

        // Only create the migration file
        await this.#runFileAction({
          type: 'file',
          filePath,
          content,
          changeSource: 'supabase',
        } as any);
        return { success: true };

      case 'query': {
        // Always show the alert and let the SupabaseAlert component handle connection state
        this.onSupabaseAlert?.({
          type: 'info',
          title: 'Supabase Query',
          description: 'Execute database query',
          content,
          source: 'supabase',
        });

        // The actual execution will be triggered from SupabaseChatAlert
        return { pending: true };
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  // Add this method declaration to the class
  handleDeployAction(
    stage: 'building' | 'deploying' | 'complete',
    status: ActionStatus,
    details?: {
      url?: string;
      error?: string;
      source?: 'netlify' | 'vercel' | 'github' | 'gitlab';
    },
  ): void {
    if (!this.onDeployAlert) {
      logger.debug('No deploy alert handler registered');
      return;
    }

    const alertType = status === 'failed' ? 'error' : status === 'complete' ? 'success' : 'info';

    const title =
      stage === 'building'
        ? 'Building Application'
        : stage === 'deploying'
          ? 'Deploying Application'
          : 'Deployment Complete';

    const description =
      status === 'failed'
        ? `${stage === 'building' ? 'Build' : 'Deployment'} failed`
        : status === 'running'
          ? `${stage === 'building' ? 'Building' : 'Deploying'} your application...`
          : status === 'complete'
            ? `${stage === 'building' ? 'Build' : 'Deployment'} completed successfully`
            : `Preparing to ${stage === 'building' ? 'build' : 'deploy'} your application`;

    const buildStatus =
      stage === 'building' ? status : stage === 'deploying' || stage === 'complete' ? 'complete' : 'pending';

    const deployStatus = stage === 'building' ? 'pending' : status;

    this.onDeployAlert({
      type: alertType,
      title,
      description,
      content: details?.error || '',
      url: details?.url,
      stage,
      buildStatus: buildStatus as any,
      deployStatus: deployStatus as any,
      source: details?.source || 'netlify',
    });
  }

  async #validateShellCommand(command: string): Promise<{
    shouldModify: boolean;
    modifiedCommand?: string;
    warning?: string;
  }> {
    const trimmedCommand = command.trim();

    /*
     * Guard against unbalanced quotes. A malformed command with an unclosed " or ' (e.g. a token
     * the model streamed badly, like `npm install --silent">`) leaves jsh sitting in quote-
     * continuation mode (the `dquote>` prompt) forever, wedging the terminal and blocking every
     * later action. Close the dangling quote so the command fails fast and recoverably instead.
     */
    const unterminatedQuote = findUnterminatedQuote(trimmedCommand);

    if (unterminatedQuote) {
      return {
        shouldModify: true,
        modifiedCommand: trimmedCommand + unterminatedQuote,
        warning: `Closed an unbalanced ${unterminatedQuote === '"' ? 'double' : 'single'} quote to keep the shell from hanging`,
      };
    }

    /*
     * Make npm installs resilient to WebContainer's transient in-browser npm cache corruption
     * ("EIO: '<pkg>' not found in cache"). Retry once after clearing the cache so a single hiccup
     * doesn't leave node_modules half-installed and break the preview. Only rewrites a command that
     * *starts* with an install and isn't already carrying a retry/cache-clean (avoids double-wrapping
     * the auto-generated setup commands, which build in their own retry).
     */
    if (!trimmedCommand.includes('cache clean')) {
      const installMatch = trimmedCommand.match(/^(npm\s+(?:install|i|ci)\b[^&|;]*?)(\s*(?:&&|\|\||;)[\s\S]*)?$/);

      if (installMatch) {
        const installPart = installMatch[1].trim();
        const rest = installMatch[2] ? ` ${installMatch[2].trim()}` : '';

        return {
          shouldModify: true,
          modifiedCommand: `(${installPart} || (npm cache clean --force && ${installPart}))${rest}`,
          warning: 'Added cache-clean retry to npm install for WebContainer resilience',
        };
      }
    }

    // Handle rm commands that might fail due to missing files
    if (trimmedCommand.startsWith('rm ') && !trimmedCommand.includes(' -f')) {
      const rmMatch = trimmedCommand.match(/^rm\s+(.+)$/);

      if (rmMatch) {
        const filePaths = rmMatch[1].split(/\s+/);

        // Check if any of the files exist using WebContainer
        try {
          const webcontainer = await this.#webcontainer;
          const existingFiles = [];

          for (const filePath of filePaths) {
            if (filePath.startsWith('-')) {
              continue;
            } // Skip flags

            try {
              await webcontainer.fs.readFile(filePath);
              existingFiles.push(filePath);
            } catch {
              // File doesn't exist, skip it
            }
          }

          if (existingFiles.length === 0) {
            // No files exist, modify command to use -f flag to avoid error
            return {
              shouldModify: true,
              modifiedCommand: `rm -f ${filePaths.join(' ')}`,
              warning: 'Added -f flag to rm command as target files do not exist',
            };
          } else if (existingFiles.length < filePaths.length) {
            // Some files don't exist, modify to only remove existing ones with -f for safety
            return {
              shouldModify: true,
              modifiedCommand: `rm -f ${filePaths.join(' ')}`,
              warning: 'Added -f flag to rm command as some target files do not exist',
            };
          }
        } catch (error) {
          logger.debug('Could not validate rm command files:', error);
        }
      }
    }

    // Handle cd commands to non-existent directories
    if (trimmedCommand.startsWith('cd ')) {
      const cdMatch = trimmedCommand.match(/^cd\s+(.+)$/);

      if (cdMatch) {
        const targetDir = cdMatch[1].trim();

        try {
          const webcontainer = await this.#webcontainer;
          await webcontainer.fs.readdir(targetDir);
        } catch {
          return {
            shouldModify: true,
            modifiedCommand: `mkdir -p ${targetDir} && cd ${targetDir}`,
            warning: 'Directory does not exist, created it first',
          };
        }
      }
    }

    // Handle cp/mv commands with missing source files
    if (trimmedCommand.match(/^(cp|mv)\s+/)) {
      const parts = trimmedCommand.split(/\s+/);

      if (parts.length >= 3) {
        const sourceFile = parts[1];

        try {
          const webcontainer = await this.#webcontainer;
          await webcontainer.fs.readFile(sourceFile);
        } catch {
          return {
            shouldModify: false,
            warning: `Source file '${sourceFile}' does not exist`,
          };
        }
      }
    }

    return { shouldModify: false };
  }

  #createEnhancedShellError(
    command: string,
    exitCode: number | undefined,
    output: string | undefined,
  ): {
    title: string;
    details: string;
  } {
    const trimmedCommand = command.trim();
    const firstWord = trimmedCommand.split(/\s+/)[0];

    // Common error patterns and their explanations
    const errorPatterns = [
      {
        pattern: /cannot remove.*No such file or directory/,
        title: 'File Not Found',
        getMessage: () => {
          const fileMatch = output?.match(/'([^']+)'/);
          const fileName = fileMatch ? fileMatch[1] : 'file';

          return `The file '${fileName}' does not exist and cannot be removed.\n\nSuggestion: Use 'ls' to check what files exist, or use 'rm -f' to ignore missing files.`;
        },
      },
      {
        pattern: /No such file or directory/,
        title: 'File or Directory Not Found',
        getMessage: () => {
          if (trimmedCommand.startsWith('cd ')) {
            const dirMatch = trimmedCommand.match(/cd\s+(.+)/);
            const dirName = dirMatch ? dirMatch[1] : 'directory';

            return `The directory '${dirName}' does not exist.\n\nSuggestion: Use 'mkdir -p ${dirName}' to create it first, or check available directories with 'ls'.`;
          }

          return `The specified file or directory does not exist.\n\nSuggestion: Check the path and use 'ls' to see available files.`;
        },
      },
      {
        pattern: /Permission denied/,
        title: 'Permission Denied',
        getMessage: () =>
          `Permission denied for '${firstWord}'.\n\nSuggestion: The file may not be executable. Try 'chmod +x filename' first.`,
      },
      {
        pattern: /command not found/,
        title: 'Command Not Found',
        getMessage: () =>
          `The command '${firstWord}' is not available in WebContainer.\n\nSuggestion: Check available commands or use a package manager to install it.`,
      },
      {
        pattern: /Is a directory/,
        title: 'Target is a Directory',
        getMessage: () =>
          `Cannot perform this operation - target is a directory.\n\nSuggestion: Use 'ls' to list directory contents or add appropriate flags.`,
      },
      {
        pattern: /File exists/,
        title: 'File Already Exists',
        getMessage: () => `File already exists.\n\nSuggestion: Use a different name or add '-f' flag to overwrite.`,
      },
    ];

    // Try to match known error patterns
    for (const errorPattern of errorPatterns) {
      if (output && errorPattern.pattern.test(output)) {
        return {
          title: errorPattern.title,
          details: errorPattern.getMessage(),
        };
      }
    }

    // Generic error with suggestions based on command type
    let suggestion = '';

    if (trimmedCommand.startsWith('npm ')) {
      suggestion = '\n\nSuggestion: Try running "npm install" first or check package.json.';
    } else if (trimmedCommand.startsWith('git ')) {
      suggestion = "\n\nSuggestion: Check if you're in a git repository or if remote is configured.";
    } else if (trimmedCommand.match(/^(ls|cat|rm|cp|mv)/)) {
      suggestion = '\n\nSuggestion: Check file paths and use "ls" to see available files.';
    }

    return {
      title: `Command Failed (exit code: ${exitCode})`,
      details: `Command: ${trimmedCommand}\n\nOutput: ${output || 'No output available'}${suggestion}`,
    };
  }
}
