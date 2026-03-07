import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://chatbot:chatbot_dev@localhost:5432/chatbot',
  },
});
