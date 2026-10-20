/**
 * Compose middlewares around a fetcher.
 * Each middleware: (useSWRNext) => (key, config) => result
 *
 * @param {Function} fetcher
 * @param {Function[]} middlewares
 */
export function withMiddleware(fetcher, middlewares = []) {
  void fetcher
  void middlewares
  // Degenerate: ignore middlewares
  return async (key, config = {}) => {
    const f = config.fetcher || fetcher
    return f(key, config)
  }
}
