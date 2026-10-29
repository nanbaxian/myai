// Next.js route for functions/api/persona.ts (Pages Functions handler, see lib/pages-compat.ts)
import { toNextRoute } from '@/lib/pages-compat'
import * as handlers from '@/functions/api/persona'

export const { OPTIONS, GET, PUT } = toNextRoute(handlers)
