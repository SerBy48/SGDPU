import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
// El parser por defecto de node-postgres para columnas DATE (oid 1082)
// construye un Date usando el reloj LOCAL del proceso, lo que es ambiguo y
// depende de en qué huso horario corra el servidor. Se devuelve el string
// 'YYYY-MM-DD' tal cual para que el formateo de fecha sea explícito y
// determinista en quien lo consuma (ver reports.js).
pg.types.setTypeParser(1082, value => value);
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20
});

pool.on('error', (err) => console.error('PostgreSQL pool error', err));

export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
