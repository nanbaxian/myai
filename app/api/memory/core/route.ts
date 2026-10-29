// Next.js route for functions/api/memory/core.ts (Pages Functions handler, see lib/pages-compat.ts)
import { toNextRoute } from '@/lib/pages-compat'
import * as handlers from '@/functions/api/memory/core'

export const { OPTIONS, GET, DELETE } = toNextRoute(handlers)
