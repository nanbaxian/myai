// Next.js route for functions/api/bots/[id].ts (Pages Functions handler, see lib/pages-compat.ts)
import { toNextRoute } from '@/lib/pages-compat'
import * as handlers from '@/functions/api/bots/[id]'

export const { OPTIONS, GET, PATCH, DELETE } = toNextRoute(handlers)
