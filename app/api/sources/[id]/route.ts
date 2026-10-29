// Next.js route for functions/api/sources/[id].ts (Pages Functions handler, see lib/pages-compat.ts)
import { toNextRoute } from '@/lib/pages-compat'
import * as handlers from '@/functions/api/sources/[id]'

export const { OPTIONS, GET, PATCH, DELETE } = toNextRoute(handlers)
