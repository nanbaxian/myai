// Next.js route for functions/api/memory/snapshots.ts (Pages Functions handler, see lib/pages-compat.ts)
import { toNextRoute } from '@/lib/pages-compat'
import * as handlers from '@/functions/api/memory/snapshots'

export const { OPTIONS, GET, DELETE } = toNextRoute(handlers)
