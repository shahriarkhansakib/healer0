import { client } from './index';

async function main() {
  console.log('💥  Wiping database (dropping and recreating public schema)…');
  try {
    await client.unsafe(`
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO public;
    `);
    console.log('✨  Database wiped cleanly. Schema is fresh.');
  } catch (err) {
    console.error('❌  Failed to wipe database:', err);
    process.exit(1);
  } finally {
    await client.end();
    process.exit(0);
  }
}

main();
