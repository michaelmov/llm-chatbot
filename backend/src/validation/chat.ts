import { config } from '../config.js';
import type { ChatMessage } from '../providers/types.js';

export interface ChatRequestBody {
  requestId: string;
  conversationId?: string;
  messages: ChatMessage[];
}

export interface ChatValidationResult {
  valid: boolean;
  data?: ChatRequestBody;
  error?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const validRoles = ['user', 'assistant', 'system'] as const;

function isValidRole(role: string): role is ChatMessage['role'] {
  return validRoles.includes(role as ChatMessage['role']);
}

export function validateChatRequest(body: unknown): ChatValidationResult {
  if (typeof body !== 'object' || body === null) {
    return { valid: false, error: 'Request body must be an object' };
  }

  const msg = body as Record<string, unknown>;

  if (typeof msg.requestId !== 'string') {
    return { valid: false, error: 'Missing or invalid requestId' };
  }

  if (msg.conversationId !== undefined) {
    if (typeof msg.conversationId !== 'string' || !UUID_RE.test(msg.conversationId)) {
      return { valid: false, error: 'Invalid conversationId format' };
    }
  }

  if (!Array.isArray(msg.messages)) {
    return { valid: false, error: 'Messages must be an array' };
  }

  let totalLength = 0;

  for (const m of msg.messages) {
    if (typeof m !== 'object' || m === null) {
      return { valid: false, error: 'Each message must be an object' };
    }
    const message = m as Record<string, unknown>;
    if (typeof message.role !== 'string' || !isValidRole(message.role)) {
      return { valid: false, error: `Invalid role: ${message.role}` };
    }
    if (typeof message.content !== 'string') {
      return { valid: false, error: 'Message content must be a string' };
    }
    totalLength += message.content.length;
  }

  if (totalLength > config.validation.maxPayloadSize) {
    return {
      valid: false,
      error: `Payload too large: ${totalLength} chars exceeds ${config.validation.maxPayloadSize} limit`,
    };
  }

  return {
    valid: true,
    data: {
      requestId: msg.requestId,
      conversationId: msg.conversationId as string | undefined,
      messages: msg.messages as ChatMessage[],
    },
  };
}
