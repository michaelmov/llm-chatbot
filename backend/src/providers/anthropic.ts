import { ChatAnthropic } from "@langchain/anthropic";
import { createAgent } from "langchain";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  BaseMessage,
} from "@langchain/core/messages";
import type {
  ChatMessage,
  LLMProvider,
  ProviderConfig,
  StreamCallbacks,
} from "./types.js";
import { tools } from "../tools/index.js";

export class AnthropicProvider implements LLMProvider {
  public readonly name = "anthropic";
  private model: ChatAnthropic;
  private agent: ReturnType<typeof createAgent>;

  constructor(config: ProviderConfig) {
    this.model = new ChatAnthropic({
      modelName: config.modelName,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      anthropicApiKey: config.apiKey,
      streaming: true,
    });

    this.agent = createAgent({
      model: this.model,
      tools,
    });
  }

  private convertMessages(messages: ChatMessage[]): BaseMessage[] {
    return messages.map((msg) => {
      switch (msg.role) {
        case "system":
          return new SystemMessage(msg.content);
        case "user":
          return new HumanMessage(msg.content);
        case "assistant":
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
    let fullText = "";

    try {
      const stream = await this.agent.stream(
        { messages: langchainMessages },
        { streamMode: "messages", signal: abortSignal }
      );

      for await (const [token, metadata] of stream) {
        if (abortSignal?.aborted) {
          break;
        }

        // Only stream AI messages, not tool messages
        if (token.type !== "ai") {
          continue;
        }

        // Extract text content from the token
        if (typeof token.content === "string" && token.content) {
          fullText += token.content;
          callbacks.onToken(token.content);
        } else if (Array.isArray(token.content)) {
          // Handle content blocks (e.g., from Anthropic)
          for (const block of token.content) {
            if (block.type === "text" && block.text) {
              fullText += block.text;
              callbacks.onToken(block.text);
            }
          }
        }
      }

      if (!abortSignal?.aborted) {
        callbacks.onComplete(fullText);
      }
    } catch (error) {
      if (abortSignal?.aborted) {
        return;
      }
      callbacks.onError(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}
