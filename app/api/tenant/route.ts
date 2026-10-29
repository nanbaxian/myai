// Next.js route for functions/api/tenant.ts (Pages Functions handler, see lib/pages-compat.ts)
import { toNextRoute } from '@/lib/pages-compat'
import * as handlers from '@/functions/api/tenant'

export const { OPTIONS, GET, PATCH } = toNextRoute(handlers)
