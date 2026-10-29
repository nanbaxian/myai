// lib/pages-compat.ts
// Lets the Pages-style handlers in functions/ run as Next.js route handlers on
// Cloudflare (OpenNext). Each handler keeps its onRequest<Method> export and
// receives the same { request, env, params, waitUntil, data } context it had on Pages.

import { getCloudflareContext } from '@opennextjs/cloudflare'

type RouteParams = Promise<Record<string, string | string[]>>

type PagesContext = {
  request: Request
  env: unknown
  params: Record<string, string | string[]>
  waitUntil: (promise: Promise<unknown>) => void
  data: Record<string, unknown>
}

type PagesHandler = (ctx: PagesContext) => Response | Promise<Response>

const METHOD_PREFIX = 'onRequest'

export function toNextRoute(mod: Record<string, unknown>) {
  const routes: Record<string, (request: Request, route: { params: RouteParams }) => Promise<Response>> = {}

  for (const [name, handler] of Object.entries(mod)) {
    if (!name.startsWith(METHOD_PREFIX) || typeof handler !== 'function') continue
    const method = name.slice(METHOD_PREFIX.length).toUpperCase()
    const pagesHandler = handler as PagesHandler

    routes[method] = async (request, route) => {
      const { env, ctx } = await getCloudflareContext({ async: true })
      return pagesHandler({
        request,
        env,
        params: (await route?.params) ?? {},
        waitUntil: promise => ctx.waitUntil(promise),
        data: {},
      })
    }
  }

  return routes
}
