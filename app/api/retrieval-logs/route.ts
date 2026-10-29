// Next.js route for functions/api/retrieval-logs.ts (Pages Functions handler, see lib/pages-compat.ts)
import { toNextRoute } from '@/lib/pages-compat'
import * as handlers from '@/functions/api/retrieval-logs'

export const { OPTIONS, GET } = toNextRoute(handlers)
