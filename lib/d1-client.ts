// lib/d1-client.ts
// Cloudflare D1 Database client

export interface D1Database {
  prepare(query: string): D1PreparedStatement
}

export interface D1PreparedStatement {
  bind(...args: unknown[]): D1PreparedStatement
  first(): Promise<Record<string, unknown> | null>
  all(): Promise<{ results: Record<string, unknown>[] }>
  run(): Promise<D1Result>
}

export interface D1Result {
  success: boolean
  meta: {
    duration: number
    last_row_id?: number
    changes?: number
    served_by?: string
    internal_stats?: string
  }
}

// Type for Worker environment with D1 binding
export interface D1Env {
  DB: D1Database
  CLERK_SECRET_KEY: string
}

// Helper functions for common operations

export async function queryOne<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  bindings?: unknown[]
): Promise<T | null> {
  let query = db.prepare(sql)
  if (bindings?.length) {
    query = query.bind(...bindings)
  }
  return (await query.first()) as T | null
}

export async function queryAll<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  bindings?: unknown[]
): Promise<T[]> {
  let query = db.prepare(sql)
  if (bindings?.length) {
    query = query.bind(...bindings)
  }
  const result = await query.all()
  return (result.results || []) as T[]
}

export async function execute(
  db: D1Database,
  sql: string,
  bindings?: unknown[]
): Promise<D1Result> {
  let query = db.prepare(sql)
  if (bindings?.length) {
    query = query.bind(...bindings)
  }
  return query.run()
}

// Common queries

export async function getPersonaById(
  db: D1Database,
  personaId: string
): Promise<Record<string, unknown> | null> {
  return queryOne(db, 'SELECT * FROM personas WHERE id = ?', [personaId])
}

export async function getActivePersona(db: D1Database): Promise<Record<string, unknown> | null> {
  return queryOne(
    db,
    `SELECT p.* FROM personas p
     WHERE p.is_active = 1
     ORDER BY p.created_at DESC
     LIMIT 1`
  )
}

export async function setActivePersona(db: D1Database, personaId: string): Promise<boolean> {
  // Deactivate all personas
  await execute(db, 'UPDATE personas SET is_active = 0')

  // Activate the specified persona
  const result = await execute(db, 'UPDATE personas SET is_active = 1 WHERE id = ?', [personaId])

  return result.success
}

export async function createPersona(
  db: D1Database,
  data: { id: string; name: string; description?: string; metadata?: string }
): Promise<Record<string, unknown> | null> {
  const result = await execute(
    db,
    `INSERT INTO personas (id, name, description, metadata, created_at, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [data.id, data.name, data.description || null, data.metadata || null]
  )

  if (!result.success) return null

  return getPersonaById(db, data.id)
}

export async function getUserPersonas(
  db: D1Database,
  userId: string
): Promise<Record<string, unknown>[]> {
  return queryAll(
    db,
    `SELECT p.* FROM personas p
     WHERE p.user_id = ?
     ORDER BY p.created_at DESC`,
    [userId]
  )
}
