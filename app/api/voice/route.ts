// Next.js route for functions/api/voice.ts (Pages Functions handler, see lib/pages-compat.ts)
import { toNextRoute } from '@/lib/pages-compat'
import * as handlers from '@/functions/api/voice'

export const { POST, GET, OPTIONS } = toNextRoute(handlers)
