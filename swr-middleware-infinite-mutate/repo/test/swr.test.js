import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  createCache,
  withMiddleware,
  mutate,
  loadInfinitePages,
  mutateInfinite,
  swrFetch,
} from '../src/index.js'

describe('basic swrFetch', () => {
  it('caches fetcher result', async () => {
    const cache = createCache()
    const data = await swrFetch(cache, '/a', async () => ({ ok: 1 }))
    assert.deepEqual(data, { ok: 1 })
    assert.deepEqual(cache.get('/a').data, { ok: 1 })
  })
})

describe('middleware', () => {
  it('runs middlewares in order and can rewrite key', async () => {
    const calls = []
    const mw1 = (next) => async (key, config) => {
      calls.push('mw1-in')
      const r = await next(key + ':1', config)
      calls.push('mw1-out')
      return r
    }
    const mw2 = (next) => async (key, config) => {
      calls.push('mw2-in:' + key)
      const r = await next(key, config)
      calls.push('mw2-out')
      return { ...r, tagged: true }
    }
    const run = withMiddleware(async (key) => ({ key }), [mw1, mw2])
    const r = await run('/x', {})
    assert.deepEqual(r, { key: '/x:1', tagged: true })
    assert.deepEqual(calls, ['mw1-in', 'mw2-in:/x:1', 'mw2-out', 'mw1-out'])
  })

  it('allows short-circuit without calling fetcher', async () => {
    let fetched = false
    const short = () => async () => ({ cached: true })
    const run = withMiddleware(async () => {
      fetched = true
      return { no: 1 }
    }, [short])
    const r = await run('/z', {})
    assert.deepEqual(r, { cached: true })
    assert.equal(fetched, false)
  })

  it('middleware can read/write cache', async () => {
    const cache = createCache()
    cache.set('/hit', { data: { v: 9 } })
    const useCache = (next) => async (key, config) => {
      const hit = config.cache.get(key)
      if (hit?.data) return hit.data
      return next(key, config)
    }
    const data = await swrFetch(cache, '/hit', async () => ({ v: 0 }), {
      middlewares: [useCache],
    })
    assert.deepEqual(data, { v: 9 })
  })
})

describe('mutate', () => {
  let cache
  beforeEach(() => {
    cache = createCache()
  })

  it('updates by exact key', async () => {
    cache.set('/u', { data: 1 })
    await mutate(cache, '/u', 2)
    assert.equal(cache.get('/u').data, 2)
  })

  it('supports optimistic update with rollback on error', async () => {
    cache.set('/u', { data: 1 })
    await assert.rejects(async () => {
      await mutate(
        cache,
        '/u',
        async () => {
          throw new Error('fail')
        },
        { optimisticData: 99, rollbackOnError: true },
      )
    })
    assert.equal(cache.get('/u').data, 1)
  })

  it('matcher updates multiple keys', async () => {
    cache.set('/a/1', { data: 1 })
    cache.set('/a/2', { data: 2 })
    cache.set('/b/1', { data: 3 })
    await mutate(cache, (k) => k.startsWith('/a/'), (cur) => cur + 10)
    assert.equal(cache.get('/a/1').data, 11)
    assert.equal(cache.get('/a/2').data, 12)
    assert.equal(cache.get('/b/1').data, 3)
  })
})

describe('infinite', () => {
  it('loads pages until getKey returns null', async () => {
    const cache = createCache()
    const pagesDb = [['a'], ['b'], ['c']]
    const r = await loadInfinitePages({
      cache,
      size: 10,
      getKey(i, prev) {
        if (i === 0) return '/p/0'
        if (!prev || prev.length === 0) return null
        if (i >= pagesDb.length) return null
        return `/p/${i}`
      },
      fetcher: async (key) => {
        const i = Number(key.split('/').pop())
        return pagesDb[i]
      },
    })
    assert.equal(r.pages.length, 3)
    assert.equal(r.reachedEnd, true)
    assert.deepEqual(r.pageKeys, ['/p/0', '/p/1', '/p/2'])
  })

  it('respects size limit', async () => {
    const cache = createCache()
    const r = await loadInfinitePages({
      cache,
      size: 2,
      getKey: (i) => `/p/${i}`,
      fetcher: async (key) => [key],
    })
    assert.equal(r.pages.length, 2)
    assert.equal(r.reachedEnd, false)
  })

  it('mutateInfinite can update a single page', async () => {
    const cache = createCache()
    const loaded = await loadInfinitePages({
      cache,
      size: 2,
      getKey: (i) => `/p/${i}`,
      fetcher: async (key) => [key],
    })
    const prefix = 'inf:demo'
    cache.set(`${prefix}::__pages__`, loaded.pageKeys)
    for (let i = 0; i < loaded.pageKeys.length; i++) {
      cache.set(loaded.pageKeys[i], { data: loaded.pages[i] })
    }
    await mutateInfinite(cache, prefix, () => ['patched'], { pageIndex: 1 })
    assert.deepEqual(cache.get('/p/1').data, ['patched'])
    assert.deepEqual(cache.get('/p/0').data, ['/p/0'])
  })
})
