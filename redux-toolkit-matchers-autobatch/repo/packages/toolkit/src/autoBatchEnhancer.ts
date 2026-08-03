import type { StoreEnhancer } from 'redux'

export const SHOULD_AUTOBATCH = 'RTK_autoBatch'

export const prepareAutoBatched =
  <T>() =>
  (payload: T): { payload: T; meta: unknown } => ({
    payload,
    meta: {},
  })

export type AutoBatchOptions =
  | { type: 'tick' }
  | { type: 'timer'; timeout: number }
  | { type: 'raf' }
  | { type: 'callback'; queueNotification: (notify: () => void) => void }

/**
 * Store enhancer used when configuring default enhancers.
 */
export const autoBatchEnhancer =
  (_options: AutoBatchOptions = { type: 'raf' }): StoreEnhancer =>
  (next) =>
  (...args) => {
    return next(...args)
  }
