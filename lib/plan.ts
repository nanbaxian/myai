// lib/plan.ts
// Fetch user plan (free/pro) from the D1 user_plans table.
import { dbFirst, type D1Env } from './knowledgeos-d1'

type UserPlan = 'free' | 'pro'

export async function getUserPlan(env: D1Env, userId: string): Promise<UserPlan> {
  try {
    const row = await dbFirst<{ plan: string }>(env, `SELECT plan FROM user_plans WHERE user_id = ? LIMIT 1`, [userId])
    const plan = (row?.plan || 'free').toLowerCase()
    return plan === 'pro' ? 'pro' : 'free'
  } catch {
    // Fail-closed
    return 'free'
  }
}
