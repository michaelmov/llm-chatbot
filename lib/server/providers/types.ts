export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
  onToolCall?: (toolName: string, args: Record<string, unknown>) => void;
  onToolResult?: (toolName: string, result: string) => void;
}

export interface LLMProvider {
  name: string;
  stream(
    messages: ChatMessage[],
    callbacks: StreamCallbacks,
    abortSignal?: AbortSignal
  ): Promise<void>;
}

export interface ProviderConfig {
  modelName: string;
  temperature: number;
  maxTokens: number;
  apiKey: string;
}
