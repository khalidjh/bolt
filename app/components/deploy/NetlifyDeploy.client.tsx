import { toast } from 'react-toastify';
import { useStore } from '@nanostores/react';
import { netlifyConnection, netlifyOperatorDefault } from '~/lib/stores/netlify';
import { workbenchStore } from '~/lib/stores/workbench';
import { webcontainer } from '~/lib/webcontainer';
import { path } from '~/utils/path';
import { useState } from 'react';
import type { ActionCallbackData } from '~/lib/runtime/message-parser';
import { chatId } from '~/lib/persistence/useChatHistory';
import { formatBuildFailureOutput } from './deployUtils';

export function useNetlifyDeploy() {
  const [isDeploying, setIsDeploying] = useState(false);
  const netlifyConn = useStore(netlifyConnection);
  const operatorDefault = useStore(netlifyOperatorDefault);
  const currentChatId = useStore(chatId);

  // The client can deploy either with its own connected account or via the operator's server-side default.
  const canDeploy = !!netlifyConn.token || operatorDefault;

  const handleNetlifyDeploy = async () => {
    if (!canDeploy) {
      toast.error('Please connect to Netlify first in the settings tab!');
      return undefined;
    }

    if (!currentChatId) {
      toast.error('No active chat found');
      return undefined;
    }

    try {
      setIsDeploying(true);

      const artifact = workbenchStore.firstArtifact;

      if (!artifact) {
        throw new Error('No active project found');
      }

      // Create a deployment artifact for visual feedback
      const deploymentId = `deploy-artifact`;
      workbenchStore.addArtifact({
        id: deploymentId,
        messageId: deploymentId,
        title: 'Netlify Deployment',
        type: 'standalone',
      });

      const deployArtifact = workbenchStore.artifacts.get()[deploymentId];

      // Notify that build is starting
      deployArtifact.runner.handleDeployAction('building', 'running', { source: 'netlify' });

      // Set up build action
      const actionId = 'build-' + Date.now();
      const actionData: ActionCallbackData = {
        messageId: 'netlify build',
        artifactId: artifact.id,
        actionId,
        action: {
          type: 'build' as const,
          content: 'npm run build',
        },
      };

      // Add the action first
      artifact.runner.addAction(actionData);

      // Then run it
      await artifact.runner.runAction(actionData);

      const buildOutput = artifact.runner.buildOutput;

      if (!buildOutput || buildOutput.exitCode !== 0) {
        // Notify that build failed
        deployArtifact.runner.handleDeployAction('building', 'failed', {
          error: formatBuildFailureOutput(buildOutput?.output),
          source: 'netlify',
        });
        throw new Error('Build failed');
      }

      // Notify that build succeeded and deployment is starting
      deployArtifact.runner.handleDeployAction('deploying', 'running', { source: 'netlify' });

      // Get the build files
      const container = await webcontainer;

      // Remove /home/project from buildPath if it exists
      const buildPath = buildOutput.path.replace('/home/project', '');

      console.log('Original buildPath', buildPath);

      // Check if the build path exists
      let finalBuildPath = buildPath;

      // List of common output directories to check if the specified build path doesn't exist
      const commonOutputDirs = [buildPath, '/dist', '/build', '/out', '/output', '/.next', '/public'];

      // Verify the build path exists, or try to find an alternative
      let buildPathExists = false;

      for (const dir of commonOutputDirs) {
        try {
          await container.fs.readdir(dir);
          finalBuildPath = dir;
          buildPathExists = true;
          console.log(`Using build directory: ${finalBuildPath}`);
          break;
        } catch (error) {
          // Directory doesn't exist, try the next one
          console.log(`Directory ${dir} doesn't exist, trying next option. ${error}`);
          continue;
        }
      }

      if (!buildPathExists) {
        throw new Error('Could not find build output directory. Please check your build configuration.');
      }

      async function getAllFiles(dirPath: string): Promise<Record<string, string>> {
        const files: Record<string, string> = {};
        const entries = await container.fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);

          if (entry.isFile()) {
            const content = await container.fs.readFile(fullPath, 'utf-8');

            // Remove build path prefix from the path
            const deployPath = fullPath.replace(finalBuildPath, '');
            files[deployPath] = content;
          } else if (entry.isDirectory()) {
            const subFiles = await getAllFiles(fullPath);
            Object.assign(files, subFiles);
          }
        }

        return files;
      }

      const fileContents = await getAllFiles(finalBuildPath);

      // Use chatId instead of artifact.id
      const existingSiteId = localStorage.getItem(`netlify-site-${currentChatId}`);

      const response = await fetch('/api/netlify-deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteId: existingSiteId || undefined,
          files: fileContents,
          // Only send a token when the user connected their own account; otherwise the
          // server falls back to the operator's default token (which never reaches the browser).
          token: netlifyConn.token || undefined,
          chatId: currentChatId,
        }),
      });

      const data = (await response.json()) as any;

      if (!response.ok || !data.deploy || !data.site) {
        console.error('Invalid deploy response:', data);

        // Notify that deployment failed
        deployArtifact.runner.handleDeployAction('deploying', 'failed', {
          error: data.error || 'Invalid deployment response',
          source: 'netlify',
        });
        throw new Error(data.error || 'Invalid deployment response');
      }

      /*
       * The server route already polls Netlify until the deploy reaches the `ready` state and
       * returns the final URL, so no browser-side polling (which would need a token) is required.
       */
      if (!data.deploy.url) {
        deployArtifact.runner.handleDeployAction('deploying', 'failed', {
          error: 'Deployment did not return a URL',
          source: 'netlify',
        });
        throw new Error('Deployment did not return a URL');
      }

      // Store the site ID if it's a new site
      if (data.site) {
        localStorage.setItem(`netlify-site-${currentChatId}`, data.site.id);
      }

      // Notify that deployment completed successfully
      deployArtifact.runner.handleDeployAction('complete', 'complete', {
        url: data.deploy.url,
        source: 'netlify',
      });

      // Show success toast notification
      toast.success(`🚀 Netlify deployment completed successfully!`);

      // Return the live URL so callers (e.g. the Publish sheet) can show it directly instead of
      // re-deriving it from account stats — which aren't available for operator-default deploys.
      return data.deploy.url as string;
    } catch (error) {
      console.error('Deploy error:', error);
      toast.error(error instanceof Error ? error.message : 'Deployment failed');

      return undefined;
    } finally {
      setIsDeploying(false);
    }
  };

  return {
    isDeploying,
    handleNetlifyDeploy,
    isConnected: !!netlifyConn.user || operatorDefault,
  };
}
