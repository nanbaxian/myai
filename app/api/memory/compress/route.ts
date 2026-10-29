// Next.js route for functions/api/memory/compress.ts (Pages Functions handler, see lib/pages-compat.ts)
import { toNextRoute } from '@/lib/pages-compat'
import * as handlers from '@/functions/api/memory/compress'

export const { OPTIONS, POST } = toNextRoute(handlers)
