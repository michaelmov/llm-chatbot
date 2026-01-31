import { config } from '../config.js';
import type { ChatMessage } from '../providers/types.js';

export interface ChatRequest {
  type: 'chat';
  requestId: string;
  messages: ChatMessage[];
}

export interface CancelRequest {
  type: 'cancel';
  requestId: string;
}

export interface PingRequest {
  type: 'ping';
}

export type ClientMessage = ChatRequest | CancelRequest | PingRequest;

export interface ValidationResult {
  valid: boolean;
  message?: ClientMessage;
  error?: string;
}

const validRoles = ['user', 'assistant', 'system'] as const;

function isValidRole(role: string): role is ChatMessage['role'] {
  return validRoles.includes(role as ChatMessage['role']);
}

export function validateMessage(data: string): ValidationResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(data);
  } catch {
    return { valid: false, error: 'Invalid JSON' };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { valid: false, error: 'Message must be an object' };
  }

  const msg = parsed as Record<string, unknown>;

  if (typeof msg.type !== 'string') {
    return { valid: false, error: 'Missing or invalid type field' };
  }

  switch (msg.type) {
    case 'ping':
      return { valid: true, message: { type: 'ping' } };

    case 'cancel':
      if (typeof msg.requestId !== 'string') {
        return { valid: false, error: 'Missing or invalid requestId' };
      }
      return {
        valid: true,
        message: { type: 'cancel', requestId: msg.requestId },
      };

    case 'chat':
      if (typeof msg.requestId !== 'string') {
        return { valid: false, error: 'Missing or invalid requestId' };
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
        message: {
          type: 'chat',
          requestId: msg.requestId,
          messages: msg.messages as ChatMessage[],
        },
      };

    default:
      return { valid: false, error: `Unknown message type: ${msg.type}` };
  }
}
