import { config } from '../config.js';
import { AnthropicProvider } from './anthropic.js';
import type { LLMProvider } from './types.js';

export function createProvider(providerName?: string): LLMProvider {
  const name = providerName || config.provider;

  switch (name) {
    case 'anthropic':
      return new AnthropicProvider({
        modelName: config.model.name,
        temperature: config.model.temperature,
        maxTokens: config.model.maxTokens,
        apiKey: config.anthropic.apiKey,
      });
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}
