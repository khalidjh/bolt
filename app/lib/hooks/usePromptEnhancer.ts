import { useState } from 'react';
import type { ProviderInfo } from '~/types/model';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('usePromptEnhancement');

export function usePromptEnhancer() {
  const [enhancingPrompt, setEnhancingPrompt] = useState(false);
  const [promptEnhanced, setPromptEnhanced] = useState(false);

  const resetEnhancer = () => {
    setEnhancingPrompt(false);
    setPromptEnhanced(false);
  };

  const enhancePrompt = async (
    input: string,
    setInput: (value: string) => void,
    model: string,
    provider: ProviderInfo,
    apiKeys?: Record<string, string>,
  ) => {
    setEnhancingPrompt(true);
    setPromptEnhanced(false);

    const requestBody: any = {
      message: input,
      model,
      provider,
    };

    if (apiKeys) {
      requestBody.apiKeys = apiKeys;
    }

    const originalInput = input;
    let _input = '';

    try {
      const response = await fetch('/api/enhancer', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Prompt enhancement failed: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error('Prompt enhancer returned an empty response body');
      }

      const decoder = new TextDecoder();

      // Clear the field only once we know we have a stream to fill it with.
      setInput('');

      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        _input += decoder.decode(value, { stream: true });

        logger.trace('Set input', _input);

        setInput(_input);
      }

      // Flush any remaining bytes from the decoder.
      _input += decoder.decode();
      setInput(_input);
      setPromptEnhanced(true);
    } catch (error) {
      logger.error(error);

      // Restore whatever the user originally typed so a failed enhance never eats their prompt.
      setInput(originalInput);
    } finally {
      // Always release the spinner, regardless of how we got here.
      setEnhancingPrompt(false);
    }
  };

  return { enhancingPrompt, promptEnhanced, enhancePrompt, resetEnhancer };
}
