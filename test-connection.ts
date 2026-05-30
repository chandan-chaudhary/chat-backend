import 'dotenv/config';
import { Client } from 'pg';

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  const result = await client.query('select now() as now');
  console.log('DB connection OK. Server time:', result.rows[0]?.now);
  await client.end();
}

main().catch(error => {
  console.error('DB connection failed:', error.message);
  process.exit(1);
});
