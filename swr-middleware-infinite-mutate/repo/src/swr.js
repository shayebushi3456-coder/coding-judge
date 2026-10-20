import { withMiddleware } from './middleware.js'

/**
 * Simple one-shot SWR fetch with cache + optional middlewares.
 */
export async function swrFetch(cache, key, fetcher, { middlewares = [], ...config } = {}) {
  const run = withMiddleware(fetcher, middlewares)
  const data = await run(key, { ...config, fetcher, cache })
  cache.set(key, { data, error: undefined, isValidating: false })
  return data
}
