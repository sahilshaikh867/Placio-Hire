import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded regardless of current working directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Client } = pg;

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('Error: No DATABASE_URL found in .env. Please configure your PostgreSQL connection string.');
    process.exit(1);
  }

  console.log('Connecting to PostgreSQL database...');
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000
  });

  try {
    await client.connect();
    console.log('Connected successfully. Reading supabase_schema.sql...');
    const schemaPath = path.resolve(__dirname, '../supabase_schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Executing PostgreSQL schema migration (tables, RLS policies, triggers, seed data)...');
    await client.query(sql);
    console.log('Migration successfully applied and verified!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { run };
