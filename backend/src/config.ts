import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  model: {
    name: process.env.MODEL_NAME || 'claude-3-5-sonnet-latest',
    temperature: parseFloat(process.env.MODEL_TEMPERATURE || '0.3'),
    maxTokens: parseInt(process.env.MODEL_MAX_TOKENS || '4096', 10),
  },
  provider: process.env.LLM_PROVIDER || 'anthropic',
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },
  validation: {
    maxPayloadSize: 50000,
  },
} as const;

export type Config = typeof config;
