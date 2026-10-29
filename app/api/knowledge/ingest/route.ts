// Next.js route for functions/api/knowledge/ingest.ts (Pages Functions handler, see lib/pages-compat.ts)
import { toNextRoute } from '@/lib/pages-compat'
import * as handlers from '@/functions/api/knowledge/ingest'

export const { OPTIONS, POST } = toNextRoute(handlers)
