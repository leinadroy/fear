import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from './schema';
import { createPool } from './pool';
import { DATABASE_URL } from '$app/env/private';

if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

export const db = drizzle(createPool(DATABASE_URL), { schema, mode: 'default' });
