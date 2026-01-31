import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from '@langchain/core/messages';
import type { ChatMessage, LLMProvider, ProviderConfig, StreamCallbacks } from './types.js';

export class AnthropicProvider implements LLMProvider {
  public readonly name = 'anthropic';
  private model: ChatAnthropic;

  constructor(config: ProviderConfig) {
    this.model = new ChatAnthropic({
      modelName: config.modelName,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      anthropicApiKey: config.apiKey,
      streaming: true,
    });
  }

  private convertMessages(messages: ChatMessage[]): BaseMessage[] {
    return messages.map((msg) => {
      switch (msg.role) {
        case 'system':
          return new SystemMessage(msg.content);
        case 'user':
          return new HumanMessage(msg.content);
        case 'assistant':
          return new AIMessage(msg.content);
        default:
          throw new Error(`Unknown message role: ${msg.role}`);
      }
    });
  }

  async stream(
    messages: ChatMessage[],
    callbacks: StreamCallbacks,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const langchainMessages = this.convertMessages(messages);
    let fullText = '';

    try {
      const stream = await this.model.stream(langchainMessages, {
        signal: abortSignal,
      });

      for await (const chunk of stream) {
        if (abortSignal?.aborted) {
          break;
        }
        const token = typeof chunk.content === 'string' ? chunk.content : '';
        if (token) {
          fullText += token;
          callbacks.onToken(token);
        }
      }

      if (!abortSignal?.aborted) {
        callbacks.onComplete(fullText);
      }
    } catch (error) {
      if (abortSignal?.aborted) {
        return;
      }
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
