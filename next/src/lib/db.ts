import postgres from 'postgres'

// Single pooled connection to the same Supabase Postgres the .NET app migrated. Discrete env vars
// avoid URL-encoding the password (it contains special characters). prepare:false keeps it safe
// behind Supabase's transaction pooler.
declare global {
  // eslint-disable-next-line no-var
  var _sql: ReturnType<typeof postgres> | undefined
}

const sql =
  global._sql ??
  postgres({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: 'require',
    prepare: false,
    max: 5,
  })

if (process.env.NODE_ENV !== 'production') global._sql = sql

export default sql
