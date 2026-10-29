// Next.js route for functions/api/personas/active.ts (Pages Functions handler, see lib/pages-compat.ts)
import { toNextRoute } from '@/lib/pages-compat'
import * as handlers from '@/functions/api/personas/active'

export const { OPTIONS, GET, PUT } = toNextRoute(handlers)
