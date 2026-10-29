// Next.js route for functions/api/chat.ts (Pages Functions handler, see lib/pages-compat.ts)
import { toNextRoute } from '@/lib/pages-compat'
import * as handlers from '@/functions/api/chat'

export const { OPTIONS, POST } = toNextRoute(handlers)
