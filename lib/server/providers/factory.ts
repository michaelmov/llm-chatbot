import { config } from '../config';
import { AnthropicProvider } from './anthropic';
import type { LLMProvider } from './types';

export function createProvider(apiKey: string): LLMProvider {
  const name = config.provider;

  switch (name) {
    case 'anthropic':
      return new AnthropicProvider({
        modelName: config.model.name,
        temperature: config.model.temperature,
        maxTokens: config.model.maxTokens,
        apiKey,
      });
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}
