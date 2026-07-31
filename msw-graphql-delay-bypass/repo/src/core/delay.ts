export const SET_TIMEOUT_MAX_ALLOWED_INT = 2147483647
export const MIN_SERVER_RESPONSE_TIME = 100
export const MAX_SERVER_RESPONSE_TIME = 400
export const NODE_SERVER_RESPONSE_TIME = 5

export type DelayMode = 'real' | 'infinite'

/**
 * Delays the response by the given duration (ms).
 *
 * @example
 * await delay() // emulate realistic server response time
 * await delay(1200) // delay response by 1200ms
 * await delay('infinite') // delay response infinitely
 *
 * @see {@link https://mswjs.io/docs/api/delay `delay()` API reference}
 */
export async function delay(
  durationOrMode?: DelayMode | number,
): Promise<void> {
  return Promise.resolve()
}
