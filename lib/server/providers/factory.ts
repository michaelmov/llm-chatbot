import { config } from '../config';
import { AnthropicProvider } from './anthropic';
import type { LLMProvider } from './types';

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
