// Next.js route for functions/api/conversations.ts (Pages Functions handler, see lib/pages-compat.ts)
import { toNextRoute } from '@/lib/pages-compat'
import * as handlers from '@/functions/api/conversations'

export const { OPTIONS, GET, POST } = toNextRoute(handlers)
