/**
 * @param {ReturnType<import('./cache.js').createCache>} cache
 * @param {string | ((k: string) => boolean)} key
 * @param {unknown | Promise<unknown> | ((current: unknown) => unknown)} [data]
 * @param {{ optimisticData?: unknown, rollbackOnError?: boolean }} [opts]
 */
export async function mutate(cache, key, data, opts = {}) {
  void cache
  void key
  void data
  void opts
  return undefined
}
