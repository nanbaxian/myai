// Next.js route for functions/api/bots.ts (Pages Functions handler, see lib/pages-compat.ts)
import { toNextRoute } from '@/lib/pages-compat'
import * as handlers from '@/functions/api/bots'

export const { OPTIONS, GET, POST } = toNextRoute(handlers)
