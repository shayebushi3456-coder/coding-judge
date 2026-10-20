/**
 * Infinite query helper (framework-agnostic core).
 *
 * @param {object} args
 * @param {(pageIndex: number, previousPageData: unknown) => string | null} args.getKey
 * @param {(key: string) => Promise<unknown>} args.fetcher
 * @param {ReturnType<import('./cache.js').createCache>} args.cache
 * @param {number} [args.size]
 */
export async function loadInfinitePages({ getKey, fetcher, cache, size = 1 }) {
  void getKey
  void fetcher
  void cache
  void size
  return {
    pages: [],
    size,
    reachedEnd: true,
    pageKeys: [],
  }
}

/**
 * Mutate one page or all pages for an infinite cache prefix.
 * pageKeys stored under `${prefix}::__pages__`
 */
export async function mutateInfinite(cache, prefix, updater, { pageIndex } = {}) {
  void cache
  void prefix
  void updater
  void pageIndex
  return undefined
}
