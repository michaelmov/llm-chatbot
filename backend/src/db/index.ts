import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '../config.js';
import * as schema from './schema.js';

const client = postgres(config.database.url);

export const db = drizzle(client, { schema });

export async function closeDb(): Promise<void> {
  await client.end();
}
