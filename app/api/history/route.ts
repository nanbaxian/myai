// Next.js route for functions/api/history/index.ts (Pages Functions handler, see lib/pages-compat.ts)
import { toNextRoute } from '@/lib/pages-compat'
import * as handlers from '@/functions/api/history/index'

export const { OPTIONS, GET, POST } = toNextRoute(handlers)
