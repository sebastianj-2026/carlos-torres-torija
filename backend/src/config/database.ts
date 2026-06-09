import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Strict en prod; lax en dev para self-signed certs
  ssl: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
  // Neon serverless pooler recycles connections aggressively;
  // keep pool small and timeouts short to avoid stale-connection crashes.
  max: 5,
  idleTimeoutMillis:      20_000,
  connectionTimeoutMillis: 10_000,
});

// Without this handler, any error on an idle client becomes an uncaught
// exception and crashes Node. Neon's PgBouncer can terminate idle
// connections at any time, so this is required.
pool.on('error', (err) => {
  console.error('[pg pool] idle client error — conexión descartada por Neon:', err.message);
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err.message);
    return;
  }
  console.log('Conexión a la base de datos establecida correctamente ✅');
  release();
});

export default pool;
