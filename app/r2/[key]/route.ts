// Next.js route for functions/r2/[key].ts (Pages Functions handler, see lib/pages-compat.ts)
import { toNextRoute } from '@/lib/pages-compat'
import * as handlers from '@/functions/r2/[key]'

export const { GET } = toNextRoute(handlers)
