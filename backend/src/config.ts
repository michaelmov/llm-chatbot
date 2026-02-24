import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  model: {
    name: process.env.MODEL_NAME || 'claude-3-5-sonnet-latest',
    temperature: parseFloat(process.env.MODEL_TEMPERATURE || '0.3'),
    maxTokens: parseInt(process.env.MODEL_MAX_TOKENS || '4096', 10),
  },
  provider: process.env.LLM_PROVIDER || 'anthropic',
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },
  weather: {
    apiKey: process.env.WEATHER_API_KEY || '',
    baseUrl: 'https://api.weatherapi.com/v1',
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://chatbot:chatbot_dev@localhost:5432/chatbot',
    ssl: process.env.DATABASE_SSL === 'true',
  },
  auth: {
    secret: process.env.BETTER_AUTH_SECRET || '',
  },
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  cookieSecure:
    process.env.COOKIE_SECURE !== undefined ? process.env.COOKIE_SECURE === 'true' : true,
  validation: {
    maxPayloadSize: 50000,
  },
} as const;

export type Config = typeof config;
