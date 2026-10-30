// app/dashboard/layout.tsx
// Only tenant admins may open the dashboard. Clerk middleware handles sign-in; this checks the role.

import { auth } from '@clerk/nextjs/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { redirect } from 'next/navigation'
import { dbFirst, type D1Env } from '@/lib/knowledgeos-d1'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/auth/login')

  const { env } = await getCloudflareContext({ async: true })
  const admin = await dbFirst<{ user_id: string }>(
    env as unknown as D1Env,
    `SELECT user_id FROM tenant_members WHERE user_id = ? AND role = 'admin' LIMIT 1`,
    [userId],
  )
  if (!admin) redirect('/chat')

  return children
}
