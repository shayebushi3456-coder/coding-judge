/** @type {Map<string, HotCtx>} */
const hotById = new Map()

/**
 * @typedef {{
 *   data: Record<string, unknown>,
 *   _dispose: Array<(data: Record<string, unknown>) => void>,
 *   _acceptSelf: boolean,
 *   _acceptDeps: Set<string>,
 *   _pruneCbs: Array<() => void>,
 *   _invalidated: boolean,
 *   accept: (...args: any[]) => void,
 *   dispose: (cb: (data: Record<string, unknown>) => void) => void,
 *   prune: (cb: () => void) => void,
 *   invalidate: () => void,
 * }} HotCtx
 */

export function createHotContext(id) {
  let ctx = hotById.get(id)
  if (ctx) return ctx

  ctx = {
    data: {},
    _dispose: [],
    _acceptSelf: false,
    _acceptDeps: new Set(),
    _pruneCbs: [],
    _invalidated: false,
    accept(...args) {
      void args
    },
    dispose(cb) {
      void cb
    },
    prune(cb) {
      void cb
    },
    invalidate() {},
  }
  hotById.set(id, ctx)
  return ctx
}

export function getHotContext(id) {
  return hotById.get(id)
}

export function resetHotRegistry() {
  hotById.clear()
}

export function runDispose(id) {
  const ctx = hotById.get(id)
  if (!ctx) return
  const data = { ...ctx.data }
  for (const cb of ctx._dispose.slice()) cb(data)
  ctx._dispose = []
}

export function runPrune(id) {
  const ctx = hotById.get(id)
  if (!ctx) return
  for (const cb of ctx._pruneCbs.slice()) cb()
  ctx._pruneCbs = []
}
