// Next.js route for functions/api/usage.ts (Pages Functions handler, see lib/pages-compat.ts)
import { toNextRoute } from '@/lib/pages-compat'
import * as handlers from '@/functions/api/usage'

export const { OPTIONS, GET } = toNextRoute(handlers)
