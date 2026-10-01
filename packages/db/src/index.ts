export * from './schema/auth';
export * from './schema/medical';
export * from './schema/doctor';
export * from 'drizzle-orm';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as authSchema from './schema/auth';
import * as medicalSchema from './schema/medical';
import * as doctorSchema from './schema/doctor';
import * as dotenv from 'dotenv';
import path from 'path';

// Note: In a monorepo, loading .env in the DB package directly is usually for scripts like seeding
dotenv.config({ path: path.resolve(__dirname, '../../../apps/web/.env.local') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5455/healer_db';

const client = postgres(connectionString);
export const db = drizzle(client, { schema: { ...authSchema, ...medicalSchema, ...doctorSchema } });

