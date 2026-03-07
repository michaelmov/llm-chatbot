import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '../config';
import * as schema from './schema';

const client = postgres(config.database.url, {
  ssl: config.database.ssl ? 'require' : false,
});

export const db = drizzle(client, { schema });
