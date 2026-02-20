// lib/plan.ts
// Fetch user plan (free/pro) from Supabase using Service Role key.

type UserPlan = 'free' | 'pro'

class SupabaseRest {
  constructor(private url: string, private key: string) {}

  async get<T>(path: string, query: Record<string, string> = {}): Promise<T> {
    const u = new URL(`${this.url}/rest/v1/${path}`)
    for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v)
    const res = await fetch(u.toString(), {
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${this.key}`,
      },
    })
    if (!res.ok) throw new Error(`Supabase REST error: ${res.status}`)
    return res.json() as Promise<T>
  }
}

export async function getUserPlan(env: any, userId: string): Promise<UserPlan> {
  try {
    const db = new SupabaseRest(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
    const rows = await db.get<Array<{ plan: string }>>('user_plans', {
      select: 'plan',
      user_id: `eq.${userId}`,
      limit: '1',
    })
    const plan = (rows?.[0]?.plan || 'free').toLowerCase()
    return plan === 'pro' ? 'pro' : 'free'
  } catch {
    // Fail-closed
    return 'free'
  }
}
