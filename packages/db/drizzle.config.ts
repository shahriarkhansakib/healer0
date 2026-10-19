import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../apps/web/.env.local') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5455/healer_db';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/*',
  out: './drizzle',
  dbCredentials: {
    url: connectionString,
  },
});
