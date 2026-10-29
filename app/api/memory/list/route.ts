// Next.js route for functions/api/memory/list.ts (Pages Functions handler, see lib/pages-compat.ts)
import { toNextRoute } from '@/lib/pages-compat'
import * as handlers from '@/functions/api/memory/list'

export const { OPTIONS, GET } = toNextRoute(handlers)
