import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import { Pool } from 'pg'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

// Configuration conditionnelle selon l'environnement
let db: ReturnType<typeof drizzlePg> | ReturnType<typeof drizzleNeon>

if (process.env.NODE_ENV === 'production') {
  // Production : Utilise Neon via HTTP
  console.log('🚀 Using Neon database connection (Production)')
  const sql = neon(process.env.DATABASE_URL!)
  db = drizzleNeon({ client: sql, schema })
} else {
  // Développement : Utilise node-postgres
  console.log('🐳 Using PostgreSQL connection (Development)')
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })
  db = drizzlePg(pool, { schema })
}

export { db }
export * from './schema'
