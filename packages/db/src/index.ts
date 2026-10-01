export * from './schema/auth';
export * from './schema/medical';
export * from './schema/account';
export * from './schema/counseling';
export * from './schema/therapy';
export * from './schema/assessments';
export * from './schema/wellness';
export * from './schema/emergency';
export * from './schema/community';
export * from './schema/privacy';
export * from './schema/consultations';
export * from 'drizzle-orm';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as authSchema from './schema/auth';
import * as medicalSchema from './schema/medical';
import * as accountSchema from './schema/account';
import * as counselingSchema from './schema/counseling';
import * as therapySchema from './schema/therapy';
import * as assessmentsSchema from './schema/assessments';
import * as wellnessSchema from './schema/wellness';
import * as emergencySchema from './schema/emergency';
import * as communitySchema from './schema/community';
import * as privacySchema from './schema/privacy';
import * as consultationsSchema from './schema/consultations';
import * as dotenv from 'dotenv';
import path from 'path';

// Note: In a monorepo, loading .env in the DB package directly is usually for scripts like seeding
dotenv.config({ path: path.resolve(__dirname, '../../../apps/web/.env.local') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5455/healer_db';

const client = postgres(connectionString);
export const db = drizzle(client, {
  schema: {
    ...authSchema,
    ...medicalSchema,
    ...accountSchema,
    ...counselingSchema,
    ...therapySchema,
    ...assessmentsSchema,
    ...wellnessSchema,
    ...emergencySchema,
    ...communitySchema,
    ...privacySchema,
    ...consultationsSchema,
  },
});
