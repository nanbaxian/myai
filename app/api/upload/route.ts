// Next.js route for functions/api/upload.ts (Pages Functions handler, see lib/pages-compat.ts)
import { toNextRoute } from '@/lib/pages-compat'
import * as handlers from '@/functions/api/upload'

export const { OPTIONS, POST } = toNextRoute(handlers)
