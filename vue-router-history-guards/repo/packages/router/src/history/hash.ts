import { RouterHistory } from './common'
import { createWebHistory } from './html5'

/**
 * Creates a hash history. Useful for web applications with no host (e.g. `file://`) or when configuring a server to
 * handle any URL is not possible.
 *
 * @param base - optional base to provide.
 */
export function createWebHashHistory(base?: string): RouterHistory {
  return createWebHistory(base)
}
